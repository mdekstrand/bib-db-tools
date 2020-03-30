package edu.boisestate.cs410.articles;

import edu.boisestate.cs410.articles.model.AuthorSummary;
import edu.boisestate.cs410.articles.model.DBStats;
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

    public void topAuthors(Context ctx) throws SQLException {
        Map<String,Object> model = new HashMap<>();

        try (var db = main.openDatabase()) {
            model.put("authors", AuthorSummary.fetchTopPublished(db));
        }

        ctx.render("pebble/top-authors.peb", model);
    }

    public void home(Context ctx) throws SQLException {
        Map<String,Object> model = new HashMap<>();

        try (var db = main.openDatabase()) {
            model.put("stats", DBStats.fetch(db));
        }

        ctx.render("pebble/home.peb", model);
    }

    @Override
    public void run() {
        logger.info("setting up web app");
        var app = Javalin.create().start(4080);
        app.get("/", this::home);
        app.get("/authors/top", this::topAuthors);
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
