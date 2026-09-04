// Purpose: Redirect old locale-prefixed console bookmarks to the English-only clean route.

import { notFound, permanentRedirect } from "next/navigation"

const LEGACY_LOCALES = new Set(["en", "ru", "es", "pt", "zh", "ar", "hi", "tr", "de", "fr"])

export default async function LegacyLocaleRedirect({ params }: { params: Promise<{ legacy: string; path?: string[] }> }) {
  const { legacy, path = [] } = await params
  if (!LEGACY_LOCALES.has(legacy)) notFound()
  permanentRedirect(`/${path.join("/")}`)
}
