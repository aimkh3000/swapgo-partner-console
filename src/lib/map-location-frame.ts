// Purpose: Resolve the map-provider camera for one canonical SwapGo.me geo reference.

import type { LocationReference } from "@/lib/types"

type MapBounds = [[number, number], [number, number]]

export type LocationCamera =
  | { kind: "bounds"; bounds: MapBounds; maxZoom: number }
  | { kind: "center"; center: [number, number]; zoom: number }

type MapTilerFeature = {
  bbox?: unknown
  center?: unknown
  place_type?: unknown
  text?: unknown
  properties?: { wikidata?: unknown }
}

type MapTilerFeatureCollection = {
  features?: unknown
}

const countryCameraCache = new Map<string, Promise<LocationCamera>>()

function finiteCoordinate(value: unknown): number | null {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function parseBounds(value: unknown): MapBounds | null {
  if (!Array.isArray(value) || value.length !== 4) return null
  const west = finiteCoordinate(value[0])
  const south = finiteCoordinate(value[1])
  const east = finiteCoordinate(value[2])
  const north = finiteCoordinate(value[3])
  if (west == null || south == null || east == null || north == null) return null
  if (west < -180 || east > 180 || south < -85 || north > 85) return null
  if (west >= east || south >= north) return null
  return [[west, south], [east, north]]
}

function parseCenter(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null
  const longitude = finiteCoordinate(value[0])
  const latitude = finiteCoordinate(value[1])
  if (longitude == null || latitude == null) return null
  if (longitude < -180 || longitude > 180 || latitude < -85 || latitude > 85) return null
  return [longitude, latitude]
}

function fallbackCountryCamera(location: LocationReference): LocationCamera {
  const longitude = finiteCoordinate(location.longitude)
  const latitude = finiteCoordinate(location.latitude)
  if (longitude != null && latitude != null) {
    return { kind: "center", center: [longitude, latitude], zoom: 4 }
  }
  return { kind: "bounds", bounds: [[-170, -55], [170, 78]], maxZoom: 4 }
}

function countryCacheKey(location: LocationReference, mapTilerKey: string) {
  return [
    mapTilerKey,
    location.country_wikidata_id,
    location.iso3,
    location.country_name,
    location.name,
  ].filter(Boolean).join(":").toLowerCase()
}

function countrySearchName(location: LocationReference) {
  return String(location.country_name || location.name || location.iso3).trim()
}

function isCountryFeature(feature: MapTilerFeature) {
  return Array.isArray(feature.place_type) && feature.place_type.includes("country")
}

function selectCountryFeature(
  features: MapTilerFeature[],
  location: LocationReference,
): MapTilerFeature | null {
  const countries = features.filter(isCountryFeature)
  const wikidataId = String(location.country_wikidata_id || "").trim()
  if (wikidataId) {
    const exactWikidata = countries.find(
      (feature) => String(feature.properties?.wikidata || "").trim() === wikidataId,
    )
    if (exactWikidata) return exactWikidata
  }

  const wantedNames = new Set(
    [location.country_name, location.name]
      .map((value) => String(value || "").trim().toLocaleLowerCase("en"))
      .filter(Boolean),
  )
  const exactName = countries.find(
    (feature) => wantedNames.has(String(feature.text || "").trim().toLocaleLowerCase("en")),
  )
  return exactName || (countries.length === 1 ? countries[0] : null)
}

async function requestCountryCamera(
  location: LocationReference,
  mapTilerKey: string,
): Promise<LocationCamera> {
  const query = encodeURIComponent(countrySearchName(location))
  const url = new URL(`https://api.maptiler.com/geocoding/${query}.json`)
  url.searchParams.set("key", mapTilerKey)
  url.searchParams.set("types", "country")
  url.searchParams.set("limit", "3")
  url.searchParams.set("language", "en")

  const response = await fetch(url, { cache: "force-cache" })
  if (!response.ok) throw new Error(`MapTiler country lookup failed with status ${response.status}.`)
  const body = await response.json() as MapTilerFeatureCollection
  const features = Array.isArray(body.features) ? body.features as MapTilerFeature[] : []
  const feature = selectCountryFeature(features, location)
  if (!feature) throw new Error("MapTiler did not return the selected country.")

  const bounds = parseBounds(feature.bbox)
  if (bounds) return { kind: "bounds", bounds, maxZoom: 6 }

  const center = parseCenter(feature.center)
  if (center) return { kind: "center", center, zoom: 4 }

  throw new Error("MapTiler returned a country without a usable camera.")
}

export async function resolveLocationCamera(
  location: LocationReference,
  mapTilerKey: string,
): Promise<LocationCamera> {
  if (location.kind === "city") {
    const longitude = finiteCoordinate(location.longitude)
    const latitude = finiteCoordinate(location.latitude)
    return longitude != null && latitude != null
      ? { kind: "center", center: [longitude, latitude], zoom: 10 }
      : { kind: "bounds", bounds: [[-170, -55], [170, 78]], maxZoom: 4 }
  }

  const cacheKey = countryCacheKey(location, mapTilerKey)
  const cached = countryCameraCache.get(cacheKey)
  if (cached) return cached

  const pending = requestCountryCamera(location, mapTilerKey)
  countryCameraCache.set(cacheKey, pending)
  try {
    return await pending
  } catch {
    countryCameraCache.delete(cacheKey)
    return fallbackCountryCamera(location)
  }
}
