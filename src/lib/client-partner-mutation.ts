// Purpose: Keep Partner Console mutations concurrency-safe and consistently reported.

import { readResponseError } from "@/lib/http-response-error"

export type PartnerMutationResult<T> = {
  data: T
  etag: string | null
}

export function etagForUpdatedAt(updatedAt: string | null | undefined) {
  return updatedAt ? `"u:${updatedAt}"` : null
}

export async function partnerMutation<T>({
  path,
  method,
  body,
  etag,
  fallbackError,
}: {
  path: string
  method: "PATCH" | "POST" | "DELETE"
  body?: Record<string, unknown> | FormData
  etag: string | null
  fallbackError: string
}): Promise<PartnerMutationResult<T>> {
  const multipart = body instanceof FormData
  const response = await fetch(`/api/partner${path}`, {
    method,
    headers: {
      ...(multipart ? {} : body ? { "Content-Type": "application/json" } : {}),
      ...(etag ? { "If-Match": etag } : {}),
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: multipart ? body : body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) {
    throw new Error(await readResponseError(response, fallbackError))
  }
  return {
    data: await response.json() as T,
    etag: response.headers.get("etag"),
  }
}
