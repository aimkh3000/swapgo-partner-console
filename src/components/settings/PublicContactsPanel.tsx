"use client"

// Purpose: Edit public contacts and weekly working hours as one profile revision.

import { Clock3, Plus, Star, Trash2 } from "lucide-react"
import { type FormEvent, useMemo, useState } from "react"

import { partnerMutation } from "@/lib/client-partner-mutation"
import type { OrganizationContact, OrganizationProfile, WorkingHoursDay } from "@/lib/types"
import ContactTypeDropdown from "@/components/settings/ContactTypeDropdown"

type EditableContact = OrganizationContact & { clientId: string }

const DAYS: Array<{ value: WorkingHoursDay["day"]; label: string }> = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
]

const inputClass = "h-9 min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 text-[12px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-teal-600"

function freshContact(): EditableContact {
  return {
    clientId: crypto.randomUUID(),
    type: "phone",
    value: "",
    label: null,
    url: null,
    is_primary: false,
    note: null,
  }
}

function buildHours(profile: OrganizationProfile): WorkingHoursDay[] {
  const byDay = new Map((profile.working_hours?.items || []).map((item) => [item.day, item]))
  return DAYS.map(({ value }) => byDay.get(value) || {
    day: value,
    is_open: false,
    open_time: null,
    close_time: null,
    note: null,
  })
}

function serializedContact(contact: OrganizationContact) {
  return {
    type: contact.type,
    value: contact.value.trim(),
    label: contact.label?.trim() || null,
    note: contact.note?.trim() || null,
    url: null,
    is_primary: contact.is_primary,
  }
}

