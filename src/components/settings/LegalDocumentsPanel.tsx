"use client"

// Purpose: Manage legal-document uploads and review-package document state.

import { Download, FileText, Trash2, Upload } from "lucide-react"
import { type ChangeEvent, useRef, useState } from "react"

import SelectDropdown from "@/components/SelectDropdown"
import { etagForUpdatedAt, partnerMutation } from "@/lib/client-partner-mutation"
import { readResponseError } from "@/lib/http-response-error"
import type { LegalDocument, LegalSnapshot } from "@/lib/types"

const DOCUMENT_LABELS: Record<LegalDocument["document_type"], string> = {
  company_registration: "Company registration",
  license: "License",
  owner_identity: "Owner identity",
  address_proof: "Address proof",
  logo: "Logo",
  other: "Other document",
}

const DOCUMENT_TYPE_OPTIONS = [
  { value: "company_registration", label: "Registration" },
  { value: "license", label: "License" },
  { value: "other", label: "Other" },
] as const

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private" },
  { value: "public_after_approval", label: "Public after approval" },
] as const

function bytesLabel(value: number | null) {
  if (!value) return ""
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export default function LegalDocumentsPanel({
  snapshot,
  snapshotEtag,
  editable,
  onSnapshot,
}: {
  snapshot: LegalSnapshot
  snapshotEtag: string | null
  editable: boolean
  onSnapshot: (snapshot: LegalSnapshot, etag: string | null) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<"company_registration" | "license" | "other">("company_registration")
  const [visibility, setVisibility] = useState<"private" | "public_after_approval">("private")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  async function refreshSnapshot() {
    const response = await fetch("/api/partner/organization/legal?locale=en", { cache: "no-store" })
    if (!response.ok) throw new Error(await readResponseError(response, "Legal settings could not be refreshed."))
    const next = await response.json() as LegalSnapshot
    onSnapshot(next, response.headers.get("etag"))
  }

  async function upload() {
    if (!file || busyId) return
    setBusyId("upload")
    setFeedback(null)
    try {
      const body = new FormData()
      body.set("file", file)
      body.set("document_type", documentType)
      body.set("visibility", visibility)
      await partnerMutation<LegalDocument>({
        path: "/organization/legal/documents",
        method: "POST",
        body,
        etag: snapshotEtag,
        fallbackError: "The document could not be uploaded.",
      })
      await refreshSnapshot()
      setFile(null)
      if (fileRef.current) fileRef.current.value = ""
      setFeedback({ tone: "ok", text: "Document uploaded" })
    } catch (reason) {
      setFeedback({ tone: "error", text: reason instanceof Error ? reason.message : "The document could not be uploaded." })
    } finally {
      setBusyId(null)
    }
  }

  async function updateDocument(document: LegalDocument, action: "visibility" | "retirement" | "delete") {
    if (busyId) return
    setBusyId(`${action}-${document.id}`)
    setFeedback(null)
    try {
      if (action === "delete") {
        await partnerMutation<{ ok: boolean }>({
          path: `/organization/legal/documents/${document.id}`,
          method: "DELETE",
          etag: etagForUpdatedAt(document.updated_at),
          fallbackError: "The document could not be deleted.",
        })
        setConfirmDeleteId(null)
      } else if (action === "visibility") {
        await partnerMutation<LegalDocument>({
          path: `/organization/legal/documents/${document.id}`,
          method: "PATCH",
          body: { visibility: document.visibility === "private" ? "public_after_approval" : "private" },
          etag: etagForUpdatedAt(document.updated_at),
          fallbackError: "Document visibility could not be changed.",
        })
      } else {
        await partnerMutation<LegalDocument>({
          path: `/organization/legal/documents/${document.id}/retirement`,
          method: "PATCH",
          body: { retirement_requested: !document.retirement_requested },
          etag: etagForUpdatedAt(document.updated_at),
          fallbackError: "The retirement request could not be changed.",
        })
      }
      await refreshSnapshot()
    } catch (reason) {
      setFeedback({ tone: "error", text: reason instanceof Error ? reason.message : "The document could not be changed." })
    } finally {
      setBusyId(null)
    }
  }

  const currentIds = new Set(snapshot.current_documents.map((document) => document.id))
  const documents = [...snapshot.application_documents, ...snapshot.current_documents.filter((document) => !snapshot.application_documents.some((candidate) => candidate.id === document.id))]

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-slate-600"><FileText className="h-4 w-4 text-slate-400" />Legal documents</div>
      {editable ? (
        <div className="grid gap-2 rounded-lg bg-slate-50/70 p-2.5 md:grid-cols-2 min-[1450px]:grid-cols-[minmax(0,1fr)_140px_165px_auto] min-[1450px]:items-end">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-400">File</label>
            <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] || null)} className="block h-9 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-[10px] file:text-slate-600" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-400">Type</label>
            <SelectDropdown value={documentType} options={DOCUMENT_TYPE_OPTIONS} onChange={setDocumentType} ariaLabel="Document type" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-400">Visibility</label>
            <SelectDropdown value={visibility} options={VISIBILITY_OPTIONS} onChange={setVisibility} ariaLabel="Document visibility" minimumMenuWidth={220} />
          </div>
          <button type="button" disabled={!file || Boolean(busyId)} onClick={() => void upload()} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-sky-700 px-3 text-[11px] font-medium text-white disabled:bg-slate-300 min-[1450px]:w-auto"><Upload className="h-3.5 w-3.5" />Upload</button>
        </div>
      ) : null}

      <div className="mt-2 space-y-1.5">
        {documents.map((document) => {
          const inCurrent = currentIds.has(document.id)
          const pending = busyId?.endsWith(`-${document.id}`)
          const deletable = editable && !inCurrent
          return (
            <article key={document.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1"><div className="truncate text-[12px] font-medium text-slate-600">{document.original_filename}</div><div className="mt-0.5 text-[10px] text-slate-400">{DOCUMENT_LABELS[document.document_type]}{document.size_bytes ? ` · ${bytesLabel(document.size_bytes)}` : ""}</div></div>
                <span className={`rounded-full px-2 py-1 text-[9px] ${document.status === "accepted" ? "bg-emerald-50 text-emerald-700" : document.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500"}`}>{document.status.replaceAll("_", " ")}</span>
                <a href={`/api/partner/organization/legal/documents/${document.id}/content`} target="_blank" rel="noreferrer" aria-label="Download document" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-sky-700"><Download className="h-4 w-4" /></a>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                <button type="button" disabled={!editable || pending} onClick={() => void updateDocument(document, "visibility")} className="rounded-md bg-slate-100 px-2 py-1 text-slate-500 disabled:opacity-50">{document.visibility === "private" ? "Private" : "Public after approval"}</button>
                {inCurrent && document.status === "accepted" ? <button type="button" disabled={!editable || pending} onClick={() => void updateDocument(document, "retirement")} className={`rounded-md px-2 py-1 ${document.retirement_requested ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{document.retirement_requested ? "Keep document" : "Request retirement"}</button> : null}
                {deletable ? confirmDeleteId === document.id ? <div className="ml-auto inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-rose-700"><span>Delete?</span><button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded px-1.5 py-0.5 hover:bg-white">No</button><button type="button" disabled={pending} onClick={() => void updateDocument(document, "delete")} className="rounded bg-rose-600 px-1.5 py-0.5 text-white">Yes</button></div> : <button type="button" disabled={pending} onClick={() => setConfirmDeleteId(document.id)} className="ml-auto inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-rose-700"><Trash2 className="h-3 w-3" />Delete</button> : null}
              </div>
            </article>
          )
        })}
        {!documents.length ? <div className="py-5 text-center text-[11px] text-slate-400">No legal documents uploaded.</div> : null}
      </div>
      {feedback ? <p className={`mt-2 text-[11px] ${feedback.tone === "ok" ? "text-emerald-700" : "text-rose-700"}`}>{feedback.text}</p> : null}
    </section>
  )
}
