#!/bin/bash -e

publishNpm() {
  npm run ci-npm-publish
}

pushDocker() {
  # Push Docker image tagged latest and tagged with commit descriptor
  sed "s/<AUTH>/${DOCKER_TOKEN}/" < "dockercfg-template" > ~/.dockercfg
  docker tag interledgerjs/five-bells-notary:latest interledgerjs/five-bells-notary:"$(git describe)"
  docker push interledgerjs/five-bells-notary:latest
  docker push interledgerjs/five-bells-notary:"$(git describe)"
}

updateWebsite() {
  node scripts/publish_web.js
}

publishNpm
pushDocker
updateWebsite
