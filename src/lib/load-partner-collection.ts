// Purpose: Exhaust one bounded Partner API collection without duplicating pagination loops in SSR pages.

import "server-only"

import { PartnerApiError, partnerApiRequest } from "@/lib/partner-api"
import type { Page } from "@/lib/types"

const PAGE_SIZE = 100
const MAX_OFFSET = 1_000

export async function loadPartnerCollection<T>(path: string): Promise<T[]> {
  const url = new URL(path, "https://partner-console.invalid")
  const items: T[] = []
  let totalCount: number | null = null

  while (totalCount === null || items.length < totalCount) {
    if (items.length > MAX_OFFSET) {
      throw new PartnerApiError(
        422,
        `This collection contains more than ${MAX_OFFSET + PAGE_SIZE} records and cannot be exhausted with offset pagination. Narrow the filters.`,
      )
    }
    url.searchParams.set("limit", String(PAGE_SIZE))
    url.searchParams.set("offset", String(items.length))
    const { data } = await partnerApiRequest<Page<T>>(`${url.pathname}${url.search}`)
    totalCount ??= data.total_count
    items.push(...data.items)
    if (!data.items.length) break
  }

  return items
}
