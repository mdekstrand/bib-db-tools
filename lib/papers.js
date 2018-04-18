const fs = require('fs-extra');
const Promise = require('bluebird');
const promiseLimit = require('promise-limit');
const miss = require('mississippi');
const Entities = require('html-entities').Html4Entities;
const entities = new Entities();
const begin = require('any-db-transaction');

const log = require('gulplog');

const bibParser = require('./bibparser');
const article = require('./article');
const dbutil = require('./dbutil');

function volumeKeys(vol) {
  let key = vol.M.first;
  let m = key.match(/^J\.[^.]*/);
  let jkey = m[0];
  if (jkey == 'J.JOC') {
    jkey = 'J.JOCEC'; // early JOCEC was called JOC
    if (key == 'J.JOC.3' && vol.J.first == 'JOC02') {
      key = 'J.JOC.2'; // Volume 2 of JOC is misnumbered
    }
  }
  return { volume_key: key, journal_key: jkey };
}

async function insertPublication(db, key, date) {
  const evalQuery = dbutil.evalQuery.bind(null, db);

  await evalQuery('INSERT INTO publication (pub_hb_key, pub_date) SELECT ?, ? WHERE NOT EXISTS (SELECT pub_id FROM publication WHERE pub_hb_key = ?)',
    [key, date, key]);
  let res = await evalQuery('SELECT pub_id FROM publication WHERE pub_hb_key = ?', [key]);  
  return res.rows[0].pub_id;
}

module.exports.importConferences = function(db) {
  const evalQuery = dbutil.evalQuery.bind(null, db);
  log.info('importing conferences');

  async function getConfID(key) {
    await evalQuery('INSERT into conf_series (cs_hb_key) SELECT ? WHERE NOT EXISTS (SELECT cs_id FROM conf_series WHERE cs_hb_key = ?)', [key, key]);
    let results = await evalQuery('SELECT cs_id FROM conf_series WHERE cs_hb_key = ?', [key]);
    return results.rows[0].cs_id;
  }

  async function importConf(rec) {
    let key = rec.M.first;
    log.debug('importing %s', key);
    let skey = rec.M.last;
    let sid = await getConfID(skey);
    let dates = rec.D.first.split(/\s+/);
    let sdate = bibParser.fixDate(dates[0]);
    let title = entities.decode(rec.B.last);
    let pid = await insertPublication(db, key, sdate);
    let existing = await evalQuery('SELECT pub_id FROM proceedings WHERE pub_id = ?', [pid]);
    if (!existing.rowCount) {
      await evalQuery('INSERT INTO proceedings (pub_id, cs_id, proc_title, proc_start_date) VALUES (?, ?, ?, ?)',
        [pid, sid, title, sdate]);
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

module.exports.importJournals = function(db) {
  const evalQuery = dbutil.evalQuery.bind(null, db);

  log.info('importing journals');

  async function importJournal(rec) {
    let key = rec.M.first;
    log.debug('importing journal %s', key);
    let title = rec.J.last;
    await evalQuery('INSERT INTO journal (journal_hb_key, journal_title) VALUES (?,?)', [key, title]);
    let idres = await evalQuery('SELECT journal_id FROM journal WHERE journal_hb_key = ?', [key])
    return {
      key: key,
      title: title,
      id: idres.rows[0].journal_id
    };
  }

  let journals = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream('data/journal.bib')
      .pipe(bibParser.parse())
      .pipe(miss.to.obj((rec, enc, cb) => {
        importJournal(rec).then((j) => {
          journals.push(j);
          cb();
        }).catch(cb);
      }, (done) => {
        log.info('imported %d journals', journals.length);
        process.nextTick(resolve, journals);
        done();
      }))
      .on('error', reject);
  });
};

module.exports.importJournalVolumes = function(db, journals) {
  const evalQuery = dbutil.evalQuery.bind(null, db);
  log.info('importing journal volumes');
  let jmap = {};
  for (let j of journals) {
    jmap[j.key] = j;
  }

  async function importVolume(rec) {
    let vks = volumeKeys(rec);
    let key = vks.volume_key;
    let jkey = vks.journal_key;
    log.debug('importing %s', key);
    let title = rec.J.last;
    let jnl = jmap[jkey];
    if (!jnl) {
      log.error('Cannot find journal %s (for volume %s)', title, key);
      return;
    }
    let volume = rec.V.first;
    let number = rec.N.first;
    let date = bibParser.fixDate(rec.D.first);
    let pid = await insertPublication(db, key, date);
    await evalQuery('INSERT INTO issue (pub_id, journal_id, issue_vol, issue_num, issue_title) VALUES (?, ?, ?, ?, ?)',
      [pid, jnl.id, volume, number, title]);
    return {
      key: key,
      id: pid,
      file: rec.J.first
    };
  }

  let volumes = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream('data/volumes.bib')
      .pipe(bibParser.parse())
      .pipe(miss.to.obj((rec, enc, cb) => {
        importVolume(rec).then((c) => {
          volumes.push(c);
          cb();
        }).catch(cb);
      }, (done) => {
        log.info('imported %d volumes', volumes.length);
        process.nextTick(resolve, volumes);
        done();
      }))
      .on('error', reject);
  });
};

module.exports.importArticles = function(pubs, pool) {
  let limit = promiseLimit(1);

  return limit.map(pubs, (pub) => {
    return Promise.using(pool.acquire(), (db) => new Promise((resolve, reject) => {
      let n = 0;
      log.debug('importing conference %s', pub.file);
      try {
        fs.accessSync(`data/${pub.file}.bib`);
      } catch (err) {
        log.error('cannot access data/%s.bib', pub.file);
        return resolve();
      }
      fs.createReadStream(`data/${pub.file}.bib`)
        .pipe(bibParser.parse())
        .pipe(miss.to.obj((rec, enc, cb) => {
          let tx = begin(db);
          article.importArticle(tx, pub.id, rec, 'pub_id')
            .then(() => new Promise((ok, bad) => tx.commit((err) => {
              if (err) bad(err); else ok();
            })))
            .then(() => {
              n += 1;
              cb();
            }, (err) => {
              log.error('error in file %s: %s', pub.file, err);
              tx.rollback();
              process.nextTick(cb, err);
            });
        }, (done) => {
          log.info('added %d records for %s', n, pub.file);
          process.nextTick(resolve, Object.assign({
            articleCount: n
          }, pub));
          done();
        }))
        .on('error', reject);
    }));
  });
};