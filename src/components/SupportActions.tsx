"use client"

import { X } from "lucide-react"
import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

import { dictionary } from "@/lib/i18n"
import { useStableIdempotencyKey } from "@/lib/client-idempotency"
import { readResponseError } from "@/lib/http-response-error"

export default function SupportActions() {
  const copy = dictionary()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const { keyFor, clearKey } = useStableIdempotencyKey()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError("")
    try {
      const payload = { subject, body }
      const response = await fetch("/api/partner/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": keyFor("support-ticket-create", payload),
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        setError(await readResponseError(response, "Could not create the ticket."))
        return
      }
      const ticket = await response.json() as { id: number }
      clearKey("support-ticket-create")
      setSubject("")
      setBody("")
      setOpen(false)
      router.push(`/support/${ticket.id}`)
      router.refresh()
    } catch {
      setError("The Partner API could not be reached. Try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="h-9 rounded-lg bg-teal-700 px-4 text-[12px] font-medium text-white hover:bg-teal-800">{copy.newTicket}</button>
      {open ? <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-900/30 p-4">
        <form onSubmit={submit} className="w-full max-w-[560px] rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-semibold text-slate-700">{copy.newTicket}</h2><button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
          <div className="space-y-2">
            <input required maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={copy.subject} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-[13px] outline-none focus:border-teal-600" />
            <textarea required maxLength={5000} value={body} onChange={(event) => setBody(event.target.value)} placeholder={copy.message} rows={4} className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-[13px] outline-none focus:border-teal-600" />
          </div>
          {error ? <p className="mt-2 text-[11px] text-rose-700">{error}</p> : null}
          <div className="mt-4 flex justify-center gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg border border-slate-200 px-4 text-[12px] text-slate-500">{copy.cancel}</button><button disabled={pending} className="h-9 rounded-lg bg-teal-700 px-4 text-[12px] font-medium text-white disabled:bg-slate-300">{pending ? "…" : copy.send}</button></div>
        </form>
      </div> : null}
    </>
  )
}
