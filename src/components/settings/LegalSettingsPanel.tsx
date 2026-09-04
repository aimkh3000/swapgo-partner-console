"use client"

// Purpose: Edit, document, submit, and review organization legal data through Partner API.

import { CheckCircle2, FileCheck2, Send, XCircle } from "lucide-react"
import { type FormEvent, useMemo, useState } from "react"

import LegalDocumentsPanel from "@/components/settings/LegalDocumentsPanel"
import ReferenceCombobox from "@/components/ReferenceCombobox"
import { partnerMutation } from "@/lib/client-partner-mutation"
import type { LegalSnapshot, LocationReference } from "@/lib/types"

type LegalDraft = {
  legal_name: string
  registration_number: string
  registration_authority_name: string
  registration_lookup_url: string
  owner_note: string
  country: LocationReference | null
}

const inputClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-teal-600 disabled:bg-slate-50 disabled:text-slate-400"
const labelClass = "mb-1 block text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400"

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes requested",
  cancelled_by_owner: "Cancelled",
}

function countryReference(snapshot: LegalSnapshot): LocationReference | null {
  const source = snapshot.application || snapshot.current
  if (!source.country_iso3) return null
  return {
    kind: "country",
    name: source.country_name || source.country_iso3,
    wikidata_id: `country:${source.country_iso3}`,
    slug: null,
    iso3: source.country_iso3,
    country_wikidata_id: `country:${source.country_iso3}`,
    country_name: source.country_name,
    country_emoji: source.country_emoji,
    latitude: null,
    longitude: null,
  }
}

function draftFrom(snapshot: LegalSnapshot): LegalDraft {
  const source = snapshot.application || snapshot.current
  return {
    legal_name: source.legal_name || "",
    registration_number: source.registration_number || "",
    registration_authority_name: source.registration_authority_name || "",
    registration_lookup_url: source.registration_lookup_url || "",
    owner_note: "owner_note" in source ? source.owner_note || "" : "",
    country: countryReference(snapshot),
  }
}

function canEdit(status: string | null | undefined) {
  return !status || status === "draft" || status === "changes_requested" || status === "rejected"
}

function canCancel(status: string | null | undefined) {
  return status === "draft" || status === "submitted" || status === "changes_requested" || status === "rejected"
}

