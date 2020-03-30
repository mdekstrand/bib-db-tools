package edu.boisestate.cs410.articles.model;

import java.sql.Connection;
import java.sql.SQLException;

public class DBStats {
    private final int authorCount;

    DBStats(int ac) {
        authorCount = ac;
    }

    public static DBStats fetch(Connection cxn) throws SQLException {
        try (var stmt = cxn.createStatement()) {
            var cq = "SELECT COUNT(*) AS ac FROM article";
            try (var rs = stmt.executeQuery(cq)) {
                if (!rs.next()) throw new RuntimeException("statistics had no results");
                return new DBStats(rs.getInt("ac"));
            }
        }
    }

    public int getAuthorCount() {
        return authorCount;
    }
}
