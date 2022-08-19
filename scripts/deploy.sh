#! /usr/bin/env bash

# Exit in case of error
set -e

sh ./scripts/config.sh ${1:-docker-compose.yml} | node ./scripts/repair_compose.mjs | \
DOCKER_CONTEXT=${DOCKER_CONTEXT-zillion-web} \
docker stack deploy -c - --with-registry-auth "${STACK_NAME-zillion-web}"
