const url = require('url');
const Promise = require('bluebird');
const mysql = require('mysql');
const log = require('gulplog');

module.exports.connect = function connect(dbUrl) {
  var info = new url.URL(dbUrl);
  log.debug('url: %s', JSON.stringify(info));
  var db = info.pathname ? info.pathname.replace(/^\//, '') : null;
  var cxn = mysql.createConnection({
    host: info.hostname,
    port: info.port,
    user: info.username,
    password: info.password,
    database: db
  });
  log.debug('host: %s', info.hostname);
  log.debug('port: %s', info.port);
  log.debug('user: %s', info.username);
  log.debug('database: %s', db);
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