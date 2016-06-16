# Five Bells Notary [![npm][npm-image]][npm-url] [![circle][circle-image]][circle-url] [![codecov][codecov-image]][codecov-url]

[npm-image]: https://img.shields.io/npm/v/five-bells-notary.svg?style=flat
[npm-url]: https://npmjs.org/package/five-bells-connector
[circle-image]: https://circleci.com/gh/interledger/five-bells-notary.svg?style=shield
[circle-url]: https://circleci.com/gh/interledger/five-bells-notary
[codecov-image]: https://codecov.io/gh/interledger/five-bells-notary/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/interledger/five-bells-notary

> Server application that notarizes receipt of [crypto-condition fulfillments](https://github.com/interledger/five-bells-condition) by an expiry date

## What does this do?

A standard Interledger payment relies on connectors to relay transfer data within a time limit. This works fine in most cases, but when participants can agree on some trusted parties we can do better.

In order to decide whether to commit or rollback a transfer, the participants to a transfer may choose to use a witness. Using a witness, we can guarantee atomicity for the transfer, as long as the witness promises only to publish the commit or the rollback message, but not both.

Of course, now the transactional semantics depend on safety and liveness of the witness. In order to minimize the risk of failure, we use not a single witness, but a consensus group of witnesses. (Consensus feature is not implemented yet.)

## Usage

To run with sqlite,

```
NOTARY_DB_SYNC=1 NOTARY_DB_URI=sqlite://:memory: npm start
```

To run with postgres, create a database, then

```
NOTARY_DB_SYNC=1 NOTARY_UNIT_DB_URI=postgres://user:password@host:port/db_name npm start
```

To run with Oracle, first, install [Oracle Instant Client](http://www.oracle.com/technetwork/database/features/instant-client/index-097480.html), e.g, in /opt/oracle/instantclient. Then run an Oracle database in a docker container ([example](https://github.com/wnameless/docker-oracle-xe-11g)), and specify `NOTARY_DB_URI`:

```
NOTARY_DB_SYNC=1 NOTARY_DB_URI='oracle://user:password@docker-machine-ip:port/' DYLD_LIBRARY_PATH=/opt/oracle/instantclient LD_LIBRARY_PATH=/opt/oracle/instantclient npm start
```

`NOTARY_DB_SYNC` is a test setting that creates the database by running the SQL scripts in `./src/sql`. These scripts are not re-runnable. You must drop the database or set `NOTARY_DB_SYNC=0` after the initial run.
