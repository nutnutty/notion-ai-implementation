#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_LOG="/tmp/playground_dev_server.log"
TUNNEL_LOG="/tmp/playground_dev_tunnel.log"
SERVER_PID=""
TUNNEL_PID=""

cleanup() {
  if [[ -n "${TUNNEL_PID}" ]]; then
    kill "${TUNNEL_PID}" 2>/dev/null || true
  fi

  if [[ -n "${SERVER_PID}" ]]; then
    kill "${SERVER_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

cd "${ROOT_DIR}"

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies..."
  npm install
fi

if [[ ! -f dist/index.js ]] || [[ ! -f web/dist/component.js ]]; then
  echo "Building app..."
  npm run build
fi

echo "Starting MCP server..."
nohup node dist/index.js >"${SERVER_LOG}" 2>&1 &
SERVER_PID="$!"

for _ in {1..30}; do
  if curl -fsS http://localhost:8787/ >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS http://localhost:8787/ >/dev/null 2>&1; then
  echo "Server failed to start. Check ${SERVER_LOG}"
  exit 1
fi

: >"${TUNNEL_LOG}"
echo "Opening tunnel via localhost.run..."
nohup ssh -o ExitOnForwardFailure=yes -o StrictHostKeyChecking=no -o ServerAliveInterval=30 \
  -R 80:localhost:8787 nokey@localhost.run >"${TUNNEL_LOG}" 2>&1 &
TUNNEL_PID="$!"

TUNNEL_URL=""
for _ in {1..60}; do
  TUNNEL_URL="$(grep -Eo 'https://[a-zA-Z0-9.-]+\.lhr\.life' "${TUNNEL_LOG}" | tail -n 1 || true)"
  if [[ -n "${TUNNEL_URL}" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "${TUNNEL_URL}" ]]; then
  echo "Failed to obtain tunnel URL. Check ${TUNNEL_LOG}"
  exit 1
fi

if ! curl -fsS "${TUNNEL_URL}/" >/dev/null 2>&1; then
  echo "Tunnel URL is not reachable yet: ${TUNNEL_URL}"
  echo "Check ${TUNNEL_LOG}"
  exit 1
fi

echo
echo "Local health:  http://localhost:8787/"
echo "MCP URL:       ${TUNNEL_URL}/mcp"
echo
echo "Logs:"
echo "- ${SERVER_LOG}"
echo "- ${TUNNEL_LOG}"
echo
echo "Press Ctrl+C to stop server and tunnel."

wait "${TUNNEL_PID}"
