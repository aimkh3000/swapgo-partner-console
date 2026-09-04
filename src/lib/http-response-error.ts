// Purpose: Keep browser-facing API errors consistent without duplicating response parsing.

type ErrorBody = {
  detail?: unknown
  error?: unknown
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

export async function readResponseError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null) as ErrorBody | null
  const message = messageFrom(body?.detail) || messageFrom(body?.error) || fallback
  const error = body?.error && typeof body.error === "object"
    ? body.error as { request_id?: unknown }
    : null
  const requestId = typeof error?.request_id === "string" ? error.request_id.trim() : ""
  return requestId ? `${message} Request ID: ${requestId}` : message
}
