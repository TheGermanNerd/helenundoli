#!/usr/bin/env bash
# Reset to the saved GitHub branch, rebuild, restart, and reboot the server.
# The branch is data/deploy-branch. Leaves .env.local and data/ in place.
#   sudo bash /var/www/helenundoli/deploy/update-ubuntu.sh
set -euo pipefail

# This file sits in the checkout `git pull` replaces. Bash keeps running the
# copy it opened, so a pull that changes this script would finish the old
# copy and skip the reboot. Run a snapshot from outside the checkout.
if [[ -z "${HELENUNDOLI_UPDATE_SNAPSHOT:-}" ]]; then
  snapshot="$(mktemp)"
  cp -- "$0" "$snapshot"
  chmod 700 "$snapshot"
  export HELENUNDOLI_UPDATE_SNAPSHOT=1
  exec bash "$snapshot"
fi

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
chown -R "$APP_USER:$APP_USER" "$APP_DIR" "$NPM_HOME"

# A 1 GB machine kills `npm ci` and `next build` unless swap can absorb them.
swap_kb="$(awk '/SwapTotal:/ {print $2}' /proc/meminfo)"
if [[ "${swap_kb:-0}" -lt 1000000 ]]; then
  if [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile || true
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Set this from outside the checkout. Git refuses the command when it is
# started inside a repository owned by someone else.
(
  cd /
  if ! git config --system --get-all safe.directory 2>/dev/null | grep -Fxq "$APP_DIR"; then
    git config --system --add safe.directory "$APP_DIR"
  fi
)

if [[ ! -f "$APP_DIR/deploy/apply-update.sh" ]]; then
  echo "Missing $APP_DIR/deploy/apply-update.sh" >&2
  exit 1
fi

runuser -u "$APP_USER" -- env \
  -u SUDO_UID -u SUDO_GID -u SUDO_USER -u SUDO_COMMAND \
  HOME="$NPM_HOME" \
  npm_config_cache="$NPM_HOME" \
  HELENUNDOLI_APPLY_ONLY=1 \
  bash "$APP_DIR/deploy/apply-update.sh"

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

echo "Updated. $APP_DIR/.env.local and $APP_DIR/data were left unchanged."
echo "Rebooting the server. helenundoli and nginx start automatically."
# `systemctl reboot` is tied to this SSH session. Logind cancels it when the
# session closes, and a shutdown inhibitor (apt, unattended-upgrades) can
# delay it until that happens. A system timer is outside the session.
trap '' HUP INT TERM
if ! systemd-run --quiet --collect \
  --on-active=2s --timer-property=AccuracySec=1s \
  /usr/bin/systemctl start --job-mode=replace-irreversibly reboot.target; then
  systemctl start --job-mode=replace-irreversibly reboot.target
fi
