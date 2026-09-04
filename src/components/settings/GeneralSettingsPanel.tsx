"use client"

// Purpose: Edit the organization identity and public presentation through Partner API.

import { Building2, FileImage, Globe2, Upload } from "lucide-react"
import { type ChangeEvent, type FormEvent, useMemo, useRef, useState } from "react"

import { partnerMutation } from "@/lib/client-partner-mutation"
import type { Organization, OrganizationProfile } from "@/lib/types"

const labelClass = "mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400"
const inputClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-teal-600"
const textareaClass = `${inputClass} h-auto min-h-20 resize-y py-2 leading-5`

export default function GeneralSettingsPanel({
  initialOrganization,
  initialOrganizationEtag,
  initialProfile,
  initialProfileEtag,
}: {
  initialOrganization: Organization
  initialOrganizationEtag: string | null
  initialProfile: OrganizationProfile
  initialProfileEtag: string | null
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [organization, setOrganization] = useState(initialOrganization)
  const [profile, setProfile] = useState(initialProfile)
  const [organizationEtag, setOrganizationEtag] = useState(initialOrganizationEtag)
  const [profileEtag, setProfileEtag] = useState(initialProfileEtag)
  const [name, setName] = useState(initialOrganization.name)
  const [slug, setSlug] = useState(initialOrganization.slug)
  const [description, setDescription] = useState(initialProfile.description || "")
  const [website, setWebsite] = useState(initialProfile.website || "")
  const [note, setNote] = useState(initialProfile.note || "")
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  const identityChanged = name.trim() !== organization.name || slug.trim() !== organization.slug
  const profileChanged = description.trim() !== (profile.description || "")
    || website.trim() !== (profile.website || "")
    || note.trim() !== (profile.note || "")
  const changed = identityChanged || profileChanged

  function showSaved() {
    setFeedback({ tone: "ok", text: "Changes saved" })
    window.setTimeout(() => setFeedback((current) => current?.tone === "ok" ? null : current), 2400)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!changed || busy) return
    setBusy(true)
    setFeedback(null)
    try {
      if (identityChanged) {
        const result = await partnerMutation<Organization>({
          path: "/organization",
          method: "PATCH",
          body: { name: name.trim(), slug: slug.trim() },
          etag: organizationEtag,
          fallbackError: "Organization details could not be saved.",
        })
        setOrganization(result.data)
        setOrganizationEtag(result.etag)
        setName(result.data.name)
        setSlug(result.data.slug)
      }
      if (profileChanged) {
        const result = await partnerMutation<OrganizationProfile>({
          path: "/organization/profile",
          method: "PATCH",
          body: {
            description: description.trim() || null,
            website: website.trim() || null,
            note: note.trim() || null,
          },
          etag: profileEtag,
          fallbackError: "Public profile could not be saved.",
        })
        setProfile(result.data)
        setProfileEtag(result.etag)
        setDescription(result.data.description || "")
        setWebsite(result.data.website || "")
        setNote(result.data.note || "")
      }
      showSaved()
    } catch (reason) {
      setFeedback({ tone: "error", text: reason instanceof Error ? reason.message : "Changes could not be saved." })
    } finally {
      setBusy(false)
    }
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || busy) return
    setBusy(true)
    setFeedback(null)
    try {
      const body = new FormData()
      body.set("file", file)
      const result = await partnerMutation<OrganizationProfile>({
        path: "/organization/profile/logo",
        method: "POST",
        body,
        etag: profileEtag,
        fallbackError: "The logo could not be uploaded.",
      })
      setProfile(result.data)
      setProfileEtag(result.etag)
      showSaved()
    } catch (reason) {
      setFeedback({ tone: "error", text: reason instanceof Error ? reason.message : "The logo could not be uploaded." })
    } finally {
      event.target.value = ""
      setBusy(false)
    }
  }

  const logoMeta = useMemo(() => {
    if (!profile.logo_filename) return "No uploaded logo"
    const size = profile.logo_size_bytes ? ` · ${Math.max(1, Math.round(profile.logo_size_bytes / 1024))} KB` : ""
    return `${profile.logo_filename}${size}`
  }, [profile.logo_filename, profile.logo_size_bytes])

  return (
    <form onSubmit={save} className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-slate-600">
          <Building2 className="h-4 w-4 text-slate-400" />Organization
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Organization name</label>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={255} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Public short URL</label>
            <div className="flex h-10 items-center rounded-lg border border-slate-300 bg-white pl-3 focus-within:border-teal-600">
              <span className="text-[12px] text-slate-400">/</span>
              <input value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} maxLength={16} className="h-full min-w-0 flex-1 bg-transparent px-1.5 text-[13px] text-slate-700 outline-none" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-slate-600">
          <Globe2 className="h-4 w-4 text-slate-400" />Public profile
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Public description</label>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10000} rows={3} placeholder="A short description of the organization" className={textareaClass} />
          </div>
          <div className="max-w-lg">
            <label className={labelClass}>Website</label>
            <input value={website} onChange={(event) => setWebsite(event.target.value)} maxLength={500} placeholder="https://example.com" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Additional public note</label>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={10000} rows={2} className={textareaClass} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
            {profile.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/partner/organization/profile/logo?v=${encodeURIComponent(profile.updated_at)}`} alt="Organization logo" className="h-full w-full object-cover" />
            ) : <FileImage className="h-5 w-5 text-slate-300" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-slate-600">Logo</div>
            <div className="mt-0.5 truncate text-[10px] text-slate-400">{logoMeta}</div>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadLogo} className="hidden" />
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 text-[12px] text-sky-700 hover:border-sky-300 disabled:opacity-50">
            <Upload className="h-4 w-4" />Upload logo
          </button>
        </div>
      </section>

      <div className="flex min-h-9 flex-wrap items-center justify-center gap-3">
        {feedback ? <span className={`text-[11px] ${feedback.tone === "ok" ? "text-emerald-700" : "text-rose-700"}`}>{feedback.text}</span> : null}
        <button disabled={!changed || busy} className="h-9 rounded-lg bg-teal-700 px-5 text-[12px] font-medium text-white disabled:bg-slate-300">{busy ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  )
}
