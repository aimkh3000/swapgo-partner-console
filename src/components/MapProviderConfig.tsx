"use client"

// Purpose: Keep the partner-owned public MapTiler configuration in one browser-side source of truth.

import { createContext, type ReactNode, useContext, useSyncExternalStore } from "react"

const STORAGE_KEY = "swapgo.partner.maptiler-style-url"
const CHANGE_EVENT = "swapgo:maptiler-config-change"

export type MapProviderConfig = {
  apiKey: string
  styleUrl: string
  source: "browser" | "project" | "none"
}

type MapProviderConfigContextValue = MapProviderConfig & {
  save: (value: string) => MapProviderConfig
  reset: () => void
}

const MapProviderContext = createContext<MapProviderConfigContextValue | null>(null)

function projectConfig(): MapProviderConfig {
  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY?.trim() || ""
  return {
    apiKey,
    styleUrl: apiKey
      ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(apiKey)}`
      : "",
    source: apiKey ? "project" : "none",
  }
}

export function parseMapTilerConfig(value: string, source: MapProviderConfig["source"] = "browser"): MapProviderConfig {
  const trimmed = value.trim()
  if (!trimmed) throw new Error("Enter a MapTiler style URL or browser key.")

  const styleUrl = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(trimmed)}`

  let parsed: URL
  try {
    parsed = new URL(styleUrl)
  } catch {
    throw new Error("Enter a valid MapTiler style URL.")
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "api.maptiler.com") {
    throw new Error("Use an HTTPS style URL from api.maptiler.com.")
  }
  if (!/^\/maps\/[^/]+\/style\.json$/.test(parsed.pathname)) {
    throw new Error("The URL must point to a MapTiler map style.json endpoint.")
  }
  const apiKey = parsed.searchParams.get("key")?.trim() || ""
  if (!apiKey) throw new Error("The MapTiler URL does not contain a browser key.")

  return { apiKey, styleUrl: parsed.toString(), source }
}

export function MapProviderConfigProvider({ children }: { children: ReactNode }) {
  const storedStyleUrl = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange)
      window.addEventListener(CHANGE_EVENT, onStoreChange)
      return () => {
        window.removeEventListener("storage", onStoreChange)
        window.removeEventListener(CHANGE_EVENT, onStoreChange)
      }
    },
    () => window.localStorage.getItem(STORAGE_KEY),
    () => null,
  )
  const fallback = projectConfig()
  let config = fallback
  if (storedStyleUrl) {
    try {
      config = parseMapTilerConfig(storedStyleUrl)
    } catch {
      config = fallback
    }
  }

  const value: MapProviderConfigContextValue = {
    ...config,
    save(input) {
      const next = parseMapTilerConfig(input)
      window.localStorage.setItem(STORAGE_KEY, next.styleUrl)
      window.dispatchEvent(new Event(CHANGE_EVENT))
      return next
    },
    reset() {
      window.localStorage.removeItem(STORAGE_KEY)
      window.dispatchEvent(new Event(CHANGE_EVENT))
    },
  }

  return <MapProviderContext.Provider value={value}>{children}</MapProviderContext.Provider>
}

export function useMapProviderConfig(): MapProviderConfigContextValue {
  const value = useContext(MapProviderContext)
  if (!value) throw new Error("useMapProviderConfig must be used inside MapProviderConfigProvider.")
  return value
}
