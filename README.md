# hcibi DB tools

This repository contains tools to use the [HCI Bibliography](http://hcibib.org) as a databases example.

## Prerequisites

- MySQL
- Node.js (tested with version 8.x LTS)

To install the Node packages in use, run:

    npm install

## Import Steps (MySQL)

1.  Download the data:

        npx gulp download

2.  Run the schema file to create the database:

        mysql <mysql/schema.sql

2.  Import the conference data:

        npx gulp importConferences --url=mysql://user:password@host:port/hcibib

    This takes about a half an hour.