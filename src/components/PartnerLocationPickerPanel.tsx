"use client"

// Purpose: Let partners place one exchange point with their own MapLibre/MapTiler frontend.

import { MapPin } from "lucide-react"

import PartnerMap from "@/components/PartnerMap"
import type { LocationReference, PointLocation } from "@/lib/types"

export default function PartnerLocationPickerPanel({
  initial,
  focusVersion,
  onSelect,
}: {
  initial?: { display: LocationReference; location?: PointLocation } | null
  focusVersion: number
  onSelect: (latitude: number, longitude: number) => void
}) {
  const latitude = initial?.location?.latitude ?? null
  const longitude = initial?.location?.longitude ?? null

  return (
    <section className="flex min-h-[560px] min-w-0 flex-col overflow-hidden border border-slate-200 bg-slate-50 md:h-full md:min-h-0">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600">
        <MapPin className="h-4 w-4 text-emerald-700" />
        Set the exact point on the map
      </div>
      <PartnerMap
        className="min-h-[510px] flex-1 md:min-h-0"
        location={initial?.display ?? null}
        selectedCoordinate={latitude != null && longitude != null ? { latitude, longitude } : null}
        focusVersion={focusVersion}
        editable
        onCoordinateSelect={onSelect}
      />
    </section>
  )
}
