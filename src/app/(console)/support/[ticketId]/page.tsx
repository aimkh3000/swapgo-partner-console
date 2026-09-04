// Purpose: Server-rendered Partner API ticket thread with reply and close actions.

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import PageFrame from "@/components/PageFrame"
import ServerPagination from "@/components/ServerPagination"
import TicketThreadActions from "@/components/TicketThreadActions"
import { dictionary } from "@/lib/i18n"
import { PartnerApiError, partnerApiRequest } from "@/lib/partner-api"
import {
  clampServerPage,
  readServerPage,
  searchParamsFromRaw,
  serverPageOffset,
  setPageParam,
  urlWithSearchParams,
} from "@/lib/server-pagination"
import type { TicketDetail } from "@/lib/types"

const MESSAGE_PAGE_SIZE = 20

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticketId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ ticketId: rawTicketId }, queryParams] = await Promise.all([params, searchParams])
  const ticketId = Number(rawTicketId)
  if (!Number.isSafeInteger(ticketId) || ticketId < 1) notFound()
  const messagePage = readServerPage(queryParams.message_page, MESSAGE_PAGE_SIZE)
  let ticket: TicketDetail
  try {
    ticket = (await partnerApiRequest<TicketDetail>(
      `/support/tickets/${ticketId}?message_limit=${MESSAGE_PAGE_SIZE}&message_offset=${serverPageOffset(messagePage, MESSAGE_PAGE_SIZE)}`,
    )).data
  } catch (error) {
    if (error instanceof PartnerApiError && error.status === 404) notFound()
    throw error
  }
  const clampedMessagePage = clampServerPage(messagePage, ticket.message_total, MESSAGE_PAGE_SIZE)
  if (clampedMessagePage !== messagePage) {
    const query = searchParamsFromRaw(queryParams)
    setPageParam(query, "message_page", clampedMessagePage)
    redirect(urlWithSearchParams(`/support/${ticket.id}`, query))
  }
  const copy = dictionary()
  const formatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })

  return (
    <PageFrame title={ticket.subject} centerAction={<Link href="/support" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-[12px] text-slate-500 hover:border-slate-300"><ArrowLeft className="h-4 w-4" />Back to tickets</Link>}>
      <section className="mx-auto max-w-[900px] rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <h1 className="min-w-0 flex-1 text-[16px] font-semibold text-slate-700">{ticket.subject}</h1>
          <span className="text-[10px] text-slate-400">#{ticket.id}</span>
          <span className={`rounded-md px-2 py-0.5 text-[10px] ${ticket.status === "open" ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>{ticket.status === "open" ? copy.open : copy.closed}</span>
        </div>
        <div className="mt-3 space-y-2">
          {ticket.messages.map((message) => (
            <article key={message.id} className={`max-w-[82%] rounded-xl px-3 py-2 ${message.side === "organization" ? "ml-auto bg-teal-50 text-slate-700" : "bg-slate-100 text-slate-700"}`}>
              <div className="whitespace-pre-wrap text-[13px] leading-5">{message.body}</div>
              <div className="mt-1 text-[9px] text-slate-400">{message.side === "organization" ? "Organization" : "SwapGo.me"} · {formatter.format(new Date(message.created_at))} UTC</div>
            </article>
          ))}
        </div>
        <ServerPagination
          pathname={`/support/${ticket.id}`}
          rawSearchParams={queryParams}
          currentPage={messagePage}
          totalCount={ticket.message_total}
          pageSize={MESSAGE_PAGE_SIZE}
          pageParam="message_page"
        />
        <TicketThreadActions ticketId={ticket.id} status={ticket.status} />
      </section>
    </PageFrame>
  )
}
