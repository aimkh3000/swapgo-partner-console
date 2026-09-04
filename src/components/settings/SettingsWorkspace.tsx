// Purpose: Compose Partner Console settings with the same column language as reviews.

import Link from "next/link"

import GeneralSettingsPanel from "@/components/settings/GeneralSettingsPanel"
import LegalSettingsPanel from "@/components/settings/LegalSettingsPanel"
import PublicContactsPanel from "@/components/settings/PublicContactsPanel"
import PartnerTwoColumnLayout from "@/components/PartnerTwoColumnLayout"
import type { LegalSnapshot, Organization, OrganizationProfile } from "@/lib/types"

export type SettingsTab = "general" | "legal" | "contacts"

export function SettingsTabs({ active }: { active: SettingsTab }) {
  const items: Array<{ value: SettingsTab; label: string; href: string }> = [
    { value: "general", label: "General", href: "/settings" },
    { value: "legal", label: "Legal", href: "/settings/legal" },
    { value: "contacts", label: "Public contacts", href: "/settings/contacts" },
  ]
  return (
    <nav aria-label="Settings sections" className="inline-flex max-w-full items-center justify-center gap-1">
      {items.map((item) => <Link key={item.value} href={item.href} prefetch className={`inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-3 text-[12px] transition-colors min-[390px]:h-10 min-[390px]:px-5 min-[390px]:text-[14px] ${active === item.value ? "bg-slate-700 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}>{item.label}</Link>)}
    </nav>
  )
}

function GeneralOverview({ organization, profile }: { organization: Organization; profile: OrganizationProfile }) {
  const openDays = profile.working_hours?.items.filter((item) => item.is_open).length || 0
  return (
    <aside className="space-y-3">
      <section className="rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="text-[13px] font-medium text-slate-600">Public organization</div>
        <dl className="mt-3 space-y-2">
          <div className="rounded-lg bg-slate-50 px-3 py-2.5"><dt className="text-[9px] uppercase tracking-wide text-slate-400">Name</dt><dd className="mt-0.5 truncate text-[12px] text-slate-600">{organization.name}</dd></div>
          <div className="rounded-lg bg-slate-50 px-3 py-2.5"><dt className="text-[9px] uppercase tracking-wide text-slate-400">Public URL</dt><dd className="mt-0.5 truncate text-[12px] text-sky-700">swapgo.me/{organization.slug}</dd></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-sky-50/70 px-3 py-2.5"><dt className="text-[9px] uppercase tracking-wide text-sky-600/70">Contacts</dt><dd className="mt-0.5 text-[15px] text-slate-600">{profile.contacts?.items.length || 0}</dd></div>
            <div className="rounded-lg bg-emerald-50/70 px-3 py-2.5"><dt className="text-[9px] uppercase tracking-wide text-emerald-600/70">Open days</dt><dd className="mt-0.5 text-[15px] text-slate-600">{openDays}</dd></div>
          </div>
        </dl>
        <Link href="/settings/contacts" className="mt-3 inline-flex h-8 items-center rounded-lg bg-sky-50 px-3 text-[11px] text-sky-700 hover:bg-sky-100">Edit contacts and hours</Link>
      </section>
      <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-[11px] leading-5 text-slate-500">General details, public profile, logo, contacts, and working hours are published from the same SwapGo.me organization record.</section>
    </aside>
  )
}

export default function SettingsWorkspace({
  activeTab,
  organization,
  organizationEtag,
  profile,
  profileEtag,
  legal,
  legalEtag,
}: {
  activeTab: SettingsTab
  organization: Organization
  organizationEtag: string | null
  profile: OrganizationProfile
  profileEtag: string | null
  legal: LegalSnapshot
  legalEtag: string | null
}) {
  if (activeTab === "contacts") {
    return <PublicContactsPanel initialProfile={profile} initialProfileEtag={profileEtag} />
  }
  if (activeTab === "legal") {
    return <LegalSettingsPanel initialSnapshot={legal} initialEtag={legalEtag} />
  }
  return (
    <PartnerTwoColumnLayout
      variant="map"
      left={<GeneralSettingsPanel initialOrganization={organization} initialOrganizationEtag={organizationEtag} initialProfile={profile} initialProfileEtag={profileEtag} />}
      right={<GeneralOverview organization={organization} profile={profile} />}
    />
  )
}
