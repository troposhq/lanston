const knex = require('knex')({ client: 'pg' });

/**
 * @param {Object} options
 * @param {Object} options.schema
 * @param {Object} options.table
 * @param {Object} options.postgres
 */

function Model({ schema, table, postgres } = {}) {
  if (!(this instanceof Model)) return new Model();

  Object.assign(this, { schema, table, postgres });
}

Model.prototype.queryBuilder = function queryBuilder(returning) {
  const q = knex
    .withSchema(this.schema)
    .table(this.table);

  if (returning) return q.returning(returning);
  return q;
};

Model.prototype.query = function query(q, transaction) {
  if (transaction) return transaction.query(q);
  return this.postgres.query(q);
};

/**
 * Inserts a row
 *
 * @returns {Promise}
 */

Model.prototype.insert = async function insert(data, { returning = '*', transaction } = {}) {
  const q = this.queryBuilder(returning)
    .insert(data)
    .toString();

  const result = await this.query(q, transaction).then(x => x.rows);
  return result;
};

/**
 * Selects rows
 *
 * @returns {Promise}
 */

Model.prototype.select = async function select(where = {}, { select: s = '*', transaction } = {}) {
  const q = this.queryBuilder()
    .select(s)
    .where(where)
    .toString();

  const result = await this.query(q, transaction).then(x => x.rows);
  return result;
};

Model.prototype.selectOne = async function selectOne(where = {}, { select: s = '*', transaction } = {}) {
  const result = await this.select(where, { select: s, transaction }).then(x => x[0]);
  return result || null;
};

/**
 * Updates rows
 *
 * @returns {Promise}
 */

Model.prototype.update = async function update(where, data, { returning, transaction } = {}) {
  const q = this.queryBuilder(returning)
    .update(data)
    .where(where)
    .toString();

  const result = await this.query(q, transaction).then(x => x.rows);
  return result;
};

/**
 * Deletes rows
 *
 * @returns {Promise}
 */

Model.prototype.del = async function del(where = {}, { returning, transaction } = {}) {
  const q = this.queryBuilder(returning)
    .delete()
    .where(where)
    .toString();

  const result = await this.query(q, transaction).then(x => x.rows);
  return result;
};
Model.prototype.delete = Model.prototype.del;

module.exports = Model;
