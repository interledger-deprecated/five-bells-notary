#!/bin/bash -e

publishNpm() {
  npm run ci-npm-publish
}

pushDocker() {
  # Push Docker image tagged latest and tagged with commit descriptor
  sed "s/<AUTH>/${DOCKER_TOKEN}/" < "dockercfg-template" > ~/.dockercfg
  docker tag interledger/five-bells-notary:latest interledger/five-bells-notary:"$(git describe)"
  docker push interledger/five-bells-notary:latest
  docker push interledger/five-bells-notary:"$(git describe)"
}

updateWebsite() {
  node scripts/publish_web.js
}

publishNpm
pushDocker
updateWebsite
