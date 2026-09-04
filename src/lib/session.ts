// Purpose: Encrypt the manually supplied Partner API key in an HttpOnly session cookie.

import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import { cookies } from "next/headers"

const COOKIE_NAME = "swapgo_partner_console"
const SESSION_SECONDS = 60 * 60 * 8

function encryptionKey(): Buffer {
  const configured = process.env.PARTNER_CONSOLE_SESSION_SECRET?.trim()
  if (!configured || configured.length < 32) {
    throw new Error("PARTNER_CONSOLE_SESSION_SECRET must contain at least 32 characters.")
  }
  return createHash("sha256")
    .update(configured)
    .digest()
}

function sealApiKey(apiKey: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".")
}

function openApiKey(value: string): string | null {
  try {
    const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"))
    if (!iv || !tag || !encrypted) return null
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
  } catch {
    return null
  }
}

export async function readApiKey(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE_NAME)?.value
  if (value) return openApiKey(value)
  if (process.env.NODE_ENV !== "production") {
    return process.env.PARTNER_API_KEY?.trim() || null
  }
  return null
}

export async function writeApiKey(apiKey: string): Promise<void> {
  (await cookies()).set(COOKIE_NAME, sealApiKey(apiKey), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  })
}

export async function clearApiKey(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME)
}
