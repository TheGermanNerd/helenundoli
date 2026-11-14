import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "oli_helen_admin";
export const PHOTO_COOKIE = "oli_helen_photos";

const TOKEN_PAYLOAD = "oli-helen-admin-v1";
const PHOTO_TOKEN_PAYLOAD = "oli-helen-photos-v1";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const PHOTO_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function adminPassword() {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value ? value : null;
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function adminToken() {
  const password = adminPassword();
  if (!password) return null;
  return createHmac("sha256", password).update(TOKEN_PAYLOAD).digest("base64url");
}

export function checkPassword(input: string) {
  const password = adminPassword();
  if (!password) return "missing" as const;
  return safeEqual(input, password) ? ("ok" as const) : ("invalid" as const);
}

export function sessionCookie() {
  const token = adminToken();
  if (!token) return null;

  return {
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export async function isAuthenticated() {
  const token = adminToken();
  if (!token) return false;
  const current = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!current) return false;
  return safeEqual(current, token);
}

function photoCode() {
  const value = process.env.PHOTO_CODE?.trim();
  return value ? value : null;
}

export function photoUploadReady() {
  return photoCode() !== null;
}

function photoToken() {
  const code = photoCode();
  if (!code) return null;
  return createHmac("sha256", code).update(PHOTO_TOKEN_PAYLOAD).digest("base64url");
}

export function checkPhotoCode(input: string) {
  const code = photoCode();
  if (!code) return "missing" as const;
  return safeEqual(input, code) ? ("ok" as const) : ("invalid" as const);
}

export function photoSessionCookie() {
  const token = photoToken();
  if (!token) return null;

  return {
    name: PHOTO_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PHOTO_MAX_AGE_SECONDS,
  };
}

export async function isPhotoUnlocked() {
  const token = photoToken();
  if (!token) return false;
  const current = (await cookies()).get(PHOTO_COOKIE)?.value;
  if (!current) return false;
  return safeEqual(current, token);
}
