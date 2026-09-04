// Purpose: Server-render the Partner API review workspace with path-owned geo and URL-owned filters.

import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"

import PageFrame from "@/components/PageFrame"
import ReviewsWorkspace from "@/components/ReviewsWorkspace"
import ServerPagination from "@/components/ServerPagination"
import { dictionary } from "@/lib/i18n"
import { loadPartnerCollection } from "@/lib/load-partner-collection"
import { partnerApiRequest } from "@/lib/partner-api"
import { normalizeRememberedGeo, WORKSPACE_GEO_COOKIE } from "@/lib/workspace-geo-preference"
import { resolveWorkspaceLocation } from "@/lib/resolve-workspace-location"
import { clampServerPage, readServerPage, serverPageOffset, setPageParam } from "@/lib/server-pagination"
import type { Point, ReviewPage } from "@/lib/types"

const PAGE_SIZE = 10

function oneOf<T extends string>(value: string | string[] | undefined, values: readonly T[], fallback: T): T {
  return typeof value === "string" && values.includes(value as T) ? value as T : fallback
}

function positiveInteger(value: string | string[] | undefined) {
  const parsed = Number(typeof value === "string" ? value : "")
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function cleanQuery(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (key === "geo") return
    if (typeof value === "string") query.set(key, value)
    else value?.forEach((item) => query.append(key, item))
  })
  return query
}

function routeUrl(geo: string, query: URLSearchParams) {
  const pathname = geo ? `/reviews/${encodeURIComponent(geo)}` : "/reviews"
  return query.size ? `${pathname}?${query.toString()}` : pathname
}

export default async function ReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ geo?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [route, queryParams, cookieStore] = await Promise.all([params, searchParams, cookies()])
  if ((route.geo?.length || 0) > 1) notFound()
  if (route.geo?.[0] && !normalizeRememberedGeo(route.geo[0])) notFound()
  const routeGeo = normalizeRememberedGeo(route.geo?.[0])
  const legacyGeo = typeof queryParams.geo === "string" ? normalizeRememberedGeo(queryParams.geo) : ""
  const rememberedGeo = normalizeRememberedGeo(cookieStore.get(WORKSPACE_GEO_COOKIE)?.value)
  const geo = routeGeo || legacyGeo || rememberedGeo
  const normalizedQuery = cleanQuery(queryParams)
  if (!routeGeo && geo) redirect(routeUrl(geo, normalizedQuery))
  if (routeGeo && legacyGeo) redirect(routeUrl(routeGeo, normalizedQuery))

  const location = await resolveWorkspaceLocation(geo)
  if (geo && !location) notFound()
  const geoFilter = location
    ? location.kind === "city" && location.slug
      ? `&city_slug=${encodeURIComponent(location.slug)}`
      : `&country_iso3=${encodeURIComponent(location.iso3)}`
    : ""
  const page = readServerPage(queryParams.page, PAGE_SIZE)
  const pointId = positiveInteger(queryParams.point)
  const tone = oneOf(queryParams.tone, ["all", "positive", "neutral", "negative"] as const, "all")
  const view = oneOf(queryParams.view, ["all", "answered", "unanswered"] as const, "all")
  const datePreset = oneOf(queryParams.date, ["all", "today", "7d", "30d"] as const, "all")
  const sort = oneOf(queryParams.sort, ["newest", "oldest"] as const, "newest")
  const unansweredFirst = queryParams.unanswered_first !== "0"
  const reviewQuery = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(serverPageOffset(page, PAGE_SIZE)),
    tone,
    view,
    date_preset: datePreset,
    sort,
    unanswered_first: String(unansweredFirst),
  })
  if (pointId) reviewQuery.set("point_id", String(pointId))
  if (location?.kind === "city" && location.slug) reviewQuery.set("city_slug", location.slug)
  else if (location) reviewQuery.set("country_iso3", location.iso3)

  const [{ data: reviews }, points] = await Promise.all([
    partnerApiRequest<ReviewPage>(`/reviews?${reviewQuery.toString()}`),
    loadPartnerCollection<Point>(`/points?status_filter=active${geoFilter}`),
  ])
  const pathname = geo ? `/reviews/${encodeURIComponent(geo)}` : "/reviews"
  const clampedPage = clampServerPage(page, reviews.total_count, PAGE_SIZE)
  if (clampedPage !== page) {
    const query = cleanQuery(queryParams)
    setPageParam(query, "page", clampedPage)
    redirect(routeUrl(geo, query))
  }
  return (
    <PageFrame title={dictionary().reviews} contained>
      <ReviewsWorkspace
        key={`${geo}:${pointId || ""}:${page}`}
        reviews={reviews.items}
        points={points}
        location={location}
        summary={reviews.summary}
        organizationSummary={reviews.organization_summary}
        filters={{ tone, view, datePreset, sort, unansweredFirst, pointId }}
        pagination={<ServerPagination pathname={pathname} rawSearchParams={queryParams} currentPage={page} totalCount={reviews.total_count} pageSize={PAGE_SIZE} />}
      />
    </PageFrame>
  )
}
