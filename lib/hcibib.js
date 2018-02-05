// Code for accessing the HCIBib service
const fs = require('fs-extra');
const path = require('path');
const semaphore = require('semaphore');
const ProgressBar = require('progress');
const log = require('gulplog');
const request = require('request-promise');
const cheerio = require('cheerio');
const miss = require('mississippi');
const Promise = require('bluebird');

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