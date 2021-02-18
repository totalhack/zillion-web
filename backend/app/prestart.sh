#!/usr/bin/env bash

if [ -n "${PRE_PRESTART_CMD+set}" ] && [ "${PRE_PRESTART_CMD}" != "" ] ; then
  echo "Running pre-prestart command: ${PRE_PRESTART_CMD}"
  eval "${PRE_PRESTART_CMD}"
else
  echo "No PRE_PRESTART_CMD defined"
fi

# Let the DB start
python /app/app/backend_pre_start.py

# Run migrations
alembic upgrade head

# Create initial data in DB
python /app/app/initial_data.py
