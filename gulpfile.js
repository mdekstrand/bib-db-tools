const fs = require('fs-extra');

const hcibib = require('./lib/hcibib');

const dataDir = 'data';

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