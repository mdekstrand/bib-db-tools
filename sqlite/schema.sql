-- Version: 2014-11-21-A

DROP TABLE IF EXISTS institution;
CREATE TABLE institution (
  inst_id INTEGER PRIMARY KEY,
  inst_name VARCHAR,
  inst_place VARCHAR);

DROP TABLE IF EXISTS author;
CREATE TABLE author (
  author_id INTEGER PRIMARY KEY,
  author_name VARCHAR,
  current_inst_id REFERENCES institution);

DROP TABLE IF EXISTS publication;
CREATE TABLE publication (
  pub_id INTEGER PRIMARY KEY,
  pub_title VARCHAR,
  pub_hb_key UNIQUE);

DROP TABLE IF EXISTS issue;
CREATE TABLE issue (
  issue_id INTEGER PRIMARY KEY,
  pub_id REFERENCES publication,
  iss_volume INTEGER,
  iss_number INTEGER,
  iss_date VARCHAR,
  iss_title VARCHAR,
  iss_hb_key UNIQUE);

DROP TABLE IF EXISTS article;
CREATE TABLE article (
  article_id INTEGER PRIMARY KEY,
  title VARCHAR,
  abstract TEXT,
  issue_id REFERENCES issue,
  article_hb_key UNIQUE);

DROP TABLE IF EXISTS article_author;
CREATE TABLE article_author (
  article_id REFERENCES article,
  author_id REFERENCES author,
  position INTEGER,
  inst_id REFERENCES institution,
  PRIMARY KEY (article_id, position));
