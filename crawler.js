const axios = require('axios')
const cheerio = require('cheerio')
const querystring = require('querystring')

const BASE_URL = 'https://crossfitsarajevo.com/'

const parseDate = date =>
  date
    .replace(/(\n|\t)/gm, '')
    .replace(/([a-zA-Z]+)(\d+)([a-zA-Z]+)/gm, '$1, $2. $3')

const createSession = async () => {
  const { headers } = await axios.get(BASE_URL + 'box')
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
    url: BASE_URL + 'box/login',
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

  return session
}

module.exports.fetchClasses = async session => {
  const { data } = await axios.get(BASE_URL + 'box/classbookings', {
    headers: { Cookie: session }
  })

  const $ = cheerio.load(data)
  const trs = $('table[align=center] tr')
  const emptyRow = '<td colspan="4" class="padding5"></td>'

  let sessions = {}

  trs.each(function(_, tr) {
    const date = $(this)
      .find('h3')
      .text()

    const headings = $(this).find('h4').length

    if (
      headings > 0 ||
      $(this)
        .html()
        .trim() === emptyRow
    ) {
      return
    }

    if (date) day = date
    else {
      const time = $(this)
        .find('.jockeyone')
        .text()

      if (!time) return

      const sessionId = $(this)
        .find('input[type=checkbox]')
        .val()

      const session = { time, sessionId }

      if (sessions[day]) {
        sessions[day].push(session)
      } else {
        sessions[day] = [session]
      }
    }
  })

  return sessions
}
