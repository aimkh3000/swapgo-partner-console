// Purpose: Strict same-origin BFF; the browser never receives the connected Partner API key.

import { NextResponse } from "next/server"

import { PartnerApiError, partnerApiRawRequest, partnerApiRequest, partnerPublicAssetRequest } from "@/lib/partner-api"
import type { OrganizationProfile } from "@/lib/types"

const RULES: Array<{ method: string; path: RegExp }> = [
  { method: "GET", path: /^\/(?:me|organization|organization\/profile|organization\/profile\/logo|organization\/legal)$/ },
  { method: "GET", path: /^\/organization\/legal\/documents\/\d+\/content$/ },
  { method: "GET", path: /^\/references\/(?:locations|currencies)\/search$/ },
  { method: "GET", path: /^\/references\/locations\/resolve$/ },
  { method: "GET", path: /^\/(?:points|rates|directions|reviews|notifications|support\/tickets)$/ },
  { method: "GET", path: /^\/(?:points|rates|directions|reviews|notifications|support\/tickets)\/\d+$/ },
  { method: "GET", path: /^\/point-direction-assignments$/ },
  { method: "POST", path: /^\/(?:points|directions)$/ },
  { method: "POST", path: /^\/organization\/(?:profile\/logo|legal\/(?:submit|cancel|documents))$/ },
  { method: "PATCH", path: /^\/organization(?:\/profile|\/legal)?$/ },
  { method: "PATCH", path: /^\/organization\/legal\/documents\/\d+(?:\/retirement)?$/ },
  { method: "PATCH", path: /^\/(?:points|directions)\/\d+$/ },
  { method: "PATCH", path: /^\/points\/\d+\/status$/ },
  { method: "PATCH", path: /^\/directions\/\d+\/(?:rates|status)$/ },
  { method: "PATCH", path: /^\/reviews\/\d+\/reply$/ },
  { method: "PATCH", path: /^\/point-direction-assignments$/ },
  { method: "POST", path: /^\/support\/tickets$/ },
  { method: "POST", path: /^\/support\/tickets\/\d+\/(?:messages|close)$/ },
  { method: "DELETE", path: /^\/organization\/legal\/documents\/\d+$/ },
]

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const segments = (await context.params).path
  const pathname = `/${segments.join("/")}`
  if (!RULES.some((rule) => rule.method === request.method && rule.path.test(pathname))) {
    return NextResponse.json({ detail: "Partner Console route is not allowed." }, { status: 404 })
  }
  let body: BodyInit | undefined
  const contentType = request.headers.get("content-type") || ""
  const multipart = contentType.toLowerCase().startsWith("multipart/form-data")
  if (request.method !== "GET") {
    const origin = request.headers.get("origin")
    const expectedHost = request.headers.get("host") || request.headers.get("x-forwarded-host")
    if (origin) {
      let originHost: string | null = null
      try {
        originHost = new URL(origin).host
      } catch {
        // Invalid Origin values are untrusted input, not server errors.
      }
      if (!expectedHost || originHost !== expectedHost) {
        return NextResponse.json({ detail: "Cross-origin mutation rejected." }, { status: 403 })
      }
    }
    const maxBodyBytes = multipart ? 11_000_000 : 100_000
    const contentLength = Number(request.headers.get("content-length") || "0")
    if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > maxBodyBytes) {
      return NextResponse.json({ detail: "Request body is too large." }, { status: 413 })
    }
    const bodyBuffer = await request.arrayBuffer()
    if (bodyBuffer.byteLength > maxBodyBytes) {
      return NextResponse.json({ detail: "Request body is too large." }, { status: 413 })
    }
    body = bodyBuffer
  }

  const incoming = new URL(request.url)
  const targetPath = `${pathname}${incoming.search}`
  const headers: Record<string, string> = {}
  const ifMatch = request.headers.get("if-match")
  if (ifMatch) headers["If-Match"] = ifMatch
  if (request.method !== "GET") {
    if (contentType) headers["Content-Type"] = contentType
    headers["Idempotency-Key"] = request.headers.get("idempotency-key") || crypto.randomUUID()
  }

  if (request.method === "GET" && /^\/organization\/legal\/documents\/\d+\/content$/.test(pathname)) {
    try {
      const upstream = await partnerApiRawRequest(targetPath)
      const responseBody = await upstream.arrayBuffer()
      const response = new NextResponse(responseBody, { status: upstream.status })
      for (const name of ["content-type", "content-disposition", "etag", "x-request-id"]) {
        const value = upstream.headers.get(name)
        if (value) response.headers.set(name, value)
      }
      response.headers.set("cache-control", "private, no-store")
      return response
    } catch (error) {
      if (error instanceof PartnerApiError) {
        return NextResponse.json({ detail: error.detail }, { status: error.status })
      }
      return NextResponse.json({ detail: "Partner API is unavailable." }, { status: 502 })
    }
  }

  if (request.method === "GET" && pathname === "/organization/profile/logo") {
    try {
      const profile = await partnerApiRequest<OrganizationProfile>("/organization/profile")
      if (!profile.data.logo_url) return new NextResponse(null, { status: 404 })
      const upstream = await partnerPublicAssetRequest(profile.data.logo_url)
      const responseBody = await upstream.arrayBuffer()
      const response = new NextResponse(responseBody, { status: upstream.status })
      const contentTypeHeader = upstream.headers.get("content-type")
      if (contentTypeHeader) response.headers.set("content-type", contentTypeHeader)
      response.headers.set("cache-control", "private, no-store")
      return response
    } catch (error) {
      if (error instanceof PartnerApiError) return new NextResponse(null, { status: error.status })
      return new NextResponse(null, { status: 502 })
    }
  }

  const forward = () => partnerApiRequest<unknown>(targetPath, {
    method: request.method,
    headers,
    body,
  })

  try {
    let result
    try {
      result = await forward()
    } catch (error) {
      const retryable = error instanceof PartnerApiError
        && [500, 502, 503, 504].includes(error.status)
      if (!retryable) throw error
      await new Promise((resolve) => setTimeout(resolve, 120))
      result = await forward()
    }
    const { data, etag, idempotencyReplayed, requestId, status } = result
    const response = NextResponse.json(data, { status })
    if (etag) response.headers.set("etag", etag)
    if (idempotencyReplayed) response.headers.set("idempotency-replayed", idempotencyReplayed)
    if (requestId) response.headers.set("x-request-id", requestId)
    response.headers.set("cache-control", "private, no-store")
    return response
  } catch (error) {
    if (error instanceof PartnerApiError) {
      const body = error.responseBody && typeof error.responseBody === "object"
        ? error.responseBody
        : { detail: error.detail }
      const response = NextResponse.json(body, { status: error.status })
      if (error.retryAfter) response.headers.set("retry-after", error.retryAfter)
      if (error.requestId) response.headers.set("x-request-id", error.requestId)
      response.headers.set("cache-control", "private, no-store")
      return response
    }
    return NextResponse.json({
      error: {
        code: "partner_api_unavailable",
        message: "Partner API is unavailable.",
        field: null,
        details: null,
        request_id: null,
      },
    }, { status: 502 })
  }
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const DELETE = proxy
