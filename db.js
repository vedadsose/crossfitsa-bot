const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ users: [] }).write()

module.exports = {
  createUser: body =>
    db
      .get('users')
      .push(body)
      .write(),
  findUser: id =>
    db
      .get('users')
      .find({ id })
      .value()
}
