"use client"

// Purpose: Reusable Partner API-backed autocomplete; canonical references stay server-owned.

import { Loader2, Search, X } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"

import { currencyEnglishLabel, locationEnglishLabel } from "@/lib/reference-labels"
import CurrencyIdentity from "@/components/CurrencyIdentity"
import type { CurrencyReference, LocationReference } from "@/lib/types"

type ReferenceItem = CurrencyReference | LocationReference

type Props<T extends ReferenceItem> = {
  kind: "currencies" | "locations"
  label?: string
  placeholder: string
  value: T | null
  onChange: (item: T | null) => void
  cityOnly?: boolean
  countryOnly?: boolean
}

function isLocation(item: ReferenceItem): item is LocationReference {
  return "kind" in item
}

function itemKey(item: ReferenceItem) {
  return isLocation(item)
    ? `${item.kind}:${item.wikidata_id}`
    : `${item.code}:${item.type}`
}

function primaryLabel(item: ReferenceItem) {
  if (isLocation(item)) return locationEnglishLabel(item)
  return currencyEnglishLabel(item)
}

function selectedLabel(item: ReferenceItem) {
  return isLocation(item)
    ? [item.country_emoji, locationEnglishLabel(item)].filter(Boolean).join(" ")
    : item.name
}

function secondaryLabel(item: ReferenceItem) {
  if (isLocation(item)) return item.country_name || item.iso3.toUpperCase()
  return item.type
}

export default function ReferenceCombobox<T extends ReferenceItem>({
  kind,
  label,
  placeholder,
  value,
  onChange,
  cityOnly = false,
  countryOnly = false,
}: Props<T>) {
  const inputId = useId()
  const resultsId = `${inputId}-results`
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const focusAfterClearRef = useRef(false)
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [searchedQuery, setSearchedQuery] = useState("")
  const [searchFailed, setSearchFailed] = useState(false)
  const [focused, setFocused] = useState(false)
  const [replacingSelection, setReplacingSelection] = useState(false)
  const searchActive = focused && (!value || replacingSelection) && query.trim().length >= 2

  useEffect(() => {
    const normalized = query.trim()
    if (!searchActive) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/partner/references/${kind}/search?q=${encodeURIComponent(normalized)}&locale=en`,
          { signal: controller.signal, cache: "no-store" },
        )
        if (!response.ok) throw new Error("reference search failed")
        const body = await response.json() as { items?: T[] }
        const nextItems = body.items || []
        setItems(nextItems.filter((item) => {
          if (!isLocation(item)) return true
          if (cityOnly) return item.kind === "city"
          if (countryOnly) return item.kind === "country"
          return true
        }))
        setSearchedQuery(normalized)
      } catch {
        if (!controller.signal.aborted) {
          setItems([])
          setSearchedQuery(normalized)
          setSearchFailed(true)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 220)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [cityOnly, countryOnly, kind, query, searchActive])

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setFocused(false)
        if (replacingSelection) {
          setReplacingSelection(false)
          setQuery("")
          setItems([])
        }
      }
    }
    document.addEventListener("pointerdown", dismiss)
    return () => document.removeEventListener("pointerdown", dismiss)
  }, [replacingSelection])

  useEffect(() => {
    if ((value && !replacingSelection) || !focusAfterClearRef.current) return
    focusAfterClearRef.current = false
    inputRef.current?.focus()
  }, [replacingSelection, value])

  function clearSelection() {
    setQuery("")
    setItems([])
    setSearchFailed(false)
    setFocused(true)
    focusAfterClearRef.current = true
    if (value) {
      // A selected chip's cross starts replacement rather than clearing the
      // committed filter. The old value remains authoritative until another
      // reference is selected or an explicit reset action is used.
      setReplacingSelection(true)
      return
    }
    onChange(null)
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      {label ? <label htmlFor={inputId} className="mb-1 block text-[11px] font-medium text-slate-500">{label}</label> : null}
      {value && !replacingSelection ? (
        <div className="flex h-10 min-w-0 items-center rounded-lg border border-slate-300 bg-white p-1">
          <span className="inline-flex h-8 min-w-0 max-w-full items-center gap-1 rounded-md border border-sky-200 bg-sky-50 py-1 pl-2.5 pr-1 text-[12px] text-slate-700">
            {isLocation(value) ? (
              <span className="min-w-0 truncate">{selectedLabel(value)}</span>
            ) : (
              <CurrencyIdentity currency={value} />
            )}
            <button type="button" onClick={clearSelection} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-sky-100 hover:text-slate-700" aria-label="Replace selection">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            id={inputId}
            name={`partner-${kind}-reference-${inputId}`}
            value={query}
            onFocus={() => setFocused(true)}
            onChange={(event) => {
              const nextQuery = event.target.value
              setQuery(nextQuery)
              setItems([])
              setLoading(nextQuery.trim().length >= 2)
              setSearchedQuery("")
              setSearchFailed(false)
              setFocused(true)
            }}
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={resultsId}
            aria-expanded={searchActive && (loading || searchedQuery === query.trim())}
            placeholder={placeholder}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-[12px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-teal-600"
          />
          <span className="pointer-events-none absolute inset-y-0 right-1 flex w-8 items-center justify-center">
            {searchActive && loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : query ? (
              <button type="button" onClick={() => { setQuery(""); setItems([]); setLoading(false); inputRef.current?.focus() }} className="pointer-events-auto flex h-8 w-8 items-center justify-center text-slate-400" aria-label="Clear"><X className="h-3.5 w-3.5" /></button>
            ) : null}
          </span>
        </div>
      )}

      {searchActive && items.length ? (
        <div id={resultsId} role="listbox" className="absolute inset-x-0 top-full z-[120] mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1">
          {items.map((item) => (
            <button
              type="button"
              role="option"
              aria-selected="false"
              key={itemKey(item)}
              onClick={() => { onChange(item); setReplacingSelection(false); setQuery(""); setItems([]); setFocused(false) }}
              className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-50"
            >
              {isLocation(item) ? <span className="shrink-0">{item.country_emoji || "🌍"}</span> : (
                item.emoji ? <span className="shrink-0 text-sm leading-none" aria-hidden="true">{item.emoji}</span> : null
              )}
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-medium text-slate-700">{primaryLabel(item)}</span>
                <span className="block truncate text-[10px] text-slate-400">{secondaryLabel(item)}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {searchActive && !loading && searchedQuery === query.trim() && !items.length ? (
        <div id={resultsId} role="status" className="absolute inset-x-0 top-full z-[120] mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
          {searchFailed
            ? `Could not search ${kind === "locations" ? "locations" : "currencies"}. Try again.`
            : `No ${kind === "locations" ? "locations" : "currencies"} found.`}
        </div>
      ) : null}
    </div>
  )
}
