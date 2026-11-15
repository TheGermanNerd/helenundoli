#!/usr/bin/env bash
# Pull a newer commit, rebuild, and restart. Leaves .env.local and data/ in place.
#   sudo bash /var/www/helenundoli/deploy/update-ubuntu.sh
set -euo pipefail

APP_USER="helenundoli"
APP_DIR="/var/www/helenundoli"
NPM_HOME="/var/cache/helenundoli-npm"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash /var/www/helenundoli/deploy/update-ubuntu.sh" >&2
  exit 1
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "No checkout at $APP_DIR. Run deploy/install-ubuntu.sh first." >&2
  exit 1
fi

install -d -o "$APP_USER" -g "$APP_USER" "$NPM_HOME" "$APP_DIR/data" "$APP_DIR/data/photos"

runuser -u "$APP_USER" -- env HOME="$NPM_HOME" git -C "$APP_DIR" pull --ff-only
runuser -u "$APP_USER" -- env HOME="$NPM_HOME" npm_config_cache="$NPM_HOME" \
  bash -c "cd '$APP_DIR' && npm ci && npm run build"

install -m 644 "$APP_DIR/deploy/helenundoli.service" /etc/systemd/system/helenundoli.service
systemctl daemon-reload
systemctl enable helenundoli
systemctl enable nginx
systemctl restart helenundoli
systemctl restart nginx
if ! systemctl is-active --quiet helenundoli || ! systemctl is-active --quiet nginx; then
  journalctl -u helenundoli -n 40 --no-pager || true
  echo "The site did not stay running after the update." >&2
  exit 1
fi

echo "Updated. helenundoli and nginx will start automatically after a reboot."
echo "$APP_DIR/.env.local and $APP_DIR/data were left unchanged."
