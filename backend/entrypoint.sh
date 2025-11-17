#!/bin/bash

# Collect static files
python manage.py collectstatic --noinput

# Execute the command
exec "$@"

