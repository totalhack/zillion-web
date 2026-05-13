#! /usr/bin/env bash

# Exit in case of error
set -e

docker-compose -f docker-compose.extdb.dev.yml down -v --remove-orphans
DEBUG=false docker-compose -f docker-compose.extdb.dev.yml up backend -d
docker-compose -f docker-compose.extdb.dev.yml exec backend bash /app/tests-start.sh "$@"