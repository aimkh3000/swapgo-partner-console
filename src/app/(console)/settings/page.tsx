// Purpose: Render general settings and redirect legacy tab-query bookmarks.

import { redirect } from "next/navigation"

import SettingsRoute from "@/components/settings/SettingsRoute"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = await searchParams
  if (query.tab === "legal") redirect("/settings/legal")
  if (query.tab === "contacts") redirect("/settings/contacts")
  return <SettingsRoute activeTab="general" />
}
