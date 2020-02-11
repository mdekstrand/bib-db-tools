DROP TABLE IF EXISTS author CASCADE;
CREATE TABLE author (
  author_id SERIAL PRIMARY KEY,
  author_name VARCHAR(255) NOT NULL
);
CREATE INDEX author_name_idx ON author (author_name);

DROP TABLE IF EXISTS conf_series CASCADE;
CREATE TABLE conf_series (
  cs_id SERIAL PRIMARY KEY,
  cs_hb_key VARCHAR(30) NOT NULL UNIQUE
);

DROP TABLE IF EXISTS proceedings CASCADE;
CREATE TABLE proceedings (
  proc_id         SERIAL PRIMARY KEY,
  proc_title      VARCHAR(500) NOT NULL,
  proc_hb_key     VARCHAR(30) UNIQUE,
  cs_id           INTEGER      NOT NULL REFERENCES conf_series (cs_id),
  proc_start_date DATE,
  proc_entry_count INTEGER DEFAULT 0
);
CREATE INDEX proceedings_hb_key_idx ON proceedings (proc_hb_key);
CREATE INDEX proceedings_cs_idx ON proceedings (cs_id);

DROP TABLE IF EXISTS article CASCADE;
CREATE TABLE article (
  article_id     SERIAL PRIMARY KEY,
  title          VARCHAR(1000) NOT NULL,
  abstract       TEXT,
  proc_id         INTEGER NOT NULL REFERENCES proceedings (proc_id),
  article_hb_key VARCHAR(50)
);
CREATE INDEX article_hb_key_idx ON article (article_hb_key);
CREATE INDEX article_proc_idx ON article (proc_id);

DROP TABLE IF EXISTS article_author CASCADE;
CREATE TABLE article_author (
  article_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id, author_id),
  FOREIGN KEY (article_id) REFERENCES article (article_id),
  FOREIGN KEY (author_id) REFERENCES author (author_id),
  UNIQUE (article_id, position)
);
