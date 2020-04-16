package edu.boisestate.cs410.articles.model;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Class representing an article.
 */
public class Article {
    private static final Logger logger = LoggerFactory.getLogger(Article.class);
    private int id;
    private List<Author> authors = new ArrayList<>();
    private String title;
    private int pubYear;
    private String pubTitle;
    private String abs;

    /**
     * Look up an article by ID.
     * @param cxn The database connection.
     * @param id The article ID.
     * @return The article.
     * @throws SQLException
     */
    public static Article fromId(Connection cxn, int id) throws SQLException {
        var q = "SELECT article_id, title, pub_title, pub_year, abstract" +
                " FROM article JOIN pub_info USING (pub_id)" +
                " WHERE article_id = ?";

        var auq = "SELECT a.author_id, author_name" +
                " FROM article_author aa JOIN author a USING (author_id)" +
                " WHERE article_id = ?" +
                " ORDER BY position";

        Article a;

        try (var stmt = cxn.prepareStatement(q)) {
            stmt.setInt(1, id);
            try (var rs = stmt.executeQuery()) {
                if (rs.next()) {
                    a = fromCurrentResult(rs);
                    a.abs = rs.getString("abstract");
                } else {
                    return null;
                }
            }
        }

        try (var stmt = cxn.prepareStatement(auq)) {
            stmt.setInt(1, id);
            try (var rs = stmt.executeQuery()) {
                while (rs.next()) {
                    a.authors.add(Author.fromCurrentResult(rs));
                }
            }
        }

        return a;
    }

    /**
     * Get all articles by an author.
     */
    public static List<Article> fetchForAuthor(Connection cxn, int authorId) throws SQLException {
        // article query
        var aq = "SELECT article_id, a.title, abstract, pub_title, EXTRACT(YEAR FROM pub_date) AS pub_year" +
                " FROM article_author JOIN article a USING (article_id)" +
                " JOIN pub_title USING (pub_id)" +
                " JOIN publication USING (pub_id)" +
                " WHERE author_id = ?" +
                " ORDER BY pub_date DESC";

        // author query - get all authors of any of these articles
        var auq = "SELECT article_id, a.author_id, author_name" +
                " FROM article_author aa1 JOIN author a ON aa1.author_id = a.author_id" +
                " JOIN article_author aa2 USING (article_id)" +
                " WHERE aa2.author_id = ?" +
                " ORDER BY aa1.article_id, aa1.position";

        // we proceed in two passes: we fetch the articles, and then we populate their author lists.

        // articles in order
        List<Article> articles = new ArrayList<>();
        // to look up articles by ID
        Map<Integer, Article> amap = new HashMap<>();
        // pass 1: articles
        try (var stmt = cxn.prepareStatement(aq)) {
            stmt.setInt(1, authorId);
            try (var rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Article a = fromCurrentResult(rs);
                    articles.add(a);
                    amap.put(a.getId(), a);
                }
            }
        }

        // pass 2: authors
        try (var stmt = cxn.prepareStatement(auq)) {
            stmt.setInt(1, authorId);
            try (var rs = stmt.executeQuery()) {
                while (rs.next()) {
                    int aid = rs.getInt("article_id");
                    var a = amap.get(aid);
                    a.getAuthors().add(Author.fromCurrentResult(rs));
                }
            }
        }

        return articles;
    }

    /**
     * Get all articles by an author.
     */
    public static List<Article> search(Connection cxn, String query) throws SQLException {
        logger.info("searching for {}", query);
        // article query
        // we use WITH to only put the query in one place
        var aq = "SELECT article_id, title, abstract, pub_title, pub_year" +
                " FROM article" +
                " JOIN pub_info USING (pub_id)" +
                " JOIN article_search USING (article_id)," +
                " plainto_tsquery(?) q" +
                " WHERE article_vector @@ q" +
                " ORDER BY ts_rank(article_vector, q) DESC";

        // author query - get all authors of any of these articles
        var auq = "SELECT article_id, a.author_id, author_name" +
                " FROM article_author aa1 JOIN author a USING (author_id)" +
                " JOIN article_search USING (article_id)" +
                " WHERE article_vector @@ plainto_tsquery(?)" +
                " ORDER BY aa1.article_id, aa1.position";

        // we proceed in two passes: we fetch the articles, and then we populate their author lists.

        // articles in order
        List<Article> articles = new ArrayList<>();
        // to look up articles by ID
        Map<Integer, Article> amap = new HashMap<>();
        // pass 1: articles
        try (var stmt = cxn.prepareStatement(aq)) {
            stmt.setString(1, query);
            try (var rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Article a = fromCurrentResult(rs);
                    articles.add(a);
                    amap.put(a.getId(), a);
                }
            }
        }
        logger.info("found {} articles", articles.size());

        // pass 2: authors
        try (var stmt = cxn.prepareStatement(auq)) {
            stmt.setString(1, query);
            try (var rs = stmt.executeQuery()) {
                while (rs.next()) {
                    int aid = rs.getInt("article_id");
                    var a = amap.get(aid);
                    a.getAuthors().add(Author.fromCurrentResult(rs));
                }
            }
        }
        logger.info("finished reading authors");

        return articles;
    }

    /**
     * Get an article, with no authors, from the current result in a result set.
     */
    static Article fromCurrentResult(ResultSet rs) throws SQLException {
        Article a = new Article();
        a.setId(rs.getInt("article_id"));
        a.setTitle(rs.getString("title"));
        a.setPubTitle(rs.getString("pub_title"));
        a.setPubYear(rs.getInt("pub_year"));
        return a;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public List<Author> getAuthors() {
        return authors;
    }

    public void setAuthors(List<Author> authors) {
        this.authors = authors;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public int getPubYear() {
        return pubYear;
    }

    public void setPubYear(int pubYear) {
        this.pubYear = pubYear;
    }

    public String getPubTitle() {
        return pubTitle;
    }

    public void setPubTitle(String pubTitle) {
        this.pubTitle = pubTitle;
    }

    public String getAbstract() {
        return abs;
    }
}
