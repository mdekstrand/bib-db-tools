DROP DATABASE IF EXISTS hcibib2;
CREATE DATABASE hcibib2;
USE hcibib2;

CREATE TABLE author (
  author_id INTEGER PRIMARY KEY AUTO_INCREMENT,
  author_name VARCHAR(255) NOT NULL
) CHARACTER SET utf8;
CREATE INDEX author_name_idx ON author (author_name);

CREATE TABLE publication (
  pub_id INTEGER PRIMARY KEY AUTO_INCREMENT,
  pub_date DATE NOT NULL,
  pub_hb_key VARCHAR(30) UNIQUE NOT NULL
) CHARACTER SET utf8;

CREATE TABLE conf_series (
  cs_id INTEGER PRIMARY KEY AUTO_INCREMENT,
  cs_hb_key VARCHAR(30) NOT NULL UNIQUE
) CHARACTER SET utf8;

CREATE TABLE proceedings (
  pub_id          INTEGER PRIMARY KEY,
  proc_title      VARCHAR(500) NOT NULL,
  proc_hb_key     VARCHAR(30) UNIQUE,
  cs_id           INTEGER      NOT NULL,
  proc_start_date DATE,
  proc_entry_count INTEGER DEFAULT 0,

  FOREIGN KEY (cs_id) REFERENCES conf_series (cs_id),
  FOREIGN KEY (pub_id) REFERENCES publication (pub_id)
) CHARACTER SET utf8;

CREATE TABLE journal (
  journal_id INTEGER PRIMARY KEY AUTO_INCREMENT,
  journal_hb_key VARCHAR(30) UNIQUE NOT NULL,
  journal_title VARCHAR(500) NOT NULL
) CHARACTER SET utf8;

CREATE TABLE issue (
  pub_id INTEGER PRIMARY KEY,
  journal_id INTEGER NOT NULL,
  issue_vol VARCHAR(10),
  issue_num VARCHAR(10),
  issue_title VARCHAR(255),

  FOREIGN KEY (pub_id) REFERENCES publication (pub_id),
  FOREIGN KEY (journal_id) REFERENCES journal (journal_id)
) CHARACTER SET utf8;

CREATE TABLE article (
  article_id     INTEGER PRIMARY KEY AUTO_INCREMENT,
  title          VARCHAR(1000) NOT NULL,
  abstract       TEXT,
  pub_id         INTEGER       NOT NULL,
  article_hb_key VARCHAR(50),

  FOREIGN KEY (pub_id) REFERENCES publication (pub_id),
  INDEX (article_hb_key)
) CHARACTER SET utf8;

CREATE TABLE article_author (
  article_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id, position),
  FOREIGN KEY (article_id) REFERENCES article (article_id),
  FOREIGN KEY (author_id) REFERENCES author (author_id)
) CHARACTER SET utf8;