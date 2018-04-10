const Promise = require('bluebird');
const log = require('gulplog');
const evalQuery = require('./dbutil').evalQuery;

async function getAuthorId(db, name) {
  let results = await evalQuery(db, 'SELECT author_id FROM author WHERE author_name = ?', [name]);
  if (results.length) {
    return results[0].author_id;
  } else {
    let ar = await evalQuery(db, 'INSERT INTO author (author_name) VALUES (?)', [name]);
    return ar.insertId;
  }
}

async function importArticle(db, pub_id, rec, field) {
  const evalQuery = Promise.promisify(db.query, {context: db});

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
  let ares = await evalQuery(db, `INSERT INTO article (${field}, article_hb_key, title, abstract) VALUES (?, ?, ?, ?)`, [pub_id, key, title, abstract]);
  let aid = ares.insertId;
  let authors = rec.A || [];
  log.debug('%s has %d authors', key, authors.length);
  await Promise.each(authors, async (auth, idx) => {
    let au_id = await getAuthorId(db, auth);
    await evalQuery(db, 'INSERT INTO article_author (article_id, author_id, position) VALUES (?,?,?)',
      [aid, au_id, idx]);
  });
}

module.exports.getAuthorId = getAuthorId;
module.exports.importArticle = importArticle;