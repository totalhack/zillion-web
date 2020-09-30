#! /usr/bin/env bash

set -e

docker-compose exec backend bash /app/tests-start.sh "$@"