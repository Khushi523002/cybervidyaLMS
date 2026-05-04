import crypto from "node:crypto";

import { env } from "../config/env.js";

function base64url(input) {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

function sign(data) {
  return crypto.createHmac("sha256", env.authSecret).update(data).digest("base64url");
}

export function createToken(payload) {
  const header = base64url({ alg: "HS256", typ: "JWT" });
  const body = base64url({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 });
  return `${header}.${body}.${sign(`${header}.${body}`)}`;
}

export function verifyToken(token) {
  const [header, body, signature] = String(token || "").split(".");
  if (!header || !body || !signature) return null;
  const expected = sign(`${header}.${body}`);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (payload.exp && payload.exp < Date.now()) return null;
  return payload;
}
