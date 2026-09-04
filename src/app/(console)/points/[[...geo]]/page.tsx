// Purpose: Server-render point data from a canonical path-owned geo scope.

import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"

import PageFrame from "@/components/PageFrame"
import PointsWorkspace from "@/components/PointsWorkspace"
import ServerPagination from "@/components/ServerPagination"
import { dictionary } from "@/lib/i18n"
import { loadPartnerCollection } from "@/lib/load-partner-collection"
import { partnerApiRequest } from "@/lib/partner-api"
import { normalizeRememberedGeo, WORKSPACE_GEO_COOKIE } from "@/lib/workspace-geo-preference"
import { resolveWorkspaceLocation } from "@/lib/resolve-workspace-location"
import { clampServerPage, readServerPage, serverPageOffset, setPageParam } from "@/lib/server-pagination"
import type { Page, Point, Rate } from "@/lib/types"

const PAGE_SIZE = 10

function queryWithoutLegacyGeo(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (key === "geo") return
    if (typeof value === "string") query.set(key, value)
    else value?.forEach((item) => query.append(key, item))
  })
  return query
}

function pointsUrl(geo: string, query: URLSearchParams) {
  const pathname = geo ? `/points/${encodeURIComponent(geo)}` : "/points"
  const suffix = query.toString()
  return suffix ? `${pathname}?${suffix}` : pathname
}

export default async function PointsPage({
  params,
  searchParams,
}: {
  params: Promise<{ geo?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const copy = dictionary()
  const [route, queryParams, cookieStore] = await Promise.all([params, searchParams, cookies()])
  if ((route.geo?.length || 0) > 1) notFound()
  if (route.geo?.[0] && !normalizeRememberedGeo(route.geo[0])) notFound()

  const legacyGeo = typeof queryParams.geo === "string" ? normalizeRememberedGeo(queryParams.geo) : ""
  const routeGeo = normalizeRememberedGeo(route.geo?.[0])
  const rememberedGeo = normalizeRememberedGeo(cookieStore.get(WORKSPACE_GEO_COOKIE)?.value)
  const rawGeo = routeGeo || legacyGeo || rememberedGeo
  const cleanQuery = queryWithoutLegacyGeo(queryParams)

  if (!routeGeo && rawGeo) redirect(pointsUrl(rawGeo, cleanQuery))
  if (routeGeo && legacyGeo) redirect(pointsUrl(routeGeo, cleanQuery))

  const page = readServerPage(queryParams.page, PAGE_SIZE)
  const location = await resolveWorkspaceLocation(rawGeo)
  if (rawGeo && !location) notFound()
  const pointFilter = location
    ? location.kind === "city" && location.slug
      ? `&city_slug=${encodeURIComponent(location.slug)}`
      : `&country_iso3=${encodeURIComponent(location.iso3)}`
    : ""
  const [{ data: points }, mapPoints, directions] = await Promise.all([
    partnerApiRequest<Page<Point>>(`/points?limit=${PAGE_SIZE}&offset=${serverPageOffset(page, PAGE_SIZE)}&status_filter=all&sort=updated_desc${pointFilter}`),
    loadPartnerCollection<Point>(`/points?status_filter=all&sort=updated_desc${pointFilter}`),
    loadPartnerCollection<Rate>("/rates?locale=en"),
  ])
  const clampedPage = clampServerPage(page, points.total_count, PAGE_SIZE)
  if (clampedPage !== page) {
    const query = queryWithoutLegacyGeo(queryParams)
    setPageParam(query, "page", clampedPage)
    redirect(pointsUrl(rawGeo, query))
  }
  const paginationPath = rawGeo ? `/points/${encodeURIComponent(rawGeo)}` : "/points"
  return (
    <PageFrame title={copy.points} contained>
      <PointsWorkspace
        points={points.items}
        mapPoints={mapPoints}
        directions={directions}
        locationFilter={location}
        pageSize={PAGE_SIZE}
        pagination={<ServerPagination pathname={paginationPath} rawSearchParams={queryParams} currentPage={page} totalCount={points.total_count} pageSize={PAGE_SIZE} />}
      />
    </PageFrame>
  )
}
