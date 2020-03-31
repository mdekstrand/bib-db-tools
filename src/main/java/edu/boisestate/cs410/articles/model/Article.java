package edu.boisestate.cs410.articles.model;

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
    private int id;
    private List<Author> authors = new ArrayList<>();
    private String title;
    private int pubYear;
    private String pubTitle;

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
}
