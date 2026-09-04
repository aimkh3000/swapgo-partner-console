"use client"

// Purpose: Reply to and close a Partner API support ticket.

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

import { dictionary } from "@/lib/i18n"
import { useStableIdempotencyKey } from "@/lib/client-idempotency"
import { readResponseError } from "@/lib/http-response-error"

export default function TicketThreadActions({ ticketId, status }: { ticketId: number; status: "open" | "closed" }) {
  const copy = dictionary()
  const router = useRouter()
  const [body, setBody] = useState("")
  const [pending, setPending] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [error, setError] = useState("")
  const { keyFor, clearKey } = useStableIdempotencyKey()

  async function reply(event: FormEvent) {
    event.preventDefault()
    if (!body.trim()) return
    setPending(true)
    setError("")
    try {
      const payload = { body: body.trim() }
      const response = await fetch(`/api/partner/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": keyFor("support-ticket-reply", { ticketId, payload }),
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        setError(await readResponseError(response, "Could not send the message."))
        return
      }
      clearKey("support-ticket-reply")
      setBody("")
      router.replace(`/support/${ticketId}`)
      router.refresh()
    } catch {
      setError("The Partner API could not be reached. Try again.")
    } finally {
      setPending(false)
    }
  }

  async function closeTicket() {
    setPending(true)
    setError("")
    try {
      const response = await fetch(`/api/partner/support/tickets/${ticketId}/close`, {
        method: "POST",
        headers: {
          "Idempotency-Key": keyFor("support-ticket-close", { ticketId }),
        },
      })
      if (!response.ok) {
        setError(await readResponseError(response, "Could not close the ticket."))
        return
      }
      clearKey("support-ticket-close")
      setConfirmClose(false)
      router.refresh()
    } catch {
      setError("The Partner API could not be reached. Try again.")
    } finally {
      setPending(false)
    }
  }

  if (status === "closed") return null
  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <form onSubmit={reply} className="flex items-end gap-2">
        <textarea value={body} onChange={(event) => setBody(event.target.value)} required maxLength={5000} rows={2} placeholder={copy.message} className="min-h-10 min-w-0 flex-1 resize-y rounded-lg border border-slate-300 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-teal-600" />
        <button disabled={pending || !body.trim()} className="h-9 rounded-lg bg-teal-700 px-4 text-[12px] font-medium text-white disabled:bg-slate-300">{pending ? "…" : copy.send}</button>
      </form>
      <div className="mt-2 flex min-h-8 items-center justify-between gap-2">
        {error ? <p className="text-[11px] text-rose-700">{error}</p> : <span />}
        {confirmClose ? <div className="flex items-center gap-2 text-[11px] text-slate-500"><span>Close?</span><button type="button" onClick={closeTicket} className="text-rose-700">Yes</button><button type="button" onClick={() => setConfirmClose(false)}>No</button></div> : <button type="button" onClick={() => setConfirmClose(true)} className="text-[11px] text-slate-500 hover:text-rose-700">Close ticket</button>}
      </div>
    </div>
  )
}
