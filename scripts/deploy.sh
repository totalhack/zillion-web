#! /usr/bin/env bash

# Exit in case of error
set -e

TARGET_MINUTE="${2:-}"

if [[ -n "$TARGET_MINUTE" ]]; then
	if [[ ! "$TARGET_MINUTE" =~ ^[0-9]{1,2}$ ]] || (( 10#$TARGET_MINUTE > 59 )); then
		echo "Invalid minute: $TARGET_MINUTE"
		exit 1
	fi

	current_minute=$(date +%M)
	current_minute=$((10#$current_minute))
	TARGET_MINUTE=$((10#$TARGET_MINUTE))
	minutes_to_wait=$(((TARGET_MINUTE - current_minute + 60) % 60))

	if (( minutes_to_wait > 0 )); then
		echo "Sleeping for $minutes_to_wait minute(s) until minute $TARGET_MINUTE..."
		sleep "$((minutes_to_wait * 60))"
	fi
fi

sh ./scripts/config.sh ${1:-docker-compose.yml} | node ./scripts/repair_compose.mjs | \
DOCKER_CONTEXT=${DOCKER_CONTEXT-zillion-web} \
docker stack deploy -c - --with-registry-auth "${STACK_NAME-zillion-web}"
