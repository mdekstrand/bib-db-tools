package edu.boisestate.cs410.articles;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import picocli.CommandLine;
import spark.ModelAndView;
import spark.Request;
import spark.Response;
import spark.template.pebble.PebbleTemplateEngine;

import static spark.Spark.*;

import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

@CommandLine.Command(name="web")
public class ArticleWeb implements Runnable {
    private static Logger logger = LoggerFactory.getLogger(ArticleWeb.class);

    @CommandLine.ParentCommand
    private ArticleMain main;

    private static String render(Object model, String template) {
        return new PebbleTemplateEngine().render(new ModelAndView(model, template));
    }

    public String home(Request req, Response res) throws SQLException {
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

        return render(model, "home.html");
    }

    @Override
    public void run() {
        logger.info("setting up web app");
        get("/", this::home);
        logger.info("ready to go!");
    }
}
