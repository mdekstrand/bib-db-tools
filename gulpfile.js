const fs = require('fs-extra');
const Promise = require('bluebird');
const yargs = require('yargs');

const dbutil = require('./lib/dbutil');
const hcibib = require('./lib/hcibib');

const dataDir = 'data';
const args = yargs.argv;

module.exports.listBibFiles = async function listBibFiles() {
  let files = await hcibib.listBibFiles();
  for (let fn of files) {
    console.log('found file %s', fn);
  }
};
module.exports.download = async function download() {
  let mdr = await fs.ensureDir(dataDir);
  return hcibib.downloadFiles(dataDir);
};
module.exports.listConferences = hcibib.listConferences;

module.exports.importConferences = function importConferences() {
  var url = args.url;
  return Promise.using(dbutil.makePool(url), async (pool) => {
    let confs = await Promise.using(pool.acquire(),
      (db) => hcibib.importConferences('data/confer.bib', db));
    await hcibib.importConferenceArticles(confs, pool);
  });
};