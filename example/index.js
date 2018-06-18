const Postgres = require('../lib');
const Users = require('./users');

const connectionString = 'postgres://root:supersecret@localhost:5432/tropos';
Postgres.connect({ connectionString });

(async () => {
  await Users.insert({ first_name: 'alois', last_name: 'barreras', email: 'alois@troposhq.com', password_hash: 'supersecret' });
  await Users.selectOne().then(console.log);
  await Users.delete();
  await Postgres.disconnect();
})();
