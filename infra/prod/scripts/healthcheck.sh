#!/usr/bin/env bash
set -euo pipefail

check() {
  local name="$1" url="$2"
  local code
  code=$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 8 "$url")
  if [[ "$code" != "200" ]]; then
    echo "healthcheck failed: $name returned $code" >&2
    return 1
  fi
  echo "healthcheck ok: $name"
}

check core-api http://127.0.0.1:4001/v1/ready
check www http://127.0.0.1:3011/
check learn http://127.0.0.1:3012/
# ERP root intentionally redirects when unauthenticated; login must render 200.
check erp http://127.0.0.1:3013/login
