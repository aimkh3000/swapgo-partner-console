// Purpose: Keep Partner Console column proportions, scroll ownership and gutters consistent.

import type { ReactNode } from "react"

export default function PartnerTwoColumnLayout({
  left,
  right,
  variant = "balanced",
}: {
  left: ReactNode
  right: ReactNode
  variant?: "balanced" | "map"
}) {
  const isMap = variant === "map"
  const gridClass = isMap
    ? "xl:grid xl:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)] xl:items-stretch xl:gap-3 xl:overflow-hidden"
    : "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch lg:gap-3 lg:overflow-hidden"
  const columnClass = isMap
    ? "xl:min-h-0 xl:overflow-y-auto xl:pr-3"
    : "lg:min-h-0 lg:overflow-y-auto lg:pr-3"
  const rightSpacingClass = isMap ? "pt-3 xl:pt-0" : "pt-3 lg:pt-0"

  return (
    <div className={`mx-auto h-full min-h-0 w-full overflow-y-auto ${gridClass}`}>
      <div className={`min-w-0 ${columnClass}`}>{left}</div>
      <div className={`min-w-0 ${rightSpacingClass} ${columnClass}`}>{right}</div>
    </div>
  )
}
