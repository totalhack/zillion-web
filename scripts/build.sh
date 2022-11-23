#! /usr/bin/env bash

# Exit in case of error
set -e

TAG=${TAG-latest} \
FRONTEND_ENV=${FRONTEND_ENV-production} \
DOCKER_IMAGE_FRONTEND=${DOCKER_IMAGE_FRONTEND?Variable not set} \
DOCKER_IMAGE_BACKEND=${DOCKER_IMAGE_BACKEND?Variable not set} \
docker-compose \
-f ${1:-docker-compose.yml} \
build
