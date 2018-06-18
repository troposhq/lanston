const Postgres = require('../lib');

const Users = Postgres.model('users', 'tropos');

module.exports = Users;
