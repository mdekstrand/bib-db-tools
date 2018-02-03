CREATE DATABASE IF NOT EXISTS hcibib;
USE hcibib;
DROP TABLE IF EXISTS author CASCADE;
CREATE TABLE author (
  author_id INTEGER PRIMARY KEY AUTO_INCREMENT,
  author_name VARCHAR(255) NOT NULL
);

DROP TABLE IF EXISTS conf_series CASCADE;
CREATE TABLE conf_series (
  cs_id INTEGER PRIMARY KEY AUTO_INCREMENT,
  cs_hb_key VARCHAR(30) NOT NULL UNIQUE
);

DROP TABLE IF EXISTS proceedings CASCADE;
CREATE TABLE proceedings (
  proc_id         INTEGER PRIMARY KEY AUTO_INCREMENT,
  proc_title      VARCHAR(500) NOT NULL,
  proc_hb_key     VARCHAR(30) UNIQUE,
  cs_id           INTEGER      NOT NULL,
  proc_start_date DATE,
  proc_end_date   DATE,

  FOREIGN KEY (cs_id) REFERENCES conf_series (cs_id)
);
CREATE INDEX proc_cs_idx ON proceedings (cs_id);

DROP TABLE IF EXISTS article CASCADE;
CREATE TABLE article (
  article_id     INTEGER PRIMARY KEY AUTO_INCREMENT,
  title          VARCHAR(1000) NOT NULL,
  abstract       TEXT,
  proc_id        INTEGER       NOT NULL,
  article_hb_key VARCHAR(30) UNIQUE,

  FOREIGN KEY (proc_id) REFERENCES proceedings (proc_id)
);

DROP TABLE IF EXISTS article_author CASCADE;
CREATE TABLE article_author (
  article_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id, position),
  FOREIGN KEY (article_id) REFERENCES article (article_id),
  FOREIGN KEY (author_id) REFERENCES author (author_id)
);
CREATE INDEX article_author_article_idx ON article_author (article_id);
CREATE INDEX article_author_author_idx ON article_author (author_id);