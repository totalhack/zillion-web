#! /usr/bin/env bash

# Exit in case of error
set -e

TAG=${TAG-latest} \
FRONTEND_ENV=${FRONTEND_ENV-production} \
DOCKER_IMAGE_FRONTEND=${DOCKER_IMAGE_FRONTEND-"totalhack/zillion-web-frontend"} \
DOCKER_IMAGE_BACKEND=${DOCKER_IMAGE_BACKEND-"totalhack/zillion-web-backend"} \
sh ./scripts/build.sh ${1:-docker-compose.yml}

DOCKER_IMAGE_FRONTEND=${DOCKER_IMAGE_FRONTEND-"totalhack/zillion-web-frontend"} \
DOCKER_IMAGE_BACKEND=${DOCKER_IMAGE_BACKEND-"totalhack/zillion-web-backend"} \
docker-compose -f ${1:-docker-compose.yml} push frontend backend
