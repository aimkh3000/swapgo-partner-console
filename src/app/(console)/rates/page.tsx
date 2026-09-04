// Purpose: Server-loaded rates rendered through one create/edit workspace.

import PageFrame from "@/components/PageFrame"
import RatesWorkspace from "@/components/RatesWorkspace"
import ServerPagination from "@/components/ServerPagination"
import { dictionary } from "@/lib/i18n"
import { partnerApiRequest } from "@/lib/partner-api"
import {
  clampServerPage,
  readServerPage,
  searchParamsFromRaw,
  serverPageOffset,
  setPageParam,
  urlWithSearchParams,
} from "@/lib/server-pagination"
import type { Page, Rate } from "@/lib/types"
import { redirect } from "next/navigation"

const PAGE_SIZE = 10

export default async function RatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const copy = dictionary()
  const params = await searchParams
  const page = readServerPage(params.page, PAGE_SIZE)
  const { data } = await partnerApiRequest<Page<Rate>>(`/rates?limit=${PAGE_SIZE}&offset=${serverPageOffset(page, PAGE_SIZE)}&locale=en`)
  const clampedPage = clampServerPage(page, data.total_count, PAGE_SIZE)
  if (clampedPage !== page) {
    const query = searchParamsFromRaw(params)
    setPageParam(query, "page", clampedPage)
    redirect(urlWithSearchParams("/rates", query))
  }
  return (
    <PageFrame title={copy.rates} contained>
      <RatesWorkspace
        rates={data.items}
        pagination={<ServerPagination pathname="/rates" rawSearchParams={params} currentPage={page} totalCount={data.total_count} pageSize={PAGE_SIZE} />}
      />
    </PageFrame>
  )
}
