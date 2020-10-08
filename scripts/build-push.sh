#! /usr/bin/env sh

# Exit in case of error
set -e

TAG=${TAG-latest} \
FRONTEND_ENV=${FRONTEND_ENV-production} \
DOCKER_IMAGE_FRONTEND=${DOCKER_IMAGE_FRONTEND-"totalhack/zillion-web-frontend"} \
DOCKER_IMAGE_BACKEND=${DOCKER_IMAGE_BACKEND-"totalhack/zillion-web-backend"} \
sh ./scripts/build.sh

DOCKER_IMAGE_FRONTEND=${DOCKER_IMAGE_FRONTEND-"totalhack/zillion-web-frontend"} \
DOCKER_IMAGE_BACKEND=${DOCKER_IMAGE_BACKEND-"totalhack/zillion-web-backend"} \
docker-compose -f docker-compose.yml push frontend backend
