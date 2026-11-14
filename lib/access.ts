import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ACCESS_COOKIE = "oli_helen_guest";

const TOKEN_PAYLOAD = "oli-helen-guest-v1";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function accessCode() {
  const value = process.env.SITE_ACCESS_CODE?.trim();
  return value ? value : null;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function accessToken() {
  const code = accessCode();
  if (!code) return null;
  return createHmac("sha256", normalize(code)).update(TOKEN_PAYLOAD).digest("base64url");
}

export function checkAccessCode(input: string) {
  const code = accessCode();
  if (!code) return "missing" as const;
  return safeEqual(normalize(input), normalize(code)) ? ("ok" as const) : ("invalid" as const);
}

export function accessCookie() {
  const token = accessToken();
  if (!token) return null;

  return {
    name: ACCESS_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export async function hasAccess() {
  const token = accessToken();
  if (!token) return false;
  const current = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!current) return false;
  return safeEqual(current, token);
}
