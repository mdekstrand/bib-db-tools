package edu.boisestate.cs410.articles.model;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * Basic author information.
 */
public class Author {
    protected int id;
    protected String name;

    public static List<Author> fromResults(ResultSet rs) throws SQLException {
        List<Author> list = new ArrayList<>();
        while (rs.next()) {
            list.add(fromCurrentResult(rs));
        }
        return list;
    }

    public static Author fromId(Connection cxn, int id) throws SQLException {
        var q = "SELECT author_id, author_name FROM author WHERE author_id = ?";

        try (var stmt = cxn.prepareStatement(q)) {
            stmt.setInt(1, id);
            try (var rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return fromCurrentResult(rs);
                } else {
                    return null;
                }
            }
        }
    }

    public static Author fromCurrentResult(ResultSet rs) throws SQLException {
        Author au = new Author();
        au.setId(rs.getInt("author_id"));
        au.setName(rs.getString("author_name"));
        return au;
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setId(int id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }
}
