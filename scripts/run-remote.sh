#! /usr/bin/env bash
# Example:
# bhlrep ./scripts/run-remote.sh python /app/some_script.py

# Exit in case of error
set -e

DOCKER_CONTEXT=${DOCKER_CONTEXT?Variable not set} \
docker exec -it $(DOCKER_CONTEXT=${DOCKER_CONTEXT?Variable not set} docker ps -q -f name=zillion-web-prod_backend) "$@"

