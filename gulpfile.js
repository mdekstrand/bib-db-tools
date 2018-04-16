const fs = require('fs-extra');
const Promise = require('bluebird');
const minimist = require('minimist');

const log = require('gulplog');

const dbutil = require('./lib/dbutil');
const hcibib = require('./lib/hcibib');
const confer = require('./lib/confer');
const papers = require('./lib/papers');

const dataDir = 'data';
const args = minimist(process.argv.slice(2));

module.exports.listBibFiles = async function listBibFiles() {
  let files = await hcibib.listBibFiles();
  for (let fn of files) {
    log.info('found file %s', fn);
  }
};
module.exports.download = async function download() {
  await fs.ensureDir(dataDir);
  return hcibib.downloadFiles(dataDir);
};
module.exports.listConferences = hcibib.listConferences;

module.exports.importConferenceData = function importConferences() {
  let url = args.url;
  return Promise.using(dbutil.makePool(url), async (pool) => {
    let confs = await Promise.using(pool.acquire(),
      (db) => confer.importConferences('data/confer.bib', db));
    await confer.importConferenceArticles(confs, pool);
  });
};

module.exports.importAllData = function importConferences() {
  let url = args.url;
  return Promise.using(dbutil.makePool(url), async (pool) => {
    let confP = Promise.using(pool.acquire(),
      (db) => papers.importConferences(db));
    let jvP = Promise.using(pool.acquire(),
      async (db) => {
        let jnls = await papers.importJournals(db);
        return papers.importJournalVolumes(db, jnls);
      });
    let [confs, volumes] = await Promise.all([confP, jvP]);
    await confer.importConferenceArticles(confs.concat(volumes), pool);
  });
};