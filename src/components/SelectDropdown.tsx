"use client"

// Purpose: Provide one accessible, shadow-free select menu across Partner Console.

import { Check, ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export type SelectDropdownOption<Value extends string> = {
  value: Value
  label: string
  description?: string
}

type MenuLayout = { top: number; left: number; width: number; maxHeight: number }

function getMenuLayout(button: HTMLButtonElement, minimumWidth: number): MenuLayout {
  const rect = button.getBoundingClientRect()
  const margin = 8
  const gap = 5
  const availableWidth = window.innerWidth - margin * 2
  const width = Math.min(320, availableWidth, Math.max(minimumWidth, rect.width))
  const left = Math.min(Math.max(margin, rect.left), Math.max(margin, window.innerWidth - width - margin))
  const below = window.innerHeight - rect.bottom - margin
  const above = rect.top - margin
  const opensUp = below < 200 && above > below
  const availableHeight = (opensUp ? above : below) - gap
  const maxHeight = Math.max(120, Math.min(300, availableHeight))

  return {
    top: opensUp ? Math.max(margin, rect.top - gap - maxHeight) : rect.bottom + gap,
    left,
    width,
    maxHeight,
  }
}

export default function SelectDropdown<Value extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  minimumMenuWidth = 200,
  className = "",
}: {
  value: Value
  options: ReadonlyArray<SelectDropdownOption<Value>>
  onChange: (value: Value) => void
  ariaLabel: string
  disabled?: boolean
  minimumMenuWidth?: number
  className?: string
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [layout, setLayout] = useState<MenuLayout | null>(null)
  const isOpen = layout !== null
  const selected = options.find((option) => option.value === value) || options[0]

  useEffect(() => {
    if (!isOpen) return
    function reposition() {
      if (buttonRef.current) setLayout(getMenuLayout(buttonRef.current, minimumMenuWidth))
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setLayout(null)
    }
    window.addEventListener("resize", reposition)
    window.addEventListener("scroll", reposition, true)
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      window.removeEventListener("resize", reposition)
      window.removeEventListener("scroll", reposition, true)
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [isOpen, minimumMenuWidth])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setLayout((current) => current ? null : buttonRef.current ? getMenuLayout(buttonRef.current, minimumMenuWidth) : null)}
        className={`flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border bg-white px-2.5 text-left text-[12px] text-slate-600 outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-400 ${isOpen ? "border-teal-600" : "border-slate-300 hover:border-slate-400"} ${className}`}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label || value}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {layout ? (
        <>
          <button type="button" aria-label={`Close ${ariaLabel}`} className="fixed inset-0 z-[9998] cursor-default" onClick={() => setLayout(null)} />
          <div role="listbox" aria-label={ariaLabel} className="fixed z-[9999] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1" style={{ top: layout.top, left: layout.left, width: layout.width, maxHeight: layout.maxHeight }}>
            {options.map((option) => {
              const active = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => { onChange(option.value); setLayout(null) }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50 ${active ? "bg-sky-50/80" : ""}`}
                >
                  <span className={`min-w-0 flex-1 truncate text-[13px] ${active ? "text-sky-800" : "text-slate-600"}`}>{option.label}</span>
                  {option.description ? <span className={`max-w-[150px] truncate text-right text-[10px] ${active ? "text-sky-600/70" : "text-slate-400"}`}>{option.description}</span> : null}
                  <Check className={`h-3.5 w-3.5 shrink-0 ${active ? "text-sky-700" : "invisible"}`} />
                </button>
              )
            })}
          </div>
        </>
      ) : null}
    </>
  )
}
