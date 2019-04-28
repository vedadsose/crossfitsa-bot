require('dotenv').config()
const BootBot = require('bootbot')

const { fetchNextWOD, logInUser } = require('./crawler')

const bot = new BootBot({
  accessToken: process.env.ACCESS_TOKEN,
  verifyToken: process.env.FB_VERIFY_TOKEN,
  appSecret: process.env.FB_APP_SECRET
})

// Setup user account
bot.hear('setup', async (_, chat) => {
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
      convo.say('Authorized')
    } catch (error) {
      convo.say(error.toString())
    }
  }

  chat.conversation(convo => {
    askEmail(convo)
  })
})

// Find next WOD
bot.hear(['WOD', 'next'], async (_, chat) => {
  const wod = await fetchNextWOD()
  console.log({ wod })
  chat.say(wod)
})

bot.start(8000)
