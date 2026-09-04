// Purpose: The only server-side transport from Partner Console to SwapGo.me Partner API.

import "server-only"

import { readApiKey } from "@/lib/session"

export class PartnerApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly responseBody: unknown = null,
    public readonly retryAfter: string | null = null,
    public readonly requestId: string | null = null,
  ) {
    super(detail)
  }
}

function partnerApiOrigin(): string {
  const configured = process.env.PARTNER_API_ORIGIN?.trim()
  if (!configured) {
    throw new PartnerApiError(503, "PARTNER_API_ORIGIN is not configured.")
  }

  let parsed: URL
  try {
    parsed = new URL(configured)
  } catch {
    throw new PartnerApiError(503, "PARTNER_API_ORIGIN is invalid.")
  }
  if (
    !["http:", "https:"].includes(parsed.protocol)
    || parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash
    || !parsed.pathname.replace(/\/$/, "").endsWith("/partner")
  ) {
    throw new PartnerApiError(503, "PARTNER_API_ORIGIN must be an HTTP(S) Partner API base URL.")
  }
  return parsed.toString().replace(/\/$/, "")
}

function messageFrom(value: unknown): string | null {
  if (typeof value === "string") {
    const message = value.trim()
    return message || null
  }
  if (!value || typeof value !== "object") return null
  const candidate = value as { message?: unknown; detail?: unknown }
  return messageFrom(candidate.message) || messageFrom(candidate.detail)
}

function errorDetail(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const candidate = body as { detail?: unknown; error?: unknown }
    const message = messageFrom(candidate.error) || messageFrom(candidate.detail)
    if (message) return message
  }
  return `Partner API request failed with status ${status}.`
}

function bodyRequestId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null
  const error = (body as { error?: unknown }).error
  if (!error || typeof error !== "object") return null
  const requestId = (error as { request_id?: unknown }).request_id
  return typeof requestId === "string" && requestId.trim() ? requestId.trim() : null
}

export async function partnerApiRawRequest(
  path: string,
  init: RequestInit = {},
  suppliedApiKey?: string,
): Promise<Response> {
  const apiKey = suppliedApiKey || (await readApiKey())
  if (!apiKey) throw new PartnerApiError(401, "Partner API key is not connected.")

  const origin = partnerApiOrigin()
  try {
    return await fetch(`${origin}${path}`, {
      ...init,
      cache: "no-store",
      signal: init.signal || AbortSignal.timeout(15_000),
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(init.headers || {}),
      },
    })
  } catch {
    throw new PartnerApiError(503, "Partner API is unavailable.")
  }
}

export async function partnerPublicAssetRequest(publicPath: string): Promise<Response> {
  if (!/^\/api\/org-public\/profile\/logo\/\d+$/.test(publicPath)) {
    throw new PartnerApiError(404, "Public asset was not found.")
  }
  const partnerOrigin = partnerApiOrigin()
  const backendOrigin = partnerOrigin.replace(/\/partner$/, "")
  const backendPath = publicPath.replace(/^\/api/, "")
  try {
    return await fetch(`${backendOrigin}${backendPath}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new PartnerApiError(503, "Public asset is unavailable.")
  }
}

export async function partnerApiRequest<T>(
  path: string,
  init: RequestInit = {},
  suppliedApiKey?: string,
): Promise<{
  data: T
  etag: string | null
  idempotencyReplayed: string | null
  requestId: string | null
  status: number
}> {
  const response = await partnerApiRawRequest(path, init, suppliedApiKey)

  const raw = await response.text()
  let body: unknown = null
  try {
    body = raw ? JSON.parse(raw) : null
  } catch {
    body = null
  }
  if (!response.ok) {
    throw new PartnerApiError(
      response.status,
      errorDetail(body, response.status),
      body,
      response.headers.get("retry-after"),
      bodyRequestId(body) || response.headers.get("x-request-id"),
    )
  }
  return {
    data: body as T,
    etag: response.headers.get("etag"),
    idempotencyReplayed: response.headers.get("idempotency-replayed"),
    requestId: response.headers.get("x-request-id"),
    status: response.status,
  }
}
