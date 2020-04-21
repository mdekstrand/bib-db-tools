DROP TABLE IF EXISTS article_search;
CREATE TABLE article_search (
  article_id INTEGER PRIMARY KEY REFERENCES article ON DELETE CASCADE,
  article_vector TSVECTOR NOT NULL,
  up2date BOOLEAN NOT NULL
);

INSERT INTO article_search (article_id, article_vector, up2date)
  SELECT article_id,
    setweight(to_tsvector(title), 'A')
    || setweight(to_tsvector(coalesce(author_string, '')), 'A')
    || setweight(to_tsvector(coalesce(abstract, '')), 'B')
    || setweight(to_tsvector(coalesce(pub_title, '')), 'C'),
    TRUE
  FROM article
    JOIN pub_title USING (pub_id)
    LEFT OUTER JOIN (SELECT article_id,
                       string_agg(author_name, ' ') AS author_string
                     FROM article_author
                       JOIN author USING (author_id)
                     GROUP BY article_id) aasum
    USING (article_id);

CREATE INDEX article_search_idx
ON article_search USING gin (article_vector);
ANALYZE article_search;

-- LIVE UPDATE CODE
CREATE OR REPLACE FUNCTION dirty_article() RETURNS trigger AS $dirty_article$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- we need to dirty the new article
    UPDATE article_search SET up2date = FALSE WHERE article_id = NEW.article_id;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    -- we need to dirty the old article
    UPDATE article_search SET up2date = FALSE WHERE article_id = OLD.article_id;
  END IF;
  RETURN NULL;
END;
$dirty_article$ LANGUAGE plpgsql;

CREATE TRIGGER dirty_article
AFTER UPDATE
ON article
FOR EACH ROW EXECUTE PROCEDURE dirty_article();

CREATE TRIGGER dirty_article_for_author
AFTER UPDATE OR INSERT OR DELETE
ON article_author
FOR EACH ROW EXECUTE PROCEDURE dirty_article();

-- PERIODIC UPDATE

-- Delete out-of-date records
DELETE FROM article_search
WHERE NOT up2date;

-- Update article records
INSERT INTO article_search (article_id, article_vector, up2date)
SELECT article_id,
       setweight(to_tsvector(title), 'A')
    || setweight(to_tsvector(coalesce(author_string, '')), 'A')
    || setweight(to_tsvector(coalesce(abstract, '')), 'B')
    || setweight(to_tsvector(coalesce(pub_title, '')), 'C'),
        TRUE
FROM article a
  JOIN pub_info USING (pub_id)
  LEFT OUTER JOIN (SELECT article_id,
                     string_agg(author_name, ' ') AS author_string
                   FROM article_author
                     JOIN author USING (author_id)
                   GROUP BY article_id) aasum
  USING (article_id)
WHERE NOT EXISTS (SELECT * FROM article_search srch
                  WHERE article_id = a.article_id);

-- Analyze the search table
ANALYZE article_search;