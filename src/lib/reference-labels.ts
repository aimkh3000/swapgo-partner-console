// Purpose: Keep canonical English geo and currency labels consistent across the console.

import type { CurrencyReference, LocationReference } from "@/lib/types"

function currencyCodeLabel(currency: CurrencyReference) {
  const normalizedCode = currency.code.trim().toLowerCase()
  const typeSuffix = `_${currency.type.trim().toLowerCase()}`
  const displayCode = normalizedCode.endsWith(typeSuffix)
    ? normalizedCode.slice(0, -typeSuffix.length)
    : normalizedCode
  return displayCode.replaceAll("_", " ").toUpperCase()
}

export function currencyEnglishLabel(currency: CurrencyReference) {
  return `${currencyCodeLabel(currency)} · ${currency.name}`
}

export function locationEnglishLabel(location: LocationReference) {
  return location.kind === "city"
    ? `${location.name} · ${location.iso3.toUpperCase()}`
    : `${location.iso3.toUpperCase()} · ${location.name}`
}
