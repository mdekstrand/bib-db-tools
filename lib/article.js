const Promise = require('bluebird');
const log = require('gulplog');
const Entities = require('html-entities').Html4Entities;
const entities = new Entities();

const evalQuery = require('./dbutil').evalQuery;

async function getAuthorId(db, name) {
  name = entities.decode(name);
  await evalQuery(db, 'INSERT INTO author (author_name) SELECT ? WHERE NOT EXISTS (SELECT * FROM author WHERE author_name = ?)', [name, name]);
  let results = await evalQuery(db, 'SELECT author_id FROM author WHERE author_name = ?', [name]);
  return results.rows[0].author_id;
}

async function importArticle(db, pub_id, rec, field) {
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

  let title = entities.decode(rec.T.first);
  let abstract = rec.X ? rec.X.first : null;
  if (abstract) {
    abstract = entities.decode(abstract);
  }
  log.debug('importing %s (%s)', key, title);
  await evalQuery(db, `INSERT INTO article (${field}, article_hb_key, title, abstract) VALUES (?, ?, ?, ?)`, [pub_id, key, title, abstract]);
  let idres = await evalQuery(db, 'SELECT MAX(article_id) AS id FROM article WHERE article_hb_key = ?', [key]);
  let aid = idres.rows[0].id;
  let authors = rec.A || [];
  log.debug('%s has %d authors', key, authors.length);
  await Promise.each(authors, async (auth, idx) => {
    let au_id = await getAuthorId(db, auth);
    try {
      await evalQuery(db, 'INSERT INTO article_author (article_id, author_id, position) VALUES (?,?,?)',
        [aid, au_id, idx]);
    } catch (e) {
      log.error('failed to insert author for %s (authors are %s)', key, JSON.stringify(authors));
      throw e;
    }
  });
}

module.exports.getAuthorId = getAuthorId;
module.exports.importArticle = importArticle;