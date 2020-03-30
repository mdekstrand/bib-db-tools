package edu.boisestate.cs410.articles;

import io.javalin.Javalin;
import io.javalin.http.Context;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import picocli.CommandLine;

import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

@CommandLine.Command(name="web")
public class ArticleWeb implements Runnable {
    private static Logger logger = LoggerFactory.getLogger(ArticleWeb.class);

    @CommandLine.ParentCommand
    private ArticleMain main;

    public void home(Context ctx) throws SQLException {
        Map<String,Object> model = new HashMap<>();
        Map<String,Object> stats = new HashMap<>();
        model.put("stats", stats);

        try (var db = main.openDatabase(); var stmt = db.createStatement()) {
            var cq = "SELECT COUNT(*) FROM article";
            try (var rs = stmt.executeQuery(cq)) {
                if (!rs.next()) throw new RuntimeException("statistics had no results");
                stats.put("articleCount", rs.getInt(1));
            }
        }

        ctx.render("pebble/home.peb", model);
    }

    @Override
    public void run() {
        logger.info("setting up web app");
        var app = Javalin.create().start(4080);
        app.get("/", this::home);
        logger.info("ready to go!");
        synchronized (this) {
            try {
                wait();
            } catch (InterruptedException e) {
                /* do nothing */
            }
        }
    }
}
