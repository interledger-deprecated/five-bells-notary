#!/bin/bash

set -ex
set -o pipefail

NODE_INDEX="$1"
TOTAL_NODES="$2"

# Workaround for
# https://github.com/tgriesser/knex/commit/72c934a2d107f9ff7864b8b42bb843e31ad4e3bc
testKnex() {
  NOTARY_DB_URI="$1" node -e "require('./src/lib/knex'); process.exit()" | if grep -q "Error: Cannot find module";then exit 1;fi
}

lint() {
  npm run lint
}

integrationtest() {
  npm run integration
}

apidoc() {
  npm run apidoc
}

dockerBuild() {
  docker build -t interledger/five-bells-notary .
}

postgrestest() {
  local dbUri="postgres://ubuntu@localhost/circle_test"
  testKnex $dbUri
  psql -U ubuntu -c 'DROP DATABASE circle_test;'
  psql -U ubuntu -c 'CREATE DATABASE circle_test;'
  docker run --name=notary-test-postgres -it --net=host \
    -e NOTARY_UNIT_DB_URI=$dbUri \
    interledger/five-bells-notary npm test
}

sqlitetest() {
  local dbUri="sqlite://"
  testKnex $dbUri
  # Run tests with coverage (SQLite)
  NOTARY_UNIT_DB_URI=$dbUri \
  XUNIT_FILE=coverage/xunit.xml \
  npm test --coverage -- -R spec-xunit-file

  # Extract test results
  cp coverage/xunit.xml "${CIRCLE_TEST_REPORTS}/"

  # Upload coverage results
  npm run report-coverage
}

oneNode() {
  lint
  dockerBuild
  sqlitetestest
  integrationtest
  postgrestest
  apidoc
}

twoNodes() {
  case "$NODE_INDEX" in
    0) lint; dockerBuild; sqlitetest integrationtest;;
    1) dockerBuild; postgrestest; apidoc;;
    *) echo "ERROR: invalid usage"; exit 2;;
  esac
}

threeNodes() {
  case "$NODE_INDEX" in
    0) lint; dockerBuild; sqlitetest integrationtest;;
    1) dockerBuild; postgrestest;;
    2) dockerBuild; apidoc;;
    *) echo "ERROR: invalid usage"; exit 2;;
  esac
}

fourNodes() {
  case "$NODE_INDEX" in
    0) dockerBuild; sqlitetest; postgrestest;;
    1) integrationtest;;
    2) lint; dockerBuild;;
    3) apidoc;;
    *) echo "ERROR: invalid usage"; exit 2;;
  esac
}

case "$TOTAL_NODES" in
  "") oneNode;;
  1) oneNode;;
  2) twoNodes;;
  3) threeNodes;;
  4) fourNodes;;
  *) echo "ERROR: invalid usage"; exit 2;;
esac
