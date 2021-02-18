#! /usr/bin/env bash

# COMPOSE_FILE=docker-compose.light.dev.yml ./scripts/run-local.sh python /app/scripts/add_warehouse.py <name> <config_url>

# Exit in case of error
set -e

if [[ -z "${COMPOSE_FILE}" ]]; then
  COMPOSE_FILE="docker-compose.yml"
else
  COMPOSE_FILE="${COMPOSE_FILE}"
fi

docker-compose -f $COMPOSE_FILE run --rm --entrypoint "$*" backend 
