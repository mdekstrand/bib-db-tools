// Code for accessing the HCIBib service
const fs = require('fs-extra');
const path = require('path');
const semaphore = require('semaphore');
const ProgressBar = require('progress');
const log = require('gulplog');
const request = require('request-promise');
const cheerio = require('cheerio');
const Promise = require('bluebird');

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
    let write = await fs.writeFile(out + '.tmp', contents);
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
        let _ = await takeSemaphore(limit);
        try {
            let res = await downloadFile(dir, f);
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