const url = require('url');
const Promise = require('bluebird');
const mysql = require('mysql');
const log = require('gulplog');

function parseUrl(dbUrl) {
  var info = new url.URL(dbUrl);
  log.debug('url: %s', JSON.stringify(info));
  var db = info.pathname ? info.pathname.replace(/^\//, '') : null;
  log.debug('host: %s', info.hostname);
  log.debug('port: %s', info.port);
  log.debug('user: %s', info.username);
  log.debug('database: %s', db);
  return {
    host: info.hostname,
    port: info.port,
    user: info.username,
    password: info.password,
    database: db
  };
}

module.exports.connect = function connect(dbUrl) {
  var cxn = mysql.createConnection(parseUrl(dbUrl));
  var promise = new Promise((resolve, reject) => {
    log.info('connecting to %s', dbUrl);
    cxn.connect((err) => {
      if (err) {
        reject(err);
      } else {
        resolve(cxn);
      }
    });
  });
  return promise.disposer((cxn, result) => {
    cxn.end();
  });
};

module.exports.makePool = function makePool(dbUrl) {
  var pool = mysql.createPool(parseUrl(dbUrl));

  pool.acquire = function() {
    var dbc;
    var promise = new Promise((ok, bad) => {
      this.getConnection((err, cxn) => {
        if (err) {
          bad(err);
        } else {
          dbc = cxn;
          ok(cxn);
        }
      });
    });
    return promise.disposer((dbc, res) => {
      dbc.release();
    });
  };
  
  return Promise.resolve(pool).disposer((p) => {
    p.end();
  });
};

module.exports.evalQuery =  function evalQuery(db, query, values) {
  return new Promise((ok, fail) => {
    db.query(query, values, (err, res) => {
      if (err) {
        fail(err);
      } else {
        ok(res);
      }
    });
  });
};