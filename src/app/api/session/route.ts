// Purpose: Validate a manually entered Partner key and establish an encrypted session.

import { NextResponse } from "next/server"

import { PartnerApiError, partnerApiRequest } from "@/lib/partner-api"
import { clearApiKey, writeApiKey } from "@/lib/session"
import type { PartnerIdentity } from "@/lib/types"

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return true
  const expectedHost = request.headers.get("host") || request.headers.get("x-forwarded-host")
  try {
    return Boolean(expectedHost && new URL(origin).host === expectedHost)
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ detail: "Cross-origin session request rejected." }, { status: 403 })
  }
  const contentLength = Number(request.headers.get("content-length") || "0")
  if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > 4096) {
    return NextResponse.json({ detail: "Request body is too large." }, { status: 413 })
  }
  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).byteLength > 4096) {
    return NextResponse.json({ detail: "Request body is too large." }, { status: 413 })
  }
  const body = (() => {
    try {
      return JSON.parse(rawBody) as { apiKey?: unknown }
    } catch {
      return null
    }
  })()
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : ""
  if (!/^sgp_(?:test|live)_[0-9a-f]{12}\.[A-Za-z0-9_-]{32,128}$/.test(apiKey)) {
    return NextResponse.json({ detail: "Invalid Partner API key format." }, { status: 400 })
  }
  try {
    const { data } = await partnerApiRequest<PartnerIdentity>("/me", {}, apiKey)
    await writeApiKey(apiKey)
    return NextResponse.json({ identity: data }, { headers: { "cache-control": "private, no-store" } })
  } catch (error) {
    const status = error instanceof PartnerApiError ? error.status : 502
    return NextResponse.json({ detail: "The Partner API key could not be verified." }, { status })
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ detail: "Cross-origin session request rejected." }, { status: 403 })
  }
  await clearApiKey()
  return NextResponse.json({ ok: true })
}
