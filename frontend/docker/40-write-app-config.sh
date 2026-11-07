#!/bin/sh
# Writes the SPA's runtime config so one image works against any API origin.
set -eu

if [ -z "${API_BASE_URL:-}" ]; then
  echo "API_BASE_URL must be set (the API origin the browser calls, e.g. http://localhost:8080)" >&2
  exit 1
fi

# GOOGLE_CLIENT_ID is optional: without it the SPA does not offer "Continuar con Google".
printf '{\n  "apiBaseUrl": "%s",\n  "googleClientId": "%s"\n}\n' "$API_BASE_URL" "${GOOGLE_CLIENT_ID:-}" \
  > /usr/share/nginx/html/config.json
