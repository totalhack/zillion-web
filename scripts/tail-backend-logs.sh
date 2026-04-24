#! /usr/bin/env sh

# Exit in case of error
set -e

start_time="${2:-5m}"
awslogs get ${1:-backend} ALL --start="${start_time}" -w -S -G --timestamp
