DROP DATABASE IF EXISTS hcibib;
CREATE DATABASE IF NOT EXISTS hcibib;
USE hcibib;

CREATE TABLE author (
  author_id INTEGER PRIMARY KEY AUTO_INCREMENT,
  author_name VARCHAR(255) NOT NULL
);
CREATE INDEX author_name_idx ON author (author_name);

CREATE TABLE conf_series (
  cs_id INTEGER PRIMARY KEY AUTO_INCREMENT,
  cs_hb_key VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE proceedings (
  proc_id         INTEGER PRIMARY KEY AUTO_INCREMENT,
  proc_title      VARCHAR(500) NOT NULL,
  proc_hb_key     VARCHAR(30) UNIQUE,
  cs_id           INTEGER      NOT NULL,
  proc_start_date DATE,
  proc_entry_count INTEGER DEFAULT 0,

  FOREIGN KEY (cs_id) REFERENCES conf_series (cs_id)
);

CREATE TABLE article (
  article_id     INTEGER PRIMARY KEY AUTO_INCREMENT,
  title          VARCHAR(1000) NOT NULL,
  abstract       TEXT,
  proc_id        INTEGER       NOT NULL,
  article_hb_key VARCHAR(50),

  FOREIGN KEY (proc_id) REFERENCES proceedings (proc_id),
  INDEX (article_hb_key)
);

CREATE TABLE article_author (
  article_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id, position),
  FOREIGN KEY (article_id) REFERENCES article (article_id),
  FOREIGN KEY (author_id) REFERENCES author (author_id)
);