DROP TABLE IF EXISTS author CASCADE;
CREATE TABLE author (
  author_id SERIAL PRIMARY KEY,
  author_name VARCHAR(255) NOT NULL
);
CREATE INDEX author_name_idx ON author (author_name);

DROP TABLE IF EXISTS publication CASCADE;
CREATE TABLE publication (
  pub_id SERIAL PRIMARY KEY,
  pub_date DATE NOT NULL,
  pub_hb_key VARCHAR(30) UNIQUE NOT NULL
);

DROP TABLE IF EXISTS conf_series CASCADE;
CREATE TABLE conf_series (
  cs_id SERIAL PRIMARY KEY,
  cs_hb_key VARCHAR(30) NOT NULL UNIQUE
);

DROP TABLE IF EXISTS proceedings CASCADE;
CREATE TABLE proceedings (
  pub_id          INTEGER PRIMARY KEY,
  proc_title      VARCHAR(500) NOT NULL,
  proc_hb_key     VARCHAR(30) UNIQUE,
  cs_id           INTEGER      NOT NULL,
  proc_start_date DATE,
  proc_entry_count INTEGER DEFAULT 0,

  FOREIGN KEY (cs_id) REFERENCES conf_series (cs_id),
  FOREIGN KEY (pub_id) REFERENCES publication (pub_id)
);

DROP TABLE IF EXISTS journal CASCADE;
CREATE TABLE journal (
  journal_id SERIAL PRIMARY KEY,
  journal_hb_key VARCHAR(30) UNIQUE NOT NULL,
  journal_title VARCHAR(500) NOT NULL
);

DROP TABLE IF EXISTS issue CASCADE;
CREATE TABLE issue (
  pub_id INTEGER PRIMARY KEY,
  journal_id INTEGER NOT NULL,
  issue_vol VARCHAR(10),
  issue_num VARCHAR(10),
  issue_title VARCHAR(255),

  FOREIGN KEY (pub_id) REFERENCES publication (pub_id),
  FOREIGN KEY (journal_id) REFERENCES journal (journal_id)
);

DROP TABLE IF EXISTS article CASCADE;
CREATE TABLE article (
  article_id     SERIAL PRIMARY KEY,
  title          VARCHAR(1000) NOT NULL,
  abstract       TEXT,
  pub_id         INTEGER       NOT NULL,
  article_hb_key VARCHAR(50),

  FOREIGN KEY (pub_id) REFERENCES publication (pub_id)
);
CREATE INDEX article_hb_key_idx ON article (article_hb_key);

DROP TABLE IF EXISTS article_author CASCADE;
CREATE TABLE article_author (
  article_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id, position),
  FOREIGN KEY (article_id) REFERENCES article (article_id),
  FOREIGN KEY (author_id) REFERENCES author (author_id)
);

DROP VIEW IF EXISTS pub_title;
CREATE VIEW pub_title
AS SELECT pub_id,
  COALESCE(proc_title, issue_title,
           journal_title || ' vol. ' || issue_vol || ' no. ' || issue_num,
           journal_title || ' no. ' || issue_num,
           journal_title || ' vol. ' || issue_vol) AS pub_title
FROM publication
LEFT JOIN proceedings USING (pub_id)
LEFT JOIN issue USING (pub_id)
LEFT JOIN journal USING (journal_id);
