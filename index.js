require('dotenv').config()
const BootBot = require('bootbot')
const { groupBy, path } = require('ramda')

const {
  fetchNextWOD,
  fetchClasses,
  logInUser,
  bookClass,
  cancelClass
} = require('./crawler')
const db = require('./db')

const bot = new BootBot({
  accessToken: process.env.ACCESS_TOKEN,
  verifyToken: process.env.FB_VERIFY_TOKEN,
  appSecret: process.env.FB_APP_SECRET
})

// Setup user account
bot.hear('setup', async (payload, chat) => {
  const askEmail = convo => {
    convo.ask(`What's your account email?`, (payload, convo) => {
      const text = payload.message.text
      convo.set('email', text)
      askPassword(convo)
    })
  }

  const askPassword = async convo => {
    convo.ask(
      `What's your account password / member id?`,
      async (payload, convo) => {
        const text = payload.message.text
        convo.set('password', text)
        await setSignUp(convo)
        convo.end()
      }
    )
  }

  const setSignUp = async convo => {
    const email = convo.get('email')
    const password = convo.get('password')

    try {
      await logInUser({ email, password })

      db.createUser({ id: payload.sender.id, email, password })
      convo.say('Authorized')
    } catch (error) {
      convo.say(error.toString())
    }
  }

  chat.conversation(convo => {
    askEmail(convo)
  })
})

const getSession = async (id, chat) => {
  const user = db.findUser(id)

  try {
    return await logInUser(user)
  } catch (error) {
    chat.say(error.toString())
  }
}

// Fetch next classes
bot.hear(['classes'], async (payload, chat) => {
  const session = await getSession(payload.sender.id, chat)
  const sessions = groupBy(path(['date']))(await fetchClasses(session))

  const message =
    `To book reply with "book NUMBER", or to cancel reply with "cancel NUMBER":\n\n` +
    Object.keys(sessions)
      .map(date => {
        return (
          date +
          '\n' +
          sessions[date]
            .map(({ id, time, going }) => `${id}) ${time} ${going ? '✅' : ''}`)
            .join('\n')
        )
      })
      .join('\n\n')

  chat.say(message)
})

// Book a class
bot.hear(/book \d+/i, async (payload, chat) => {
  const { text } = payload.message
  const [_, sessionId] = text.split(' ')

  // Check if session exists
  const session = await getSession(payload.sender.id, chat)
  const sessions = await fetchClasses(session)
  const selectedSession = sessions.find(({ id }) => id === sessionId)

  if (!selectedSession) {
    chat.say(
      'Selected class does not exist. Write classes to get a list of them.'
    )
    return
  }

  try {
    await bookClass(session, sessions, sessionId)
    chat.say(
      `You are going to: ${selectedSession.date} ${selectedSession.time}`
    )
  } catch (error) {
    chat.say(`Something went wrong`)
  }
})

// Cancel a class
bot.hear(/cancel \d+/i, async (payload, chat) => {
  const { text } = payload.message
  const [_, sessionId] = text.split(' ')

  // Check if session exists
  const session = await getSession(payload.sender.id, chat)
  const sessions = await fetchClasses(session)
  const selectedSession = sessions.find(({ id }) => id === sessionId)

  if (!selectedSession) {
    chat.say(
      'Selected class does not exist. Write classes to get a list of them.'
    )
    return
  }

  try {
    await cancelClass(session, sessions, sessionId)
    chat.say(
      `You are not going to: ${selectedSession.date} ${selectedSession.time}`
    )
  } catch (error) {
    chat.say(`Something went wrong`)
  }
})

// Fetch next WOD
bot.hear(['WOD', 'next'], async (_, chat) => {
  const wod = await fetchNextWOD()
  chat.say(wod)
})

bot.start(8000)
