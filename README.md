# hcibi DB tools

This repository contains tools to use the [HCI Bibliography](http://hcibib.org) as a databases example.

Import it as Maven project to use the example; the JavaScript things are for re-importing the data set from scratch.

## Main Example

Import `pom.xml` as a Maven project in your Java IDE of choice.

The `ArticleShell` script takes a single command-line argument (‘script parameter’), the MySQL URL.  It looks like this:

    mysql://user:password@host:port/hcibib

## Import Scripts

### Prerequisites

- MySQL
- Node.js (tested with version 8.x LTS)

To install the Node packages in use, run:

    npm install

### Import Steps (MySQL)

1.  Download the data:

        npx gulp download

2.  Run the schema file to create the database:

        mysql <mysql/schema.sql

2.  Import the conference data:

        npx gulp importConferences --url=mysql://user:password@host:port/hcibib

    This takes about a half an hour.