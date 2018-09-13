const url = require('url');
const Promise = require('bluebird');
const adb = require('any-db');
const log = require('gulplog');

module.exports.connect = function connect(dbUrl) {
  var promise = new Promise((ok, fail) => {
    log.info('connecting to %s', dbUrl);
    adb.createConnection(dbUrl, (err, cxn) => {
      if (err) fail(err);
      else ok(cxn);
    });
  });
  return promise.disposer((cxn, result) => {
    cxn.end();
  });
};

module.exports.makePool = function makePool(dbUrl) {
  var pool = adb.createPool(dbUrl);
  function acquire() {
    var promise = new Promise((ok, fail) => {
      pool.acquire((err, cxn) => {
        if (err) {
          fail(err);
        } else {
          ok(cxn);
        }
      });
    });
    return promise.disposer((dbc, res) => {
      pool.release(dbc);
    });
  }
  
  return Promise.resolve({_pool: pool, acquire: acquire}).disposer((p) => {
    pool.close();
  });
};

module.exports.evalQuery = function evalQuery(db, query, values) {
  if (db.adapter.name == 'postgres') {
    log.debug('rewriting query');
    let q2 = '';
    let pos = 0;
    let np;
    let i = 1;
    while ((np = query.indexOf('?', pos)) > 0) {
      q2 += query.slice(pos, np);
      q2 += '$' + i;
      i += 1;
      pos = np + 1;
    }
    if (pos < query.length) {
      q2 += query.slice(pos, query.length);
    }
    log.debug('rewrite %s', query);
    log.debug('result: %s', q2);
    query = q2;
  }
  return new Promise((ok, fail) => {
    db.query(query, values, (err, res) => {
      if (err) {
        log.error('error: %s', err);
        log.error('occurred in query: %s', query);
        log.error('on database: %s', Object.keys(db));
        fail(err);
      } else {
        ok(res);
      }
    });
  });
};