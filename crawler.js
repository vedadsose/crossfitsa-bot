const axios = require('axios')
const cheerio = require('cheerio')
const querystring = require('querystring')

const BASE_URL = 'https://crossfitsarajevo.com/box/'

const parseDate = date =>
  date
    .replace(/(\n|\t)/gm, '')
    .replace(/([a-zA-Z]+)(\d+)([a-zA-Z]+)/gm, '$1, $2. $3')

const createSession = async () => {
  const { headers } = await axios.get(BASE_URL)
  return headers['set-cookie'][0].match(/(PHPSESSID=.*);/m)[1]
}

module.exports.fetchNextWOD = async () => {
  const { data } = await axios.get(BASE_URL + 'home')
  const $ = cheerio.load(data)

  const date = parseDate($('.blogentry:first-of-type .blogdatebox').text())
  const wod = $('.blogentry:first-of-type pre').text()

  return date + '\n' + wod
}

module.exports.logInUser = async body => {
  const session = await createSession()

  const { data } = await axios({
    method: 'POST',
    url: BASE_URL + 'login',
    data: querystring.stringify({
      postback: 1,
      redirect: '/box/classbookings',
      ...body
    }),
    headers: {
      Cookie: session,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })

  if (data.match(/Invalid username or password/g)) {
    throw new Error('Invalid username or password')
  }
}
