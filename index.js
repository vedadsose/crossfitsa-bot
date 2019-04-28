require('dotenv').config()
const BootBot = require('bootbot')

const { fetchNextWOD, fetchClasses, logInUser } = require('./crawler')
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

// Fetch next classes
bot.hear(['classes'], async (payload, chat) => {
  const user = db.findUser(payload.sender.id)
  let session

  try {
    session = await logInUser(user)
  } catch (error) {
    chat.say(error.toString())
  }

  const sessions = await fetchClasses(session)

  const message =
    `To book reply with "book NUMBER", or to unbook reply with "unbook NUMBER":\n\n` +
    Object.keys(sessions)
      .map(date => {
        return (
          date +
          '\n' +
          sessions[date]
            .map(({ sessionId, time }) => `${sessionId}) ${time}`)
            .join('\n')
        )
      })
      .join('\n\n')

  chat.say(message)
})

// Fetch next WOD
bot.hear(['WOD', 'next'], async (_, chat) => {
  const wod = await fetchNextWOD()
  chat.say(wod)
})

bot.start(8000)
