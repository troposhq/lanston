const { assert } = require('chai');
const Postgres = require('../lib');

const connectionString = 'postgres://root:supersecret@localhost:5432/tropos';
const createTables = `
create schema if not exists tropos;

set schema 'tropos';

create table if not exists users (
  id serial primary key,
  first_name text not null,
  last_name text
)
with (
    oids=false
);

create table if not exists emails (
  email text unique not null,
  user_id int not null references users
)
with (
    oids=false
);
`;

describe('Postgres', () => {
  before(async () => {
    Postgres.connect({ connectionString });
  });

  after(async () => {
    await Postgres.disconnect();
  });

  beforeEach(async () => {
    await Postgres.query(createTables);
  });

  afterEach(async () => {
    await Postgres.query('drop schema tropos cascade');
  });

  it('should connect to database', async () => {
    await Postgres.query('select now()');
  });

  describe('Model', () => {
    let Users;
    let Emails;

    beforeEach(async () => {
      Users = Postgres.model('users', 'tropos');
      Emails = Postgres.model('emails', 'tropos');
      await Users.insert({ first_name: 'alois', last_name: 'barreras' });
      await Users.insert({ first_name: 'alois', last_name: 'barreras' });
    });

    describe('#select', () => {
      it('should select rows from the table', async () => {
        const users = await Users.select();
        assert.equal(users.length, 2);
      });
    });

    describe('#selectOne', () => {
      it('should select one row from the table', async () => {
        const user = await Users.selectOne({ id: 1 });
        assert.equal(user.id, 1);
      });
    });

    describe('#update', () => {
      it('should udpate a row from the table', async () => {
        const user = await Users.update({ id: 1 }, { first_name: 'sam' }, { returning: '*' });
        assert.equal(user[0].id, 1);
        assert.equal(user[0].first_name, 'sam');
      });
    });

    describe('#delete', () => {
      it('should delete a row from the table', async () => {
        const result = await Users.delete({ id: 1 }, { returning: '*' });
        assert.equal(result.length, 1);
        assert.equal(result[0].id, 1);

        // check the user we deleted is gone
        const user1 = await Users.selectOne({ id: 1 });
        assert.isNull(user1);

        // check the other user is still there and not deleted
        const user2 = await Users.selectOne({ id: 2 });
        assert.equal(user2.id, 2);
      });
    });

    it('should perform a transaction successfully', async () => {
      await Users.delete();
      const { user, email } = await Postgres.transaction(async (transaction) => {
        const u = await Users.insert({ first_name: 'alois', last_name: 'barreras' }, { transaction }).then(rows => rows[0]);
        const e = await Emails.insert({ user_id: u.id, email: 'alois@troposhq.com' }, { transaction }).then(rows => rows[0]);
        return { user: u, email: e };
      });

      const actualUser = await Users.selectOne({ id: user.id });
      const actualEmail = await Emails.selectOne({ user_id: user.id });
      assert.deepEqual(actualUser, user);
      assert.deepEqual(actualEmail, email);
    });

    it('should rollback a transaction on failure', async () => {
      await Users.delete();
      await Postgres.transaction(async (transaction) => {
        const u = await Users.insert({ first_name: 'alois', last_name: 'barreras' }, { transaction }).then(rows => rows[0]);
        await Emails.insert({ user_id: u.id, email: 'alois@troposhq.com' }, { transaction }).then(rows => rows[0]);
        throw new Error();
      }).catch(() => { });

      const actualUser = await Users.selectOne();
      const actualEmail = await Emails.selectOne();
      assert.isNull(actualUser);
      assert.isNull(actualEmail);
    });
  });

  describe('#transaction', () => {
    it('should perform a transaction successfully', async () => {
      const { user, email } = await Postgres.transaction(async (transaction) => {
        const u = await transaction.query('insert into tropos.users (first_name, last_name) values ($1, $2) returning *', ['alois', 'barreras']).then(x => x.rows[0]);
        const e = await transaction.query('insert into tropos.emails (user_id, email) values ($1, $2) returning *', [u.id, 'alois@troposhq.com']).then(x => x.rows[0]);
        return { user: u, email: e };
      });

      const actualUser = await Postgres.query('select * from tropos.users where id = $1', [user.id]).then(x => x.rows[0]);
      const actualEmail = await Postgres.query('select * from tropos.emails where user_id = $1', [user.id]).then(x => x.rows[0]);
      assert.deepEqual(actualUser, user);
      assert.deepEqual(actualEmail, email);
    });

    it('should rollback a transaction on failure', async () => {
      await Postgres.transaction(async (transaction) => {
        const u = await transaction.query('insert into tropos.users (first_name, last_name) values ($1, $2) returning *', ['alois', 'barreras']).then(x => x.rows[0]);
        await transaction.query('insert into tropos.emails (user_id, email) values ($1, $2) returning *', [u.id, 'alois@troposhq.com']).then(x => x.rows[0]);
        throw new Error('Oops!');
      }).catch(() => { });

      const actualUsers = await Postgres.query('select * from tropos.users').then(x => x.rows);
      const actualEmails = await Postgres.query('select * from tropos.emails').then(x => x.rows);
      assert.equal(actualUsers.length, 0);
      assert.equal(actualEmails.length, 0);
    });
  });
});
