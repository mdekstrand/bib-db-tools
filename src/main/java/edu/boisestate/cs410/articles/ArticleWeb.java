package edu.boisestate.cs410.articles;

import edu.boisestate.cs410.articles.model.Article;
import edu.boisestate.cs410.articles.model.Author;
import edu.boisestate.cs410.articles.model.AuthorSummary;
import edu.boisestate.cs410.articles.model.DBStats;
import io.javalin.Javalin;
import io.javalin.http.Context;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import picocli.CommandLine;

import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

@CommandLine.Command(name="web")
public class ArticleWeb implements Runnable {
    private static Logger logger = LoggerFactory.getLogger(ArticleWeb.class);

    @CommandLine.ParentCommand
    private ArticleMain main;
    private DataSource dbSrc;

    public void topAuthors(Context ctx) throws SQLException {
        Map<String,Object> model = new HashMap<>();

        try (var db = dbSrc.getConnection()) {
            model.put("authors", AuthorSummary.fetchTopPublished(db));
        }

        ctx.render("pebble/top-authors.peb", model);
    }

    public void author(Context ctx) throws SQLException {
        Map<String,Object> model = new HashMap<>();
        int id = ctx.pathParam("au_id", Integer.class).get();

        try (var db = dbSrc.getConnection()) {
            model.put("author", Author.fromId(db, id));
            model.put("articles", Article.fetchForAuthor(db, id));
        }

        ctx.render("pebble/author.peb", model);
    }

    public void article(Context ctx) throws SQLException {
        Map<String,Object> model = new HashMap<>();
        int id = ctx.pathParam("aid", Integer.class).get();

        try (var db = dbSrc.getConnection()) {
            model.put("article", Article.fromId(db, id));
        }

        ctx.render("pebble/article.peb", model);
    }

    public void search(Context ctx) throws SQLException {
        Map<String,Object> model = new HashMap<>();
        String query = ctx.queryParam("q");

        try (var db = dbSrc.getConnection()) {
            model.put("query", query);
            var results = Article.search(db, query);
            model.put("articles", results);
        }

        ctx.render("pebble/search.peb", model);
    }

    public void home(Context ctx) throws SQLException {
        Map<String,Object> model = new HashMap<>();

        try (var db = dbSrc.getConnection()) {
            model.put("stats", DBStats.fetch(db));
        }

        ctx.render("pebble/home.peb", model);
    }

    @Override
    public void run() {
        logger.info("initializing connection pool");
        try (var pool = main.createDataSource()) {
            dbSrc = pool;
            logger.info("setting up web app");
            var app = Javalin.create().start(4080);
            app.get("/", this::home);
            app.get("/authors/top", this::topAuthors);
            app.get("/authors/:au_id", this::author);
            app.get("/articles/:aid", this::article);
            app.get("/search", this::search);
            logger.info("ready to go!");
            synchronized (this) {
                try {
                    wait();
                } catch (InterruptedException e) {
                    /* do nothing */
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException(e);
        } finally {
            dbSrc = null;
        }
    }
}
