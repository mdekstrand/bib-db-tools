package edu.boisestate.cs410.articles.model;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class AuthorSummary {
    private final int id;
    private final String name;
    private final int paperCount;

    public AuthorSummary(int id, String n, int pc) {
        this.id = id;
        name = n;
        paperCount = pc;
    }

    public static List<AuthorSummary> fetchTopPublished(Connection cxn) throws SQLException {
        var cq = "SELECT author_id, author_name, COUNT(article_id) AS article_count" +
                " FROM author JOIN article_author USING (author_id)" +
                " GROUP BY author_id ORDER BY article_count DESC LIMIT 100";
        try (var stmt = cxn.createStatement(); var rs = stmt.executeQuery(cq)) {
            return fromResults(rs);
        }
    }

    public static List<AuthorSummary> fromResults(ResultSet rs) throws SQLException {
        List<AuthorSummary> list = new ArrayList<>();
        while (rs.next()) {
            list.add(new AuthorSummary(rs.getInt("author_id"),
                    rs.getString("author_name"),
                    rs.getInt("article_count")));
        }
        return list;
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public int getPaperCount() {
        return paperCount;
    }
}
