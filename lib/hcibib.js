// Code for accessing the HCIBib service
const fs = require('fs-extra');
const util = require('util');
const path = require('path');
const extend = require('extend');
const semaphore = require('semaphore');
const ProgressBar = require('progress');
const log = require('gulplog');
const request = require('request-promise');
const cheerio = require('cheerio');
const miss = require('mississippi');
const Promise = require('bluebird');
const promiseLimit = require('promise-limit');

const bibParser = require('./bibparser');

const listUrl = 'http://hcibib.org/listdir.cgi';
const baseUrl = 'http://hcibib.org/bibdata/';

async function listBibFiles() {
  log.debug('retrieving %s', listUrl);
  let response = await request(listUrl);
  let $ = cheerio.load(response);
  let files = [];
  $('a').each(function() {
    let url = $(this).attr('href');
    let m = url.match(/^\/bibdata\/(.*\.bib)$/);
    if (m) {
      files.push(m[1]);
    }
  });
  return files;
}

async function downloadFile(dir, file) {
  let url = baseUrl + file;
  log.debug('downloading %s', url);
  let out = path.join(dir, file);
  let contents = await request(url);
  log.debug('writing %s', file);
  await fs.writeFile(out + '.tmp', contents);
  return fs.rename(out + '.tmp', out);
}

function takeSemaphore(sem) {
  return new Promise((resolve) => {
    sem.take(() => {
      resolve(true);
    });
  });
}

async function downloadFiles(dir) {
  let files = await listBibFiles();
  let pb = new ProgressBar('hcibib :bar :current/:total :percent', {
    total: files.length
  });
  let limit = semaphore(2);
  let results = files.map(async (f) => {
    let exists = await fs.access(path.join(dir, f)).then(() => true, () => false);
    if (exists) {
      log.debug('%s already exists', f);
      return Promise.resolve(false);
    }
    await takeSemaphore(limit);
    try {
      await downloadFile(dir, f);
    } finally {
      limit.leave();
    }
    pb.tick();
    return true;
  });
  return Promise.all(results);
}

module.exports.listBibFiles = listBibFiles;
module.exports.downloadFiles = downloadFiles;

module.exports.listConferences = function() {
  return fs.createReadStream('data/confer.bib')
    .pipe(bibParser.parse())
    .pipe(miss.to.obj((rec, enc, cb) => {
      log.info('%s: %s', rec.M.first, rec.B.last);
      cb();
    }));
};

module.exports.importConferences = function(cfile, db) {
  const evalQuery = Promise.promisify(db.query, {context: db});
  log.info('importing conferences');

  async function getConfID(key) {
    let results = await evalQuery('SELECT cs_id FROM conf_series WHERE cs_hb_key = ?', [key]);
    if (results.length) {
      return results[0].cs_id;
    } else {
      let ir = await evalQuery('INSERT INTO conf_series (cs_hb_key) VALUES (?)', [key]);
      return ir.insertId;
    }
  }

  async function importConf(rec) {
    let key = rec.M.first;
    log.debug('importing %s', key);
    let skey = rec.M.last;
    let sid = await getConfID(skey);
    let dates = rec.D.first.split(/\s+/);
    let sdate = bibParser.fixDate(dates[0]);
    let title = rec.B.last;
    let pr = await
      evalQuery('INSERT INTO proceedings (proc_hb_key, cs_id, proc_title, proc_start_date) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE proc_entry_count = proc_entry_count + 1',
        [key, sid, title, sdate]);
    let pid = pr.insertId;
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
  function evalQuery(db, query, values) {
    return new Promise((ok, fail) => {
      db.query(query, values, (err, res) => {
        if (err) {
          fail(err);
        } else {
          ok(res);
        }
      });
    });
  }

  async function getAuthorId(db, name) {
    let results = await evalQuery(db, 'SELECT author_id FROM author WHERE author_name = ?', [name]);
    if (results.length) {
      return results[0].author_id;
    } else {
      let ar = await evalQuery(db, 'INSERT INTO author (author_name) VALUES (?)', [name]);
      return ar.insertId;
    }
  }

  async function importArticle(db, cid, rec) {
    if (!rec.M) {
      log.error('article has no key, ooops!');
      log.info('article content: %s', JSON.stringify(rec));
      return;
    }
    let key = rec.M.first;
    if (!rec.T) {
      log.warn('%s has no title', key);
      return;
    }

    let title = rec.T.first;
    let abstract = rec.X ? rec.X.first : null;
    log.debug('importing %s (%s)', key, title);
    let ares = await evalQuery(db, 'INSERT INTO article (proc_id, article_hb_key, title, abstract) VALUES (?, ?, ?, ?)', [cid, key, title, abstract]);
    let aid = ares.insertId;
    let authors = rec.A || [];
    log.debug('%s has %d authors', key, authors.length);
    await Promise.each(authors, async (auth, idx) => {
      let au_id = await getAuthorId(db, auth);
      await evalQuery(db, 'INSERT INTO article_author (article_id, author_id, position) VALUES (?,?,?)',
        [aid, au_id, idx]);
    });
  }

  let limit = promiseLimit(4);

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
          db.beginTransaction((err) => {
            if (err) return cb(err);
            importArticle(db, conf.id, rec)
              .then(() => new Promise((ok, bad) => db.commit((err) => {
                if (err) bad(err); else ok();
              })))
              .then(() => {
                n += 1;
                cb();
              }).catch((err) => {
                log.error('error in file %s', conf.file);
                db.rollback(() => {
                  cb(err);
                });
              });
          });
        }, (done) => {
          log.info('imported %d articles from %s', n, conf.file);
          process.nextTick(resolve, extend({
            articleCount: n
          }, conf));
          done();
        }))
        .on('error', reject);
    }));
  });
};