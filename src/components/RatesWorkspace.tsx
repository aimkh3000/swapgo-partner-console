"use client"

// Purpose: One reusable form for creating and editing Partner API directions and rates.

import { ArrowRight, Check, CheckCircle2, Pause, Play, Plus, Trash2, X } from "lucide-react"
import { FormEvent, type ReactNode, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import ReferenceCombobox from "@/components/ReferenceCombobox"
import CurrencyIdentity from "@/components/CurrencyIdentity"
import PartnerTwoColumnLayout from "@/components/PartnerTwoColumnLayout"
import { useStableIdempotencyKey } from "@/lib/client-idempotency"
import { readResponseError } from "@/lib/http-response-error"
import type { CurrencyReference, Rate } from "@/lib/types"

type EditorMode = { kind: "create" } | { kind: "edit"; rate: Rate }

function editableRate(value: string | null) {
  if (!value || !value.includes(".")) return value ?? ""
  return value.replace(/0+$/, "").replace(/\.$/, "")
}

function rateForRequest(value: string) {
  return value.trim().replace(",", ".") || null
}

function RateForm({ mode, onDone, onCancel }: {
  mode: EditorMode
  onDone: () => void
  onCancel: () => void
}) {
  const router = useRouter()
  const rate = mode.kind === "edit" ? mode.rate : null
  const [from, setFrom] = useState<CurrencyReference | null>(rate?.currency_from ?? null)
  const [to, setTo] = useState<CurrencyReference | null>(rate?.currency_to ?? null)
  const [buying, setBuying] = useState(editableRate(rate?.buying_rate ?? null))
  const [selling, setSelling] = useState(editableRate(rate?.selling_rate ?? null))
  const [comment, setComment] = useState(rate?.comment ?? "")
  const [pending, setPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [snapshotEtag, setSnapshotEtag] = useState<string | null>(null)
  const [snapshotRate, setSnapshotRate] = useState<Rate | null>(rate)
  const [snapshotReady, setSnapshotReady] = useState(!rate)
  const { keyFor, clearKey } = useStableIdempotencyKey()

  useEffect(() => {
    if (!saved) return
    const timeout = window.setTimeout(() => setSaved(false), 2500)
    return () => window.clearTimeout(timeout)
  }, [saved])

  useEffect(() => {
    if (!rate) return
    const controller = new AbortController()

    async function loadSnapshot() {
      setSnapshotReady(false)
      setError("")
      try {
        const response = await fetch(`/api/partner/rates/${rate!.id}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(await readResponseError(response, "Could not load the rate."))
        const etag = response.headers.get("etag")
        if (!etag) throw new Error("The rate revision is missing. Refresh and try again.")
        const current = await response.json() as Rate
        setFrom(current.currency_from)
        setTo(current.currency_to)
        setBuying(editableRate(current.buying_rate))
        setSelling(editableRate(current.selling_rate))
        setComment(current.comment ?? "")
        setSnapshotRate(current)
        setSnapshotEtag(etag)
        clearKey("rate-save")
        clearKey("rate-status")
        setSnapshotReady(true)
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Request failed.")
        }
      }
    }

    void loadSnapshot()
    return () => controller.abort()
  }, [clearKey, rate])

  async function patchStatus(status: "active" | "paused" | "deleted") {
    if (!rate || !snapshotRate || !snapshotReady || !snapshotEtag) return
    setPending(true)
    setError("")
    try {
      const payload = { status }
      const response = await fetch(`/api/partner/directions/${rate.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": snapshotEtag,
          "Idempotency-Key": keyFor("rate-status", { directionId: rate.id, etag: snapshotEtag, payload }),
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(await readResponseError(response, "Could not update the direction status."))
      clearKey("rate-status")
      setConfirmDelete(false)
      onDone()
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed.")
    } finally {
      setPending(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!from || !to || (rate && (!snapshotReady || !snapshotEtag))) return
    setPending(true)
    setError("")
    setSaved(false)
    try {
      let directionId = rate?.id ?? null
      let etag: string | null = rate ? snapshotEtag : null

      if (!rate) {
        const directionPayload = {
          currency_from: { code: from.code, type: from.type },
          currency_to: { code: to.code, type: to.type },
        }
        const created = await fetch("/api/partner/directions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": keyFor("direction-create", directionPayload),
          },
          body: JSON.stringify(directionPayload),
        })
        if (!created.ok) throw new Error(await readResponseError(created, "Could not create the exchange direction."))
        const createdDirection = await created.json() as { id: number }
        directionId = createdDirection.id
        etag = created.headers.get("etag")
      } else {
        const identityChanged = from.code !== snapshotRate?.currency_from.code
          || from.type !== snapshotRate?.currency_from.type
          || to.code !== snapshotRate?.currency_to.code
          || to.type !== snapshotRate?.currency_to.type
        if (identityChanged) {
          const identityPayload = {
            currency_from: { code: from.code, type: from.type },
            currency_to: { code: to.code, type: to.type },
          }
          const updated = await fetch(`/api/partner/directions/${rate.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "If-Match": etag!,
              "Idempotency-Key": keyFor("direction-identity", { directionId: rate.id, etag, payload: identityPayload }),
            },
            body: JSON.stringify(identityPayload),
          })
          if (!updated.ok) throw new Error(await readResponseError(updated, "Could not update the currencies."))
          etag = updated.headers.get("etag")
          if (!etag) throw new Error("The updated rate revision is missing. Refresh and try again.")
          setSnapshotEtag(etag)
          clearKey("direction-identity")
        }
      }

      if (!directionId) throw new Error("The direction ID is missing.")
      if (!etag) throw new Error("The rate revision is missing. Refresh and try again.")
      const ratePayload = {
        buying_rate: rateForRequest(buying),
        selling_rate: rateForRequest(selling),
        comment: comment.trim() || null,
      }
      const rates = await fetch(`/api/partner/directions/${directionId}/rates`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": etag,
          "Idempotency-Key": keyFor("rate-save", { directionId, etag, payload: ratePayload }),
        },
        body: JSON.stringify(ratePayload),
      })
      if (!rates.ok) throw new Error(await readResponseError(rates, "Could not save the exchange rates."))
      const updatedRate = await rates.json() as Rate
      const nextEtag = rates.headers.get("etag")
      if (nextEtag) setSnapshotEtag(nextEtag)
      setSnapshotRate(updatedRate)
      clearKey("rate-save")
      clearKey("direction-create")
      clearKey("direction-identity")

      if (rate) {
        setSaved(true)
        router.refresh()
      } else {
        onDone()
        router.refresh()
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 lg:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-700">
            {rate ? "Edit exchange rate" : "New exchange rate"}
          </h2>
          {rate ? <p className="mt-0.5 text-[11px] text-slate-400">Direction #{rate.id}</p> : null}
        </div>
        <button type="button" onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100" aria-label="Close editor">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)]">
        <ReferenceCombobox<CurrencyReference> kind="currencies" label="From currency" placeholder="Start typing a currency" value={from} onChange={(next) => { setSaved(false); setFrom(next) }} />
        <ArrowRight className="mb-3 hidden h-4 w-4 text-slate-400 sm:block" />
        <ReferenceCombobox<CurrencyReference> kind="currencies" label="To currency" placeholder="Start typing a currency" value={to} onChange={(next) => { setSaved(false); setTo(next) }} />
      </div>

      <div className="mt-3 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)]">
        <label>
          <span className="mb-1 block text-[11px] font-medium text-slate-500">Buying rate</span>
          <input inputMode="decimal" value={buying} onChange={(event) => { setSaved(false); setBuying(event.target.value) }} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-teal-600" />
        </label>
        <ArrowRight className="mb-3 hidden h-4 w-4 text-slate-400 sm:block" />
        <label>
          <span className="mb-1 block text-[11px] font-medium text-slate-500">Selling rate</span>
          <input inputMode="decimal" value={selling} onChange={(event) => { setSaved(false); setSelling(event.target.value) }} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-teal-600" />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-[11px] font-medium text-slate-500">Comment</span>
        <textarea rows={2} maxLength={5000} value={comment} onChange={(event) => { setSaved(false); setComment(event.target.value) }} className="min-h-10 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-teal-600" />
      </label>

      {error ? <p className="mt-3 text-[12px] text-rose-700">{error}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
        {rate ? (
          <button type="button" disabled={pending || !snapshotReady} onClick={() => void patchStatus(snapshotRate?.status === "active" ? "paused" : "active")} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[12px] text-slate-600 hover:border-teal-600 disabled:opacity-50">
            {snapshotRate?.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {snapshotRate?.status === "active" ? "Pause" : "Resume"}
          </button>
        ) : null}
        {rate && !confirmDelete ? (
          <button type="button" disabled={pending || !snapshotReady} onClick={() => setConfirmDelete(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-[12px] text-rose-700 hover:bg-rose-50 disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" />Delete
          </button>
        ) : null}
        {rate && confirmDelete ? (
          <div className="flex h-9 items-center gap-2 rounded-lg bg-rose-50 px-3 text-[11px] text-slate-600">
            <span>Delete?</span>
            <button type="button" disabled={pending} onClick={() => void patchStatus("deleted")} className="font-medium text-rose-700">Yes</button>
            <button type="button" disabled={pending} onClick={() => setConfirmDelete(false)}>No</button>
          </div>
        ) : null}
        {saved ? (
          <span role="status" className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />Changes saved
          </span>
        ) : null}
        <button disabled={pending || !snapshotReady || !from || !to} className={`${saved ? "" : "ml-auto"} inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-5 text-[12px] font-medium text-white hover:bg-teal-800 disabled:bg-slate-300`}>
          <Check className="h-4 w-4" />{pending ? "Saving…" : rate ? "Save changes" : "Create rate"}
        </button>
      </div>
    </form>
  )
}

export default function RatesWorkspace({ rates, pagination }: { rates: Rate[]; pagination?: ReactNode }) {
  const [editor, setEditor] = useState<{ kind: "create" } | { kind: "edit"; id: number } | null>(null)
  const selectedRate = editor?.kind === "edit" ? rates.find((rate) => rate.id === editor.id) ?? null : null

  return (
    <PartnerTwoColumnLayout
      left={<section className="rounded-xl border border-slate-200 bg-white p-3">
        <button type="button" onClick={() => setEditor({ kind: "create" })} className="mb-3 inline-flex h-9 items-center gap-2 rounded-lg bg-teal-700 px-3.5 text-[12px] font-medium text-white hover:bg-teal-800">
          <Plus className="h-4 w-4" />Add exchange rate
        </button>
        <div className="space-y-1.5">
          {rates.map((rate) => {
            const selected = editor?.kind === "edit" && editor.id === rate.id
            return (
              <button key={rate.id} type="button" onClick={() => setEditor({ kind: "edit", id: rate.id })} className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${selected ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <CurrencyIdentity currency={rate.currency_from} className="flex-1 text-[13px] font-semibold uppercase tracking-[0.02em] text-slate-700" />
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />
                  <CurrencyIdentity currency={rate.currency_to} className="flex-1 text-[13px] font-semibold uppercase tracking-[0.02em] text-slate-700" />
                </div>
                <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-3 text-[11px] text-slate-500">
                  <span><span className="text-slate-400">BUY</span> {editableRate(rate.buying_rate) || "—"}</span>
                  <span><span className="text-slate-400">SELL</span> {editableRate(rate.selling_rate) || "—"}</span>
                  <span className={`ml-auto rounded-md px-1.5 py-0.5 ${rate.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{rate.status}</span>
                </div>
              </button>
            )
          })}
          {!rates.length ? <p className="py-8 text-center text-[12px] text-slate-500">No exchange rates yet.</p> : null}
        </div>
        {pagination}
      </section>}
      right={<section className="min-w-0">
        {editor?.kind === "create" ? (
          <RateForm key="create" mode={{ kind: "create" }} onDone={() => setEditor(null)} onCancel={() => setEditor(null)} />
        ) : selectedRate ? (
          <RateForm key={selectedRate.id} mode={{ kind: "edit", rate: selectedRate }} onDone={() => setEditor(null)} onCancel={() => setEditor(null)} />
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 text-center text-[13px] text-slate-500">
            Select an exchange rate to edit it, or add a new one.
          </div>
        )}
      </section>}
    />
  )
}
