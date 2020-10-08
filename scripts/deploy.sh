#! /usr/bin/env sh

# Exit in case of error
set -e

DOMAIN=${DOMAIN-zillionweb.totalhack.org} \
TRAEFIK_TAG=${TRAEFIK_TAG-zillion-web} \
STACK_NAME=${STACK_NAME-zillion-web} \
TAG=${TAG-latest} \
DOCKER_IMAGE_FRONTEND=${DOCKER_IMAGE_FRONTEND-"totalhack/zillion-web-frontend"} \
DOCKER_IMAGE_BACKEND=${DOCKER_IMAGE_BACKEND-"totalhack/zillion-web-backend"} \
docker-compose \
-f docker-compose.yml \
config | \
DOCKER_CONTEXT=${DOCKER_CONTEXT-zillion-web} \
docker stack deploy -c - --with-registry-auth "${STACK_NAME-zillion-web}"
