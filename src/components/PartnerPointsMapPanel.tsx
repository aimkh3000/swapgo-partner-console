"use client"

// Purpose: Show Partner API exchange points on the partner-owned MapLibre/MapTiler map.

import { MapPin, RotateCcw } from "lucide-react"
import { useMemo } from "react"

import PartnerMap from "@/components/PartnerMap"
import type { LocationReference, Point } from "@/lib/types"

export default function PartnerPointsMapPanel({
  points,
  location,
  selectedPointId,
  onSelectPoint,
  onReset,
  compact = false,
}: {
  points: Point[]
  location: LocationReference | null
  selectedPointId: number | null
  onSelectPoint: (pointId: number) => void
  onReset?: () => void
  compact?: boolean
}) {
  const visiblePoints = useMemo(() => points.flatMap((point) => {
    const latitude = point.location.latitude
    const longitude = point.location.longitude
    return latitude == null || longitude == null
      ? []
      : [{
          id: point.id,
          name: point.name,
          latitude,
          longitude,
        }]
  }), [points])

  return (
    <section className={`relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 xl:sticky xl:top-0 ${compact ? "min-h-[360px] xl:h-[min(520px,calc(100vh-120px))]" : "min-h-[430px] xl:h-[calc(100vh-96px)]"}`}>
      <div className="flex h-11 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600">
        {onReset ? (
          <button type="button" onClick={onReset} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2 text-[11px] text-rose-700 hover:border-rose-300 hover:bg-rose-100">
            <RotateCcw className="h-3.5 w-3.5" />Reset all
          </button>
        ) : <span />}
        <span className="ml-auto inline-flex min-w-0 items-center justify-end gap-1.5">
          <MapPin className="h-4 w-4 shrink-0 text-teal-700" />
          <span className="truncate">{visiblePoints.length} points on the map</span>
        </span>
      </div>
      <PartnerMap
        className={`h-[calc(100%-44px)] ${compact ? "min-h-[315px]" : "min-h-[385px]"}`}
        points={visiblePoints}
        location={location}
        selectedPointId={selectedPointId}
        onPointSelect={onSelectPoint}
      />
    </section>
  )
}