export default function PublicContactsPanel({
  initialProfile,
  initialProfileEtag,
}: {
  initialProfile: OrganizationProfile
  initialProfileEtag: string | null
}) {
  const [profile, setProfile] = useState(initialProfile)
  const [etag, setEtag] = useState(initialProfileEtag)
  const [contacts, setContacts] = useState<EditableContact[]>(() => (initialProfile.contacts?.items || []).map((contact, index) => ({ ...contact, clientId: `initial-${index}` })))
  const [hours, setHours] = useState<WorkingHoursDay[]>(() => buildHours(initialProfile))
  const [timezone, setTimezone] = useState(initialProfile.working_hours?.timezone || "")
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  const payloadContacts = useMemo(() => contacts.filter((contact) => contact.value.trim()).map(serializedContact), [contacts])
  const payloadHours = useMemo(() => hours.map((item) => ({
    ...item,
    open_time: item.is_open ? item.open_time || null : null,
    close_time: item.is_open ? item.close_time || null : null,
    note: item.note?.trim() || null,
  })), [hours])
  const currentFingerprint = JSON.stringify({ contacts: payloadContacts, hours: { timezone: timezone.trim() || null, items: payloadHours } })
  const initialFingerprint = JSON.stringify({
    contacts: (profile.contacts?.items || []).map(serializedContact),
    hours: { timezone: profile.working_hours?.timezone || null, items: buildHours(profile) },
  })
  const changed = currentFingerprint !== initialFingerprint

  function updateContact(clientId: string, patch: Partial<EditableContact>) {
    setContacts((current) => current.map((item) => {
      if (item.clientId !== clientId) {
        return patch.is_primary ? { ...item, is_primary: false } : item
      }
      return { ...item, ...patch }
    }))
  }

  function updateDay(day: WorkingHoursDay["day"], patch: Partial<WorkingHoursDay>) {
    setHours((current) => current.map((item) => item.day === day ? { ...item, ...patch } : item))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!changed || busy) return
    setBusy(true)
    setFeedback(null)
    try {
      const result = await partnerMutation<OrganizationProfile>({
        path: "/organization/profile",
        method: "PATCH",
        body: {
          contacts: { items: payloadContacts },
          working_hours: { timezone: timezone.trim() || null, items: payloadHours },
        },
        etag,
        fallbackError: "Contacts and working hours could not be saved.",
      })
      setProfile(result.data)
      setEtag(result.etag)
      setContacts((result.data.contacts?.items || []).map((contact, index) => ({ ...contact, clientId: `saved-${index}` })))
      setHours(buildHours(result.data))
      setTimezone(result.data.working_hours?.timezone || "")
      setFeedback({ tone: "ok", text: "Changes saved" })
      window.setTimeout(() => setFeedback((current) => current?.tone === "ok" ? null : current), 2400)
    } catch (reason) {
      setFeedback({ tone: "error", text: reason instanceof Error ? reason.message : "Changes could not be saved." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="grid h-full min-h-0 gap-3 overflow-y-auto xl:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)] xl:grid-rows-[minmax(0,1fr)] xl:overflow-hidden">
      <section className="min-w-0 space-y-2 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:pr-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-[13px] font-medium text-slate-600">Public contacts</div>
            <button type="button" onClick={() => setContacts((current) => [...current, freshContact()])} className="inline-flex h-8 items-center gap-1 rounded-lg border border-sky-200 bg-white px-2.5 text-[11px] text-sky-700 hover:border-sky-300">
              <Plus className="h-3.5 w-3.5" />Add contact
            </button>
          </div>
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div key={contact.clientId} className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
                <div className="grid min-w-0 gap-2 sm:grid-cols-[124px_minmax(0,1fr)_auto]">
                  <ContactTypeDropdown value={contact.type} onChange={(type) => updateContact(contact.clientId, { type })} />
                  <input value={contact.value} onChange={(event) => updateContact(contact.clientId, { value: event.target.value })} maxLength={500} placeholder="Contact value" className={inputClass} />
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" aria-label="Set as primary" title="Set as primary" onClick={() => updateContact(contact.clientId, { is_primary: !contact.is_primary })} className={`flex h-9 w-9 items-center justify-center rounded-lg ${contact.is_primary ? "bg-amber-50 text-amber-600" : "text-slate-300 hover:bg-slate-50 hover:text-slate-500"}`}><Star className="h-4 w-4" fill={contact.is_primary ? "currentColor" : "none"} /></button>
                    <button type="button" aria-label="Remove contact" onClick={() => setContacts((current) => current.filter((item) => item.clientId !== contact.clientId))} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input value={contact.label || ""} onChange={(event) => updateContact(contact.clientId, { label: event.target.value })} maxLength={255} placeholder="Public label (optional)" className={inputClass} />
                  <input value={contact.note || ""} onChange={(event) => updateContact(contact.clientId, { note: event.target.value })} maxLength={1000} placeholder="Note (optional)" className={inputClass} />
                </div>
              </div>
            ))}
            {!contacts.length ? <div className="py-8 text-center text-[12px] text-slate-400">No public contacts added.</div> : null}
          </div>
        </div>
      </section>

      <aside className="min-w-0 space-y-3 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:pr-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="mb-3 flex items-center justify-center gap-2 text-[13px] font-medium text-slate-600"><Clock3 className="h-4 w-4 text-slate-400" />Working hours</div>
          <div className="space-y-1.5">
            {hours.map((item) => (
              <div key={item.day} className="grid grid-cols-[minmax(0,1fr)_38px] items-center gap-2 rounded-lg bg-slate-50/70 px-2 py-1.5 sm:grid-cols-[76px_38px_minmax(0,1fr)]">
                <span className="text-[11px] text-slate-500">{DAYS.find((day) => day.value === item.day)?.label}</span>
                <button type="button" onClick={() => updateDay(item.day, { is_open: !item.is_open })} aria-pressed={item.is_open} className={`relative h-5 w-9 rounded-full transition-colors ${item.is_open ? "bg-emerald-500" : "bg-slate-200"}`}><span className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${item.is_open ? "translate-x-[18px]" : "translate-x-0.5"}`} /></button>
                <div className="col-span-2 flex min-w-0 items-center gap-1 sm:col-span-1">
                  <input type="time" value={item.open_time || ""} onChange={(event) => updateDay(item.day, { open_time: event.target.value })} disabled={!item.is_open} className={`${inputClass} w-full px-1.5 disabled:bg-slate-50 disabled:text-slate-300`} />
                  <span className="text-slate-300">–</span>
                  <input type="time" value={item.close_time || ""} onChange={(event) => updateDay(item.day, { close_time: event.target.value })} disabled={!item.is_open} className={`${inputClass} w-full px-1.5 disabled:bg-slate-50 disabled:text-slate-300`} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">Timezone</label>
            <input value={timezone} onChange={(event) => setTimezone(event.target.value)} maxLength={64} placeholder="Europe/Kyiv" className={`${inputClass} w-full`} />
          </div>
        </div>
        <div className="flex min-h-9 flex-wrap items-center justify-center gap-3">
          {feedback ? <span className={`text-[11px] ${feedback.tone === "ok" ? "text-emerald-700" : "text-rose-700"}`}>{feedback.text}</span> : null}
          <button disabled={!changed || busy} className="h-9 rounded-lg bg-teal-700 px-5 text-[12px] font-medium text-white disabled:bg-slate-300">{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </aside>
    </form>
  )
}
