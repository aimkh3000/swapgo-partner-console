// Purpose: Server-rendered two-column Partner API tickets and notifications workspace.

import Link from "next/link"
import { redirect } from "next/navigation"

import PageFrame from "@/components/PageFrame"
import PartnerTwoColumnLayout from "@/components/PartnerTwoColumnLayout"
import ServerPagination from "@/components/ServerPagination"
import SupportActions from "@/components/SupportActions"
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
import type { Notification, Page, TicketSummary } from "@/lib/types"

const PAGE_SIZE = 10

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const copy = dictionary()
  const params = await searchParams
  const ticketPage = readServerPage(params.ticket_page, PAGE_SIZE)
  const notificationPage = readServerPage(params.notification_page, PAGE_SIZE)
  const [{ data: tickets }, { data: notifications }] = await Promise.all([
    partnerApiRequest<Page<TicketSummary>>(`/support/tickets?limit=${PAGE_SIZE}&offset=${serverPageOffset(ticketPage, PAGE_SIZE)}`),
    partnerApiRequest<Page<Notification>>(`/notifications?limit=${PAGE_SIZE}&offset=${serverPageOffset(notificationPage, PAGE_SIZE)}`),
  ])
  const clampedTicketPage = clampServerPage(ticketPage, tickets.total_count, PAGE_SIZE)
  const clampedNotificationPage = clampServerPage(notificationPage, notifications.total_count, PAGE_SIZE)
  if (clampedTicketPage !== ticketPage || clampedNotificationPage !== notificationPage) {
    const query = searchParamsFromRaw(params)
    setPageParam(query, "ticket_page", clampedTicketPage)
    setPageParam(query, "notification_page", clampedNotificationPage)
    redirect(urlWithSearchParams("/support", query))
  }
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })
  return (
    <PageFrame title={copy.support} contained>
      <PartnerTwoColumnLayout
        left={<section className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-[15px] font-semibold text-slate-700">Tickets</h2>
            <span className="text-[11px] text-slate-400">{tickets.total_count}</span>
            <div className="ml-auto"><SupportActions /></div>
          </div>
          <div className="space-y-2">
            {tickets.items.map((ticket) => (
              <Link key={ticket.id} href={`/support/${ticket.id}`} className="block rounded-lg border border-slate-200 px-3 py-3 hover:border-slate-300 hover:bg-slate-50/60">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-700">{ticket.subject}</h3>
                  <span className="shrink-0 text-[10px] text-slate-400">{ticket.message_count} messages</span>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] ${ticket.status === "open" ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>{ticket.status === "open" ? copy.open : copy.closed}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-slate-500">{ticket.last_message_preview}</p>
                <div className="mt-1 text-[10px] text-slate-400">#{ticket.id} · {formatter.format(new Date(ticket.updated_at))} UTC</div>
              </Link>
            ))}
            {!tickets.items.length ? <p className="py-10 text-center text-[13px] text-slate-500">No tickets yet.</p> : null}
          </div>
          <ServerPagination
            pathname="/support"
            rawSearchParams={params}
            currentPage={ticketPage}
            totalCount={tickets.total_count}
            pageSize={PAGE_SIZE}
            pageParam="ticket_page"
          />
        </section>}

        right={<section className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-[15px] font-semibold text-slate-700">Notifications</h2>
            <span className="text-[11px] text-slate-400">{notifications.total_count}</span>
          </div>
          <div className="space-y-2">
            {notifications.items.map((notification) => (
              <article key={notification.id} className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                <h3 className="text-[13px] font-semibold text-slate-700">{notification.subject}</h3>
                <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-slate-500">{notification.body}</p>
                <div className="mt-1.5 text-[10px] text-slate-400">{formatter.format(new Date(notification.created_at))} UTC</div>
              </article>
            ))}
            {!notifications.items.length ? <p className="py-10 text-center text-[13px] text-slate-500">No notifications yet.</p> : null}
          </div>
          <ServerPagination
            pathname="/support"
            rawSearchParams={params}
            currentPage={notificationPage}
            totalCount={notifications.total_count}
            pageSize={PAGE_SIZE}
            pageParam="notification_page"
          />
        </section>}
      />
    </PageFrame>
  )
}
