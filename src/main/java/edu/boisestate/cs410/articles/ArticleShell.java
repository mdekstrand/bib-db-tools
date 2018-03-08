package edu.boisestate.cs410.articles;

import com.budhash.cliche.Command;
import com.budhash.cliche.ShellFactory;

import java.io.IOException;
import java.sql.*;

public class ArticleShell {
    private final Connection db;

    public ArticleShell(Connection cxn) {
        db = cxn;
    }

    @Command
    public void topAuthors() throws SQLException {
        String query = "SELECT author_id, author_name, COUNT(article_id) AS article_count" +
                " FROM author JOIN article_author USING (author_id)" +
                " GROUP BY author_id" +
                " ORDER BY article_count DESC LIMIT 10";
        System.out.println("Top Authors by Publication Count:");
        try (Statement stmt = db.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {
            while (rs.next()) {
                String name = rs.getString("author_name");
                int count = rs.getInt("article_count");
                System.out.format("  %s (with %d pubs)\n", name, count);
            }
        }
    }

    public static void main(String[] args) throws IOException, SQLException {
        String dbUrl = args[0];
        try (Connection cxn = DriverManager.getConnection("jdbc:" + dbUrl)) {
            ArticleShell shell = new ArticleShell(cxn);
            ShellFactory.createConsoleShell("article", "", shell)
                        .commandLoop();
        }
    }
}
