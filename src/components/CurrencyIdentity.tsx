// Purpose: Render one canonical currency name with its reference icon.

import { CircleDollarSign } from "lucide-react"

import type { CurrencyReference } from "@/lib/types"

export default function CurrencyIdentity({ currency, className = "" }: {
  currency: CurrencyReference
  className?: string
}) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      {currency.emoji ? (
        <span className="shrink-0 text-sm leading-none" aria-hidden="true">{currency.emoji}</span>
      ) : (
        <CircleDollarSign className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
      )}
      <span className="min-w-0 truncate">{currency.name}</span>
    </span>
  )
}
