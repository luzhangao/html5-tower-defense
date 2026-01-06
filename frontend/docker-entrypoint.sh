#!/bin/sh
set -e

if [ -n "$TD_API_BASE_URL" ]; then
  printf 'window.TD_API_BASE_URL = "%s";\n' "$TD_API_BASE_URL" > /usr/share/nginx/html/js/config.js
fi
