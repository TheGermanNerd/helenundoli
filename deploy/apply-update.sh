#!/usr/bin/env bash
# Make /var/www/helenundoli match the saved GitHub branch, then rebuild.
# Leaves ignored files in place, including .env.local, guest data, and photos.
#
# SSH (from update-ubuntu.sh, as helenundoli):
#   HELENUNDOLI_APPLY_ONLY=1 bash deploy/apply-update.sh
# The caller restarts services and reboots.
#
# Admin button: the website process sets HELENUNDOLI_SERVICE_PID to its own
# pid. After a successful build this script stops that pid. systemd starts it
# again because the unit has Restart=always.
set -eEuo pipefail

APP_USER="helenundoli"
APP_DIR="/var/www/helenundoli"
NPM_HOME="/var/cache/helenundoli-npm"

# Git refuses a checkout owned by another user. The service user owns this
# one. Drop root before copying the snapshot, or that copy is mode 700 and
# the service user cannot read it. SUDO_UID would make root trust the admin's
# files instead of helenundoli's, so it is cleared with the user switch.
if [[ "$(id -u)" -eq 0 ]]; then
  exec runuser -u "$APP_USER" -- env \
    -u SUDO_UID -u SUDO_GID -u SUDO_USER -u SUDO_COMMAND \
    HOME="$NPM_HOME" \
    npm_config_cache="$NPM_HOME" \
    HELENUNDOLI_APPLY_ONLY="${HELENUNDOLI_APPLY_ONLY:-}" \
    HELENUNDOLI_SERVICE_PID="${HELENUNDOLI_SERVICE_PID:-}" \
    bash "$0"
fi

# This file lives in the checkout `git reset` replaces. Run a snapshot from
# outside the checkout so the reset cannot change the script mid-run.
if [[ -z "${HELENUNDOLI_APPLY_SNAPSHOT:-}" ]]; then
  snapshot="$(mktemp)"
  cp -- "$0" "$snapshot"
  chmod 700 "$snapshot"
  export HELENUNDOLI_APPLY_SNAPSHOT=1
  exec bash "$snapshot"
fi

APP_DIR="/var/www/helenundoli"
NPM_HOME="/var/cache/helenundoli-npm"
BRANCH_FILE="$APP_DIR/data/deploy-branch"
STATUS_FILE="$APP_DIR/data/update-status.json"
LOG_FILE="$APP_DIR/data/update.log"
STARTED="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
BRANCH=""
STAGE=""

export GIT_TERMINAL_PROMPT=0
export HOME="$NPM_HOME"
export npm_config_cache="$NPM_HOME"

# Command-line config is protected, so this still counts when the checkout
# belongs to another user. Every git call in this script goes through here.
git() {
  command git -c "safe.directory=${APP_DIR}" "$@"
}

valid_branch() {
  local name="$1"
  [[ "$name" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$ ]] || return 1
  [[ "$name" != *".."* ]] || return 1
  [[ "$name" != *"//"* ]] || return 1
  [[ "$name" != *"@"* ]] || return 1
  [[ "$name" != */ ]] || return 1
  [[ "$name" != *.lock ]] || return 1
}

read_branch() {
  local saved="" current=""
  if [[ -f "$BRANCH_FILE" ]]; then
    IFS= read -r saved < "$BRANCH_FILE" || true
    saved="${saved%$'\r'}"
  fi
  if [[ -n "$saved" ]] && valid_branch "$saved"; then
    printf '%s' "$saved"
    return
  fi
  current="$(git -C "$APP_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  if [[ -n "$current" && "$current" != "HEAD" ]] && valid_branch "$current"; then
    printf '%s' "$current"
    return
  fi
  printf '%s' "main"
}

write_status() {
  local state="$1"
  local phase="$2"
  local message="$3"
  local commit="$4"
  local service_pid="${5:-}"
  python3 - "$STATUS_FILE" "$state" "$phase" "$message" "$commit" "$BRANCH" "$service_pid" "$$" "$STARTED" << 'PY'
import json
import os
import sys
from datetime import datetime, timezone

path, state, phase, message, commit, branch, service_pid, script_pid, started = sys.argv[1:10]
finished = state in {"error", "restarting", "done"}
payload = {
    "state": state,
    "phase": phase or None,
    "message": message,
    "commit": commit or None,
    "branch": branch or None,
    "pid": int(service_pid) if service_pid.isdigit() else None,
    "scriptPid": int(script_pid) if script_pid.isdigit() else None,
    "startedAt": started,
    "finishedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if finished else None,
}
os.makedirs(os.path.dirname(path), exist_ok=True)
temporary = path + ".tmp"
with open(temporary, "w", encoding="utf-8") as handle:
    json.dump(payload, handle, ensure_ascii=False)
    handle.write("\n")
os.replace(temporary, path)
PY
}

fail() {
  local message="$1"
  local detail=""
  trap - ERR
  mkdir -p "$APP_DIR/data"
  if [[ "$message" == "Die Aktualisierung ist fehlgeschlagen." && -f "$LOG_FILE" ]]; then
    detail="$(tail -n 6 "$LOG_FILE" | tr '\n' ' ' | tr -s ' ')"
    detail="${detail:0:280}"
    if [[ -n "${detail// /}" ]]; then
      message="${message} ${detail}"
    fi
  fi
  printf '%s\n' "$message" >>"$LOG_FILE"
  printf '%s\n' "$message" >&2
  if [[ -n "${STAGE:-}" ]]; then
    rm -rf "$STAGE" || true
  fi
  if [[ -z "${HELENUNDOLI_APPLY_ONLY:-}" ]]; then
    write_status error "" "$message" "" "" || true
  fi
  exit 1
}

