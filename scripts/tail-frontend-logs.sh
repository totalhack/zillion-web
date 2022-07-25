#! /usr/bin/env sh

# Exit in case of error
set -e

awslogs get ${1:-frontend} ALL --start='5m' -w -S -G
