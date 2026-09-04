// Purpose: Keep URL pages inside Partner API's bounded offset contract.

const MAX_OFFSET = 1_000

export type RawSearchParams = Record<string, string | string[] | undefined>

export function readServerPage(
  value: string | string[] | undefined,
  pageSize: number,
): number {
  const parsed = Number(typeof value === "string" ? value : "1")
  if (!Number.isSafeInteger(parsed) || parsed < 1) return 1
  return Math.min(parsed, Math.floor(MAX_OFFSET / pageSize) + 1)
}

export function serverPageOffset(page: number, pageSize: number): number {
  return Math.min(MAX_OFFSET, Math.max(0, (page - 1) * pageSize))
}

export function clampServerPage(
  page: number,
  totalCount: number,
  pageSize: number,
): number {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  return Math.min(Math.max(1, page), totalPages)
}

export function searchParamsFromRaw(rawSearchParams: RawSearchParams): URLSearchParams {
  const searchParams = new URLSearchParams()
  Object.entries(rawSearchParams).forEach(([key, value]) => {
    if (typeof value === "string") searchParams.set(key, value)
    else value?.forEach((item) => searchParams.append(key, item))
  })
  return searchParams
}

export function setPageParam(searchParams: URLSearchParams, pageParam: string, page: number) {
  if (page <= 1) searchParams.delete(pageParam)
  else searchParams.set(pageParam, String(page))
}

export function urlWithSearchParams(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}
