#!/usr/bin/env bash
# First-time install for helenundoli.de on Ubuntu.
# Run on the server, after DNS for helenundoli.de and www.helenundoli.de
# points at this machine:
#   sudo bash deploy/install-ubuntu.sh
# A private GitHub repo needs a deploy key readable by the helenundoli user.
set -euo pipefail

DOMAIN="helenundoli.de"
WWW_DOMAIN="www.helenundoli.de"
APP_USER="helenundoli"
APP_DIR="/var/www/helenundoli"
REPO="https://github.com/TheGermanNerd/helenundoli.git"
ENV_FILE="$APP_DIR/.env.local"
NPM_HOME="/var/cache/helenundoli-npm"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/install-ubuntu.sh" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  git \
  nginx \
  certbot \
  python3-certbot-nginx \
  build-essential \
  python3 \
  ufw

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'Number(process.versions.node.split(".")[0])')" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
fi

install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR" "$NPM_HOME"

if [[ ! -d "$APP_DIR/.git" ]]; then
  if [[ -n "$(ls -A "$APP_DIR")" ]]; then
    echo "$APP_DIR is not empty and is not a git checkout." >&2
    exit 1
  fi
  runuser -u "$APP_USER" -- git clone "$REPO" "$APP_DIR"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Choose the three codes from .env.example. They are stored only in $ENV_FILE."
  read_secret() {
    local prompt="$1"
    local value=""
    while [[ -z "$value" ]]; do
      printf '%s' "$prompt" >/dev/tty
      IFS= read -r -s value </dev/tty
      printf '\n' >/dev/tty
      value="${value//$'\r'/}"
      if [[ -z "$value" ]]; then
        echo "Enter a value." >/dev/tty
      fi
    done
    printf '%s' "$value"
  }

  ADMIN_PASSWORD="$(read_secret "Admin password: ")"
  PHOTO_CODE="$(read_secret "Photo code: ")"
  SITE_ACCESS_CODE="$(read_secret "Site access code: ")"
  export ADMIN_PASSWORD PHOTO_CODE SITE_ACCESS_CODE
  python3 - "$ENV_FILE" << 'PY'
import os
import sys

path = sys.argv[1]

def encode(value: str) -> str:
    value = value.replace("\r", "").replace("\n", "").replace("\x00", "")
    if not value:
        raise SystemExit("Enter a value.")
    escaped = value.replace("$", "\\$")
    if '"' not in value and "\\" not in value:
        return '"' + escaped + '"'
    if "'" not in value:
        return "'" + escaped + "'"
    raise SystemExit("A value contains both ' and \". Choose a different one.")

keys = ("ADMIN_PASSWORD", "PHOTO_CODE", "SITE_ACCESS_CODE")
lines = [f"{key}={encode(os.environ[key])}" for key in keys]
with open(path, "w", encoding="utf-8") as handle:
    handle.write("\n".join(lines) + "\n")
os.chmod(path, 0o600)
PY
  unset ADMIN_PASSWORD PHOTO_CODE SITE_ACCESS_CODE
  chown "$APP_USER:$APP_USER" "$ENV_FILE"
else
  echo "Keeping the existing $ENV_FILE"
fi

install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR/data" "$APP_DIR/data/photos"

runuser -u "$APP_USER" -- env HOME="$NPM_HOME" npm_config_cache="$NPM_HOME" \
  bash -c "cd '$APP_DIR' && npm ci && npm run build"

cat > /etc/systemd/system/helenundoli.service << EOF
[Unit]
Description=Helen und Oli website
After=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/node $APP_DIR/node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable helenundoli
systemctl restart helenundoli
if ! systemctl is-active --quiet helenundoli; then
  journalctl -u helenundoli -n 40 --no-pager || true
  echo "The site did not stay running." >&2
  exit 1
fi

if [[ ! -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]]; then
  cat > /etc/nginx/sites-available/helenundoli << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN $WWW_DOMAIN;

    client_max_body_size 160m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
EOF
  ln -sfn /etc/nginx/sites-available/helenundoli /etc/nginx/sites-enabled/helenundoli
  nginx -t
  systemctl enable nginx
  systemctl reload nginx
else
  nginx -t
  systemctl enable nginx
  systemctl reload nginx
fi

if [[ ! -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]]; then
  normalize_ips() {
    python3 -c 'import ipaddress, sys
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        print(ipaddress.ip_address(line))
    except ValueError:
        pass'
  }

  MACHINE_IPS="$(
    {
      hostname -I || true
      ip -o addr show scope global | awk '{print $4}' | cut -d/ -f1 || true
      curl -4fsS --max-time 8 https://api.ipify.org || true
      echo
      curl -6fsS --max-time 8 https://api6.ipify.org || true
      echo
    } | tr ' ' '\n' | normalize_ips | sort -u
  )"

  check_domain() {
    local name="$1"
    local resolved ip
    resolved="$(getent ahosts "$name" | awk '{print $1}' | normalize_ips | sort -u || true)"
    if [[ -z "$resolved" ]]; then
      echo "$name does not resolve. Point its A or AAAA record at this server, then run this script again." >&2
      exit 1
    fi
    while read -r ip; do
      if printf '%s\n' "$MACHINE_IPS" | grep -qx "$ip"; then
        return 0
      fi
    done <<< "$resolved"
    echo "$name does not point at this server, so no certificate was requested." >&2
    echo "It resolves to:" >&2
    printf '%s\n' "$resolved" >&2
    echo "This server is reachable at:" >&2
    printf '%s\n' "$MACHINE_IPS" >&2
    exit 1
  }

  check_domain "$DOMAIN"
  check_domain "$WWW_DOMAIN"

  if [[ -n "${SSH_CONNECTION:-}" ]]; then
    ufw allow "${SSH_CONNECTION##* }/tcp"
  fi
  ufw allow OpenSSH
  ufw allow "Nginx Full"
  ufw --force enable

  read -r -p "Let's Encrypt email: " EMAIL </dev/tty
  if [[ "$EMAIL" != *"@"*"."* ]]; then
    echo "Enter an email address for the certificate account." >&2
    exit 1
  fi

  certbot --nginx \
    -d "$DOMAIN" \
    -d "$WWW_DOMAIN" \
    --redirect \
    --non-interactive \
    --agree-tos \
    -m "$EMAIL"
else
  echo "Certificate for $DOMAIN already exists. Certbot renewal stays on its timer."
fi

echo "Site is installed. https://$DOMAIN is served by nginx, and the app listens on 127.0.0.1:3000."
echo "Guest RSVPs and photos stay in $APP_DIR/data and are not part of the git checkout."
