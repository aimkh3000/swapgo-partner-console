"use client"

// Purpose: Reuse one idempotency key while the browser retries the same logical mutation.

import { useCallback, useRef } from "react"

type MutationKey = {
  fingerprint: string
  value: string
}

export function useStableIdempotencyKey() {
  const keysRef = useRef(new Map<string, MutationKey>())

  const keyFor = useCallback((operation: string, payload: unknown) => {
    const fingerprint = JSON.stringify(payload)
    const current = keysRef.current.get(operation)
    if (current?.fingerprint === fingerprint) return current.value

    const value = crypto.randomUUID()
    keysRef.current.set(operation, { fingerprint, value })
    return value
  }, [])

  const clearKey = useCallback((operation: string) => {
    keysRef.current.delete(operation)
  }, [])

  return { keyFor, clearKey }
}