update_busy() {
  python3 - "$STATUS_FILE" "$$" << 'PY'
import json
import os
import sys

path, self_pid = sys.argv[1], int(sys.argv[2])
try:
    with open(path, encoding="utf-8") as handle:
        data = json.load(handle)
except (OSError, json.JSONDecodeError):
    sys.exit(0)
pid = data.get("scriptPid")
if data.get("state") != "running" or not isinstance(pid, int) or pid == self_pid:
    sys.exit(0)
try:
    os.kill(pid, 0)
except ProcessLookupError:
    sys.exit(0)
except PermissionError:
    sys.exit(1)
else:
    sys.exit(1)
PY
}

logged() {
  "$@" >>"$LOG_FILE" 2>&1
}

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "No checkout at $APP_DIR." >&2
  exit 1
fi

mkdir -p "$APP_DIR/data"

if ! update_busy; then
  echo "An update is already running." >&2
  exit 1
fi

if [[ ! -d "$NPM_HOME" || ! -w "$NPM_HOME" ]]; then
  fail "Der npm-Cache ist nicht beschreibbar."
fi

BRANCH="$(read_branch)"
if ! valid_branch "$BRANCH"; then
  fail "Der Branch-Name ist ungültig."
fi

: >"$LOG_FILE"
printf 'Update %s branch %s\n' "$STARTED" "$BRANCH" >>"$LOG_FILE"

if [[ -z "${HELENUNDOLI_APPLY_ONLY:-}" ]]; then
  write_status running fetch "Änderungen werden von GitHub geholt…" "" ""
fi

trap 'fail "Die Aktualisierung ist fehlgeschlagen."' ERR

logged git -C "$APP_DIR" fetch --prune origin

remote_ref="refs/remotes/origin/${BRANCH}"
if ! git -C "$APP_DIR" rev-parse --verify --quiet "$remote_ref" >/dev/null 2>>"$LOG_FILE"; then
  fail "Der Branch „${BRANCH}“ existiert auf GitHub nicht."
fi

logged git -C "$APP_DIR" clean -fd
logged git -C "$APP_DIR" checkout -f -B "$BRANCH" "origin/${BRANCH}"
logged git -C "$APP_DIR" reset --hard "origin/${BRANCH}"
logged git -C "$APP_DIR" clean -fd
printf '%s\n' "$BRANCH" >"$BRANCH_FILE"

# Build beside the live checkout. Replacing .next or node_modules while
# `next start` is serving them crashes that process, and systemd then kills
# this script because it belongs to the same service.
mem_kb="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)"
swap_kb="$(awk '/SwapTotal:/ {print $2}' /proc/meminfo)"
if [[ "${swap_kb:-0}" -lt 1000000 && "${mem_kb:-0}" -lt 1500000 ]]; then
  fail "Zu wenig freier Speicher für den Build. Einmal per SSH ausführen: sudo bash /var/www/helenundoli/deploy/update-ubuntu.sh"
fi

if [[ -z "${HELENUNDOLI_APPLY_ONLY:-}" ]]; then
  write_status running install "Pakete werden installiert…" "" ""
fi

STAGE="$(mktemp -d "$APP_DIR/.update-stage.XXXXXX")"
{
  git -C "$APP_DIR" archive --format=tar HEAD | tar -C "$STAGE" -xf -
} >>"$LOG_FILE" 2>&1
rm -rf "$STAGE/data"
ln -s "$APP_DIR/data" "$STAGE/data"
if [[ -e "$APP_DIR/.env.local" ]]; then
  ln -s "$APP_DIR/.env.local" "$STAGE/.env.local"
fi
# The website service sets NODE_ENV=production. npm ci would then skip the
# devDependencies next build needs, so drop it for the install and the build.
logged env -u NODE_ENV HOME="$NPM_HOME" npm_config_cache="$NPM_HOME" npm --prefix "$STAGE" ci

if [[ -z "${HELENUNDOLI_APPLY_ONLY:-}" ]]; then
  write_status running build "Die Website wird gebaut…" "" ""
fi
logged env -u NODE_ENV HOME="$NPM_HOME" npm_config_cache="$NPM_HOME" npm --prefix "$STAGE" run build

replace_tree() {
  local name="$1"
  local backup="$APP_DIR/${name}.previous"
  rm -rf "$backup"
  if [[ -e "$APP_DIR/$name" ]]; then
    mv "$APP_DIR/$name" "$backup"
  fi
  mv "$STAGE/$name" "$APP_DIR/$name"
  rm -rf "$backup"
}
replace_tree node_modules
replace_tree .next
rm -rf "$STAGE"
STAGE=""

trap - ERR

if [[ -n "${HELENUNDOLI_APPLY_ONLY:-}" ]]; then
  echo "Updated $APP_DIR to origin/${BRANCH}."
  exit 0
fi

service_pid="${HELENUNDOLI_SERVICE_PID:-}"
if [[ ! "$service_pid" =~ ^[1-9][0-9]*$ ]] || [[ "$service_pid" -le 1 ]] || [[ "$service_pid" -eq "$$" ]]; then
  fail "Der Webprozess ist nicht bekannt."
fi

if [[ ! -r "/proc/${service_pid}/cmdline" ]]; then
  fail "Der Webprozess läuft nicht mehr."
fi
cmdline="$(tr '\0' ' ' < "/proc/${service_pid}/cmdline")"
if [[ "$cmdline" != *"next"* ]]; then
  fail "Der Webprozess läuft nicht mehr."
fi

commit="$(git -C "$APP_DIR" rev-parse --short=12 HEAD)"
write_status restarting restart "Die Website wird neu gestartet…" "$commit" "$service_pid"
if ! kill -TERM "$service_pid" >>"$LOG_FILE" 2>&1; then
  fail "Die Website konnte nicht neu gestartet werden."
fi
exit 0
