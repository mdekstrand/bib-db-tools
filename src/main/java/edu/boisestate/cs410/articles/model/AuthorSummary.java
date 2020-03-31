package edu.boisestate.cs410.articles.model;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * An author with summary statistics.
 */
public class AuthorSummary extends Author {
    private int paperCount;

    public AuthorSummary() {
    }

    /**
     * Get the 100 most-published authors.
     */
    public static List<AuthorSummary> fetchTopPublished(Connection cxn) throws SQLException {
        var cq = "SELECT author_id, author_name, COUNT(article_id) AS article_count" +
                " FROM author JOIN article_author USING (author_id)" +
                " GROUP BY author_id ORDER BY article_count DESC LIMIT 100";
        try (var stmt = cxn.createStatement(); var rs = stmt.executeQuery(cq)) {
            return extFromResults(rs);
        }
    }

    /**
     * Get a list of author summaries from a result set, consuming it.
     */
    public static List<AuthorSummary> extFromResults(ResultSet rs) throws SQLException {
        List<AuthorSummary> list = new ArrayList<>();
        while (rs.next()) {
            AuthorSummary au = new AuthorSummary();
            au.setId(rs.getInt("author_id"));
            au.setName(rs.getString("author_name"));
            au.setPaperCount(rs.getInt("article_count"));
            list.add(au);
        }
        return list;
    }

    public int getPaperCount() {
        return paperCount;
    }

    public void setPaperCount(int paperCount) {
        this.paperCount = paperCount;
    }
}
