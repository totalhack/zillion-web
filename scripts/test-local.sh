#! /usr/bin/env bash

# Exit in case of error
set -e

docker-compose down --remove-orphans # Remove possibly previous broken stacks left hanging after an error
docker-compose build
docker-compose up -d
docker-compose exec -T backend bash /app/tests-start.sh "$@"
