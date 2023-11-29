const fs = require('fs-extra');
const Promise = require('bluebird');
const promiseLimit = require('promise-limit');
const miss = require('mississippi');
const Entities = require('html-entities').Html4Entities;
const entities = new Entities();
const begin = require('any-db-transaction');

const ProgressBar = require('progress');
const log = require('gulplog');

const bibParser = require('./bibparser');
const article = require('./article');
const dbutil = require('./dbutil');

function lastid(res, name) {
  if (res.rows.length == 0) {
    return res.lastInsertId;
  } else {
    return res.rows[0][name];
  }
}

module.exports.importConferences = function(cfile, db) {
  function evalQuery(query, values) {
    return dbutil.evalQuery(db, query, values);
  }
  log.info('importing conferences');

  async function getConfID(key) {
    let results = await evalQuery('SELECT cs_id FROM conf_series WHERE cs_hb_key = ?', [key]);
    if (results.rows.length) {
      return results.rows[0].cs_id;
    } else {
      let ir = await evalQuery('INSERT INTO conf_series (cs_hb_key) VALUES (?) RETURNING cs_id', [key]);
      return lastid(ir, 'cs_id');
    }
  }

  async function importConf(rec) {
    let key = rec.M.first;
    log.debug('importing %s', key);
    let skey = rec.M.last;
    let sid = await getConfID(skey);
    let dates = rec.D.first.split(/\s+/);
    let sdate = bibParser.fixDate(dates[0]);
    let title = entities.decode(rec.B.last);
    let exist = await evalQuery('SELECT proc_id FROM proceedings WHERE proc_hb_key = ?', [key]);
    let pid;
    if (exist.rows.length) {
      evalQuery('UPDATE proceedings SET proc_entry_count = proc_entry_count + 1 WHERE proc_hb_key = ?', [key]);
      pid = exist.rows[0].proc_id;
    } else {
      let pr = await
        evalQuery('INSERT INTO proceedings (proc_hb_key, cs_id, proc_title, proc_start_date) VALUES (?, ?, ?, ?) RETURNING proc_id',
          [key, sid, title, sdate]);
      pid = lastid(pr, 'proc_id');
    }
    return {
      key: key,
      id: pid,
      file: rec.B.first
    };
  }

  let conferences = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream('data/confer.bib')
      .pipe(bibParser.parse())
      .pipe(miss.to.obj((rec, enc, cb) => {
        importConf(rec).then((c) => {
          conferences.push(c);
          cb();
        }).catch(cb);
      }, (done) => {
        log.info('imported %d conferences', conferences.length);
        process.nextTick(resolve, conferences);
        done();
      }))
      .on('error', reject);
  });
};

module.exports.importConferenceArticles = function(conferences, pool) {
  let limit = promiseLimit(1);

  return limit.map(conferences, (conf) => {
    return Promise.using(pool.acquire(), (db) => new Promise((resolve, reject) => {
      let n = 0;
      log.debug('importing conference %s', conf.file);
      try {
        fs.accessSync(`data/${conf.file}.bib`);
      } catch (err) {
        log.error('cannot access data/%s.bib', conf.file);
        return resolve();
      }
      fs.createReadStream(`data/${conf.file}.bib`)
        .pipe(bibParser.parse())
        .pipe(miss.to.obj((rec, enc, cb) => {
          begin(db, (err, tx) => {
            if (err) return cb(err);
            article.importArticle(tx, conf.id, rec, 'proc_id')
              .then(() => new Promise((ok, bad) => tx.commit((err) => {
                if (err) bad(err); else ok();
              })))
              .then(() => {
                n += 1;
                cb();
              }).catch((err) => {
                log.error('error in file %s', conf.file);
                tx.rollback(() => {
                  cb(err);
                });
              });
          });
        }, (done) => {
          log.info('imported %d articles from %s', n, conf.file);
          process.nextTick(resolve, Object.assign({
            articleCount: n
          }, conf));
          done();
        }))
        .on('error', reject);
    }));
  });
};