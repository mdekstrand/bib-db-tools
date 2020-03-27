package edu.boisestate.cs410.articles;

import picocli.CommandLine;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

@CommandLine.Command(name="bib-db", subcommands={
        ArticleShell.class
})
public class ArticleMain implements Runnable {
    @CommandLine.Option(names="--db-url")
    public String dbUrl;

    /**
     * Open a database connection.
     * @return The database connection to open.
     * @throws SQLException If there is an error opening the connection.
     */
    public Connection openDatabase() throws SQLException {
        return DriverManager.getConnection("jdbc:" + dbUrl);
    }

    public void run() {
        System.err.println("running article shell");
    }

    public static void main(String[] args) {
        int exitCode = new CommandLine(new ArticleMain()).execute(args);
        System.exit(exitCode);
    }
}
