const { Pool } = require('pg');
const debug = require('debug')('@tropos/lanston:query-stats');
const knex = require('knex')({ client: 'pg' });
const Model = require('./model');

function Postgres(opts) {
  if (!(this instanceof Postgres)) return new Postgres(opts);
  this.knex = knex;
  this.pool = null;
}

Postgres.prototype.query = async function query(text, params, client = this.pool) {
  if (!this.pool) throw new Error('No connection pool found. Call postgres.connect before executing any queries.');

  const start = Date.now();
  const result = await client.query(text, params);
  const duration = Date.now() - start;
  debug('executed query', { text, duration, rows: result.rowCount });
  return result;
};

Postgres.prototype.transaction = async function transaction(fn) {
  if (!this.pool) throw new Error('No connection pool found. Call postgres.connect before executing any queries.');
  const client = await this.pool.connect();

  const rollback = async () => {
    await this.query('rollback', null, client);
  };

  try {
    await this.query('begin', null, client);
    const result = await fn({ query: (text, params) => this.query(text, params, client) }, rollback);
    await this.query('commit', null, client);
    return result;
  } catch (err) {
    await rollback();
    throw err;
  } finally {
    client.release();
  }
};

Postgres.prototype.connect = function connect(opts) {
  this.pool = new Pool(opts);
};

Postgres.prototype.createConnection = function createConnection(opts) {
  const postgres = new Postgres();
  postgres.connect(opts);
  return postgres;
};

Postgres.prototype.model = function model(table, schema = 'postgres') {
  return new Model({ table, schema, postgres: this });
};

Postgres.prototype.disconnect = async function disconnect() {
  await this.pool.end();
};

module.exports = new Postgres();
