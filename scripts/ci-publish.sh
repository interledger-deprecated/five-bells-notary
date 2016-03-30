#!/bin/bash -e

uploadCoverage() {
  # On parallel builds, only run coverage command on the container that ran the
  # SQLite tests with coverage
  if [ -d coverage ]; then
    # Extract test results
    cp coverage/xunit.xml "${CIRCLE_TEST_REPORTS}/"

    # Upload coverage data
    docker run --volumes-from notary-test-sqlite \
      -e COVERALLS_REPO_TOKEN="${COVERALLS_REPO_TOKEN}" \
      interledger/five-bells-notary npm run coveralls
  fi
}

npmPublish() {
  npm run ci-npm-publish
}

dockerPush() {
  # Push Docker image tagged latest and tagged with commit descriptor
  sed "s/<AUTH>/${DOCKER_TOKEN}/" < "dockercfg-template" > ~/.dockercfg
  docker tag interledger/five-bells-notary:latest interledger/five-bells-notary:"$(git describe)"
  docker push interledger/five-bells-notary:latest
  docker push interledger/five-bells-notary:"$(git describe)"
}

npmPublish
uploadCoverage
dockerPush

