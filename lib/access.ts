import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ACCESS_COOKIE } from "@/lib/legal";
import { accessTimeoutMinutes } from "@/lib/site-settings";

export { ACCESS_COOKIE };

const TOKEN_PAYLOAD = "oli-helen-guest-v1";
const MAX_AGE_SECONDS = 60 * 60 * 24;
const CLOCK_SKEW_SECONDS = 60;

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

function signatureFor(issuedAt: number) {
  const code = accessCode();
  if (!code) return null;
  return createHmac("sha256", normalize(code)).update(`${TOKEN_PAYLOAD}.${issuedAt}`).digest("base64url");
}

export function checkAccessCode(input: string) {
  const code = accessCode();
  if (!code) return "missing" as const;
  return safeEqual(normalize(input), normalize(code)) ? ("ok" as const) : ("invalid" as const);
}

export function accessCookie() {
  const issuedAt = Math.floor(Date.now() / 1000);
  const signature = signatureFor(issuedAt);
  if (!signature) return null;

  return {
    name: ACCESS_COOKIE,
    value: `${issuedAt}.${signature}`,
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
  if (safeEqual(current, token)) return true;
  return withinTimeout(current);
}

function withinTimeout(current: string) {
  const dot = current.indexOf(".");
  if (dot <= 0) return false;
  const issuedRaw = current.slice(0, dot);
  const signature = current.slice(dot + 1);
  if (!/^[1-9]\d{0,15}$/.test(issuedRaw)) return false;
  const issuedAt = Number(issuedRaw);
  if (!Number.isSafeInteger(issuedAt)) return false;
  const expected = signatureFor(issuedAt);
  if (!expected || !safeEqual(signature, expected)) return false;
  const age = Math.floor(Date.now() / 1000) - issuedAt;
  if (age < -CLOCK_SKEW_SECONDS) return false;
  return age < accessTimeoutMinutes() * 60;
}
