# Overview

## What is lanston?
Lanston provides some methods for performing common operations in Postgres. The API is inspired by Mongoose and allows you to easily perform operations on tables (insert, select, update, delete) as well as performing transactions with multiple tables.

This library is **not** meant to be an ORM. Under the hood, this library uses [knex](https://github.com/tgriesser/knex) to construct SQL statements and uses the [pg package](https://github.com/brianc/node-postgres)
for connection pooling and performing queries. This provides just enough abstraction on top of those libraries to save writing repetitive code, but still leaves managing the underlying database structure to you.

# Quickstart

## Installing lanston
`npm install --save @tropos/lanston`

## Connecting to Postgres
Call `Postgres.connect` to create a global connection. This will create a connection pool where you can check out clients and perform queries.

```javascript
const Postgres = require('@tropos/lanston');
const connectionString = 'postgresql://dbuser:secretpassword@database.server.com:5432/mydb';
Postgres.connect({ connectionString });
```

## Querying
Call `Postgres.query` to automatically check out a client and perform a query.
```javascript
await Postgres.query('select now()');
```

## Transactions
Call `Postgres.transaction` to start a transaction. `.transaction()` takes a function that has 1 argument as its parameter. The argument to the function will be a Postgres client you can use to perform all the queries in the transaction. Your queries are automatically inside 'begin' and 'commit' calls and the client will automatically be released back into the connection pool when the function exits.
```javascript
await Postgres.transaction(async (transaction) => {
  // use the transaction parameter to perform all your queries
  await transaction.query('insert into tropos.users (first_name, last_name) values ($1)', ['alois', 'barreras']);
});
```

### Rolling back transactions
Any uncaught error or exception from within the transaction will automatically cause it to rollback.

```javascript
await Postgres.transaction(async (transaction) => {
  await transaction.query('insert into tropos.users (first_name, last_name) values ($1)', ['alois', 'barreras']);
  throw new Error('Oops!');
});

// returns nothing because the above transaction rolls back
await Postgres.query('select * from tropos.users where id = 1');
```

## Models
You can create a "model" using `Postgres.model`. A Model is just a representation of an underlying table in the database that provides some conveniences methods for interacting with it.
```javascript
const Users = Postgres.model('users', 'tropos');

await Users.insert(data, opts);
await Users.select(where, opts);
await Users.selectOne(where, opts);
await Users.update(where, data, opts);
await Users.delete(where, opts);
```

### Using Models with transactions
All of the model methods accept an options object with an optional `transaction` property. Set that property to be a transaction object you receive from `Postgres.transaction`, and the Model will use the transaction for that query.

```javascript
const Users = Postgres.model('users', 'tropos');
const Emails = Postgres.model('emails', 'tropos');

await Postgres.transaction(async (transaction) => {
  const user = await Users.insert(data, { transaction, returning: '*' }).then(x => x.rows[0]);
  await Emails.insert({ user_id: user.id, { transaction });
});
```

## Contributing

Pull requests and stars are always welcome. For bugs and feature requests, [please create an issue](../../issues/new).


## License

Copyright © 2018, [Alois Barreras](https://github.com/aloisbarreras).
MIT
