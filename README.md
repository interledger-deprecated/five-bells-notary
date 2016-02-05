# Five Bells Notary
> Consensus-capable Byzantine fault tolerant cryptographic notary

## What does this do?

A standard Interledger payment relies on connectors to relay transfer data within a time limit. This works fine in most cases, but when participants can agree on some trusted parties we can do better.

In order to decide whether to commit or rollback a transfer, the participants to a transfer may choose to use a witness. Using a witness, we can guarantee atomicity for the transfer, as long as the witness promises only to publish the commit or the rollback message, but not both.

Of course, now the transactional semantics depend on safety and liveness of the witness. In order to minimize the risk of failure, we use not a single witness, but a consensus group of witnesses.

## Usage

To run with sqlite,

```
npm install
npm install sqlite3
npm start
```

To run with Oracle, first, install Oracle Instant Client, e.g, in /opt/oracle/instantclient.

```
npm install
npm install strong-oracle
NOTARY_DB_ENV=oracledev DYLD_LIBRARY_PATH='/opt/oracle/instantclient' npm start
```

To create database tables before running, set environment variable NOTARY_RUN_MIGRATION on ```npm start```.
