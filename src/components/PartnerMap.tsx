"use client"

// Purpose: Own the standalone console's direct MapLibre rendering with a partner-supplied MapTiler style.

import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl"
import { useEffect, useRef, useState } from "react"

import { useMapProviderConfig } from "@/components/MapProviderConfig"
import { addPartnerMapAttribution } from "@/lib/map-attribution"
import { resolveLocationCamera } from "@/lib/map-location-frame"
import type { LocationReference } from "@/lib/types"

type MapPoint = {
  id: number
  name: string
  latitude: number
  longitude: number
}

type Coordinate = {
  latitude: number
  longitude: number
}

type Props = {
  className?: string
  points?: MapPoint[]
  location: LocationReference | null
  selectedPointId?: number | null
  selectedCoordinate?: Coordinate | null
  editable?: boolean
  focusVersion?: number
  onPointSelect?: (pointId: number) => void
  onCoordinateSelect?: (latitude: number, longitude: number) => void
}

const EMPTY_POINTS: MapPoint[] = []

function frameUnscopedPoints(map: MapLibreMap, points: MapPoint[]) {
  if (points.length) {
    const bounds = new maplibregl.LngLatBounds()
    points.forEach((point) => bounds.extend([point.longitude, point.latitude]))
    map.fitBounds(bounds, { padding: 52, maxZoom: 11, duration: 0 })
    return
  }
  map.jumpTo({ center: [0, 25], zoom: 1.6 })
}

export default function PartnerMap({
  className = "",
  points = EMPTY_POINTS,
  location,
  selectedPointId = null,
  selectedCoordinate = null,
  editable = false,
  focusVersion = 0,
  onPointSelect,
  onCoordinateSelect,
}: Props) {
  const mapProvider = useMapProviderConfig()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const pointMarkersRef = useRef<Marker[]>([])
  const selectionMarkerRef = useRef<Marker | null>(null)
  const onPointSelectRef = useRef(onPointSelect)
  const onCoordinateSelectRef = useRef(onCoordinateSelect)
  const [error, setError] = useState("")
  const apiKey = mapProvider.apiKey
  const styleUrl = mapProvider.styleUrl
  const selectedLatitude = selectedCoordinate?.latitude ?? null
  const selectedLongitude = selectedCoordinate?.longitude ?? null
  const pickerLatitude = selectedLatitude ?? (editable ? location?.latitude ?? null : null)
  const pickerLongitude = selectedLongitude ?? (editable ? location?.longitude ?? null : null)
  const hasSelectedCoordinate = selectedLatitude != null && selectedLongitude != null

  useEffect(() => {
    onPointSelectRef.current = onPointSelect
  }, [onPointSelect])

  useEffect(() => {
    onCoordinateSelectRef.current = onCoordinateSelect
  }, [onCoordinateSelect])

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !styleUrl) return
    setError("")
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [0, 25],
      zoom: 1.6,
      attributionControl: false,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right")
    const removeAttribution = addPartnerMapAttribution(containerRef.current)
    map.on("error", () => setError("Map tiles could not be loaded. Check the MapTiler key and its allowed origins."))
    map.on("load", () => setError(""))
    map.on("style.load", () => setError(""))
    map.on("idle", () => setError(""))
    if (editable) {
      map.on("click", (event) => {
        onCoordinateSelectRef.current?.(event.lngLat.lat, event.lngLat.lng)
      })
    }
    mapRef.current = map
    const observer = new ResizeObserver(() => map.resize())
    observer.observe(containerRef.current)
    return () => {
      observer.disconnect()
      removeAttribution()
      map.remove()
      mapRef.current = null
    }
  }, [editable, styleUrl])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let cancelled = false

    async function frameSelectedGeo() {
      if (!location) {
        frameUnscopedPoints(map!, points)
        return
      }

      // The explicit geo filter always owns the camera. Point results only
      // decorate that frame; they must never turn a country into the city where
      // this organization happens to have most of its branches.
      const camera = await resolveLocationCamera(location, apiKey)
      if (cancelled) return
      if (camera.kind === "bounds") {
        map!.fitBounds(camera.bounds, { padding: 24, maxZoom: camera.maxZoom, duration: 0 })
      } else {
        map!.jumpTo({ center: camera.center, zoom: camera.zoom })
      }
    }

    void frameSelectedGeo()
    return () => {
      cancelled = true
    }
  }, [apiKey, focusVersion, location, points])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    pointMarkersRef.current.forEach((marker) => marker.remove())
    // Render the selected point last and give it a higher stacking order so it
    // remains clickable and visible when several organization points overlap.
    const orderedPoints = [...points].sort((left, right) => {
      const leftSelected = left.id === selectedPointId ? 1 : 0
      const rightSelected = right.id === selectedPointId ? 1 : 0
      return leftSelected - rightSelected
    })
    pointMarkersRef.current = orderedPoints.map((point) => {
      const selected = point.id === selectedPointId
      const element = document.createElement("button")
      element.type = "button"
      element.title = point.name
      element.setAttribute("aria-label", `Select ${point.name}`)
      element.style.width = selected ? "18px" : "14px"
      element.style.height = selected ? "18px" : "14px"
      element.style.borderRadius = "9999px"
      element.style.border = "3px solid white"
      element.style.background = selected ? "#0284c7" : "#0f766e"
      element.style.boxShadow = selected
        ? "0 0 0 2px rgba(2, 132, 199, 0.6)"
        : "0 0 0 1px rgba(15, 118, 110, 0.45)"
      element.style.cursor = "pointer"
      element.style.padding = "0"
      element.style.zIndex = selected ? "20" : "1"

      const marker = new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat([point.longitude, point.latitude])
        .addTo(map)
      element.addEventListener("click", (event) => {
        event.stopPropagation()
        onPointSelectRef.current?.(point.id)
      })
      return marker
    })
    return () => {
      pointMarkersRef.current.forEach((marker) => marker.remove())
      pointMarkersRef.current = []
    }
  }, [points, selectedPointId])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    selectionMarkerRef.current?.remove()
    selectionMarkerRef.current = null
    if (!editable || pickerLatitude == null || pickerLongitude == null) return
    const marker = new maplibregl.Marker({
      color: hasSelectedCoordinate ? "#059669" : "#94a3b8",
      draggable: true,
    })
      .setLngLat([pickerLongitude, pickerLatitude])
      .addTo(map)
    marker.on("dragend", () => {
      const coordinate = marker.getLngLat()
      onCoordinateSelectRef.current?.(coordinate.lat, coordinate.lng)
    })
    selectionMarkerRef.current = marker
    return () => {
      marker.remove()
      if (selectionMarkerRef.current === marker) selectionMarkerRef.current = null
    }
  }, [editable, hasSelectedCoordinate, pickerLatitude, pickerLongitude])

  if (!styleUrl) {
    return <div className={`flex items-center justify-center bg-slate-100 px-6 text-center text-[12px] text-slate-500 ${className}`}>Connect a MapTiler style in API &amp; map setup to display the map.</div>
  }

  return (
    <div className={`relative min-w-0 overflow-hidden bg-slate-100 ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {error ? <div className="absolute inset-x-3 top-3 z-10 rounded-md border border-rose-200 bg-white/95 px-3 py-2 text-[11px] text-rose-700">{error}</div> : null}
    </div>
  )
}