export default function LegalSettingsPanel({
  initialSnapshot,
  initialEtag,
}: {
  initialSnapshot: LegalSnapshot
  initialEtag: string | null
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [etag, setEtag] = useState(initialEtag)
  const [draft, setDraft] = useState(() => draftFrom(initialSnapshot))
  const [busy, setBusy] = useState<"save" | "submit" | "cancel" | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const editable = canEdit(snapshot.application?.status)
  const cancellable = canCancel(snapshot.application?.status)
  const initialDraft = useMemo(() => draftFrom(snapshot), [snapshot])
  const changed = JSON.stringify({ ...draft, country: draft.country?.iso3 || null }) !== JSON.stringify({ ...initialDraft, country: initialDraft.country?.iso3 || null })
  const hasSavedApplicationWork = Boolean(
    snapshot.application
    && (
      snapshot.application.changed_fields.length > 0
      || snapshot.application_documents.length > 0
      || snapshot.current_documents.some((document) => document.retirement_requested)
    )
  )
  const submittable = editable && (changed || hasSavedApplicationWork)

  function acceptSnapshot(next: LegalSnapshot, nextEtag: string | null) {
    setSnapshot(next)
    setEtag(nextEtag)
    setDraft(draftFrom(next))
  }

  async function saveDraft(): Promise<{ snapshot: LegalSnapshot; etag: string | null }> {
    const result = await partnerMutation<LegalSnapshot>({
      path: "/organization/legal?locale=en",
      method: "PATCH",
      body: {
        legal_name: draft.legal_name.trim() || null,
        registration_number: draft.registration_number.trim() || null,
        registration_authority_name: draft.registration_authority_name.trim() || null,
        registration_lookup_url: draft.registration_lookup_url.trim() || null,
        country_iso3: draft.country?.iso3 || null,
        owner_note: draft.owner_note.trim() || null,
      },
      etag,
      fallbackError: "The legal draft could not be saved.",
    })
    acceptSnapshot(result.data, result.etag)
    return { snapshot: result.data, etag: result.etag }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!changed || busy || !editable) return
    setBusy("save")
    setFeedback(null)
    try {
      await saveDraft()
      setFeedback({ tone: "ok", text: "Draft saved" })
    } catch (reason) {
      setFeedback({ tone: "error", text: reason instanceof Error ? reason.message : "The legal draft could not be saved." })
    } finally {
      setBusy(null)
    }
  }

  async function submit() {
    if (busy || !submittable) return
    if (!draft.legal_name.trim()) {
      setFeedback({ tone: "error", text: "Enter the legal name before submitting." })
      return
    }
    setBusy("submit")
    setFeedback(null)
    try {
      const base = changed ? await saveDraft() : { snapshot, etag }
      const result = await partnerMutation<{ ok: boolean; snapshot: LegalSnapshot }>({
        path: "/organization/legal/submit?locale=en",
        method: "POST",
        etag: base.etag,
        fallbackError: "The legal update could not be submitted.",
      })
      acceptSnapshot(result.data.snapshot, result.etag)
      setFeedback({ tone: "ok", text: "Submitted for review" })
    } catch (reason) {
      setFeedback({ tone: "error", text: reason instanceof Error ? reason.message : "The legal update could not be submitted." })
    } finally {
      setBusy(null)
    }
  }

  async function cancelApplication() {
    if (busy || !cancellable) return
    setBusy("cancel")
    setFeedback(null)
    try {
      const result = await partnerMutation<{ ok: boolean; snapshot: LegalSnapshot }>({
        path: "/organization/legal/cancel?locale=en",
        method: "POST",
        etag,
        fallbackError: "The legal draft could not be cancelled.",
      })
      acceptSnapshot(result.data.snapshot, result.etag)
      setConfirmCancel(false)
      setFeedback({ tone: "ok", text: "Draft cancelled" })
    } catch (reason) {
      setFeedback({ tone: "error", text: reason instanceof Error ? reason.message : "The legal draft could not be cancelled." })
    } finally {
      setBusy(null)
    }
  }

  const status = snapshot.application?.status || snapshot.current.verification_status
  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto xl:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)] xl:grid-rows-[minmax(0,1fr)] xl:overflow-hidden">
      <form onSubmit={save} className="min-w-0 space-y-3 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:pr-3">
        {snapshot.application?.review_comment || snapshot.current.review_comment ? <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-[12px] leading-5 text-amber-800"><span className="font-medium">Review note:</span> {snapshot.application?.review_comment || snapshot.current.review_comment}</div> : null}
        <section className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="text-[13px] font-medium text-slate-600">Legal information</div>
            <span className={`rounded-full px-2 py-1 text-[9px] ${status === "approved" ? "bg-emerald-50 text-emerald-700" : status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700"}`}>{STATUS_LABELS[status || ""] || "Not submitted"}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className={labelClass}>Legal name</label><input value={draft.legal_name} onChange={(event) => setDraft((current) => ({ ...current, legal_name: event.target.value }))} disabled={!editable} maxLength={255} className={inputClass} /></div>
            <div><label className={labelClass}>Registration number</label><input value={draft.registration_number} onChange={(event) => setDraft((current) => ({ ...current, registration_number: event.target.value }))} disabled={!editable} maxLength={128} className={inputClass} /></div>
            <div><label className={labelClass}>Registration authority</label><input value={draft.registration_authority_name} onChange={(event) => setDraft((current) => ({ ...current, registration_authority_name: event.target.value }))} disabled={!editable} maxLength={255} className={inputClass} /></div>
            <div className="sm:col-span-2"><label className={labelClass}>Public registry URL</label><input value={draft.registration_lookup_url} onChange={(event) => setDraft((current) => ({ ...current, registration_lookup_url: event.target.value }))} disabled={!editable} maxLength={1000} placeholder="https://registry.example/organization" className={inputClass} /></div>
            <div className="sm:col-span-2"><ReferenceCombobox<LocationReference> kind="locations" label="Country" placeholder="Start typing a country" value={draft.country} onChange={(country) => setDraft((current) => ({ ...current, country }))} countryOnly /></div>
            <div className="sm:col-span-2"><label className={labelClass}>Note for review</label><textarea value={draft.owner_note} onChange={(event) => setDraft((current) => ({ ...current, owner_note: event.target.value }))} disabled={!editable} maxLength={10000} rows={2} className={`${inputClass} h-auto min-h-16 resize-y py-2 leading-5`} /></div>
          </div>
        </section>

        <LegalDocumentsPanel snapshot={snapshot} snapshotEtag={etag} editable={editable} onSnapshot={acceptSnapshot} />

        <div className="flex min-h-10 flex-wrap items-center justify-center gap-2">
          {feedback ? <span className={`mr-1 text-[11px] ${feedback.tone === "ok" ? "text-emerald-700" : "text-rose-700"}`}>{feedback.text}</span> : null}
          {cancellable ? confirmCancel ? <div className="inline-flex h-9 items-center gap-1 rounded-lg bg-rose-50 px-2 text-[11px] text-rose-700"><span>Cancel draft?</span><button type="button" onClick={() => setConfirmCancel(false)} className="h-7 rounded-md px-2 hover:bg-white">No</button><button type="button" onClick={() => void cancelApplication()} className="h-7 rounded-md bg-rose-600 px-2 text-white">Yes</button></div> : <button type="button" onClick={() => setConfirmCancel(true)} className="h-9 rounded-lg px-3 text-[11px] text-rose-700 hover:bg-rose-50">Cancel draft</button> : null}
          {editable ? <button type="submit" disabled={!changed || Boolean(busy)} className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-[12px] text-slate-600 disabled:opacity-40">{busy === "save" ? "Saving…" : "Save draft"}</button> : null}
          {editable ? <button type="button" disabled={Boolean(busy) || !submittable} onClick={() => void submit()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-4 text-[12px] font-medium text-white disabled:bg-slate-300"><Send className="h-3.5 w-3.5" />{busy === "submit" ? "Submitting…" : "Submit for review"}</button> : null}
        </div>
      </form>

      <aside className="min-w-0 space-y-3 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:pr-3">
        <section className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-slate-600"><FileCheck2 className="h-4 w-4 text-slate-400" />Current approved data</div>
          <dl className="space-y-2">
            {[
              ["Legal name", snapshot.current.legal_name],
              ["Registration number", snapshot.current.registration_number],
              ["Registration authority", snapshot.current.registration_authority_name],
              ["Country", [snapshot.current.country_emoji, snapshot.current.country_name || snapshot.current.country_iso3].filter(Boolean).join(" ")],
            ].map(([label, value]) => value ? <div key={label} className="rounded-lg bg-slate-50/70 px-3 py-2"><dt className="text-[9px] uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-0.5 break-words text-[12px] text-slate-600">{value}</dd></div> : null)}
          </dl>
          {!snapshot.current.legal_name ? <p className="py-4 text-center text-[11px] text-slate-400">No approved legal data yet.</p> : null}
        </section>
        <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-[11px] leading-5 text-slate-500">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-slate-600">{snapshot.current.verification_status === "approved" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-slate-400" />}Review flow</div>
          <p>Approved information remains public while a new draft is reviewed. Save the draft, attach supporting files when required, then submit it to SwapGo.me.</p>
          {snapshot.application?.changed_fields.length ? <p className="mt-2">Changed fields: {snapshot.application.changed_fields.map((field) => field.replaceAll("_", " ")).join(", ")}.</p> : null}
        </section>
      </aside>
    </div>
  )
}
