package edu.boisestate.cs410.articles;

import org.apache.commons.dbcp2.DriverManagerConnectionFactory;
import org.apache.commons.dbcp2.PoolableConnection;
import org.apache.commons.dbcp2.PoolableConnectionFactory;
import org.apache.commons.dbcp2.PoolingDataSource;
import org.apache.commons.pool2.impl.GenericObjectPool;
import picocli.CommandLine;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

@CommandLine.Command(name="bib-db", subcommands={
        ArticleShell.class,
        ArticleWeb.class
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

    /**
     * Create a data source for data connections.
     * @return The data source.
     */
    public PoolingDataSource<PoolableConnection> createDataSource() {
        // there are many pooling implementations
        // here we will use Apache Commons DBCP2
        // this is adapted from their PoolingDataSource example
        var cxnFac = new DriverManagerConnectionFactory("jdbc:" + dbUrl, null);
        var pcFac = new PoolableConnectionFactory(cxnFac, null);
        var pool = new GenericObjectPool<>(pcFac);
        pcFac.setPool(pool);
        return new PoolingDataSource<>(pool);

        // PostgreSQL also has a pooling data source built in
        // In larger applications, your application server (Tomcat, JBoss, etc.) will handle
        // configuring the data source for you.
    }

    public void run() {
        System.err.println("running article shell");
    }

    public static void main(String[] args) {
        int exitCode = new CommandLine(new ArticleMain()).execute(args);
        System.exit(exitCode);
    }
}
