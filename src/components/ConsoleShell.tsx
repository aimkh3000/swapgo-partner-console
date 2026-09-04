"use client"

// Purpose: Partner Console shell with the same geometry and navigation behavior as org.

import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  MapPin,
  MessageSquareText,
  Menu,
  Settings,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, type ReactNode } from "react"

import { dictionary } from "@/lib/i18n"

const items = [
  { key: "rates", href: "/rates", icon: CircleDollarSign, iconClass: "text-cyan-600", hover: "hover:bg-cyan-50", active: "bg-cyan-100" },
  { key: "points", href: "/points", icon: MapPin, iconClass: "text-emerald-700", hover: "hover:bg-emerald-50", active: "bg-emerald-100" },
  { key: "reviews", href: "/reviews", icon: MessageSquareText, iconClass: "text-amber-700", hover: "hover:bg-amber-50", active: "bg-amber-100" },
  { key: "support", href: "/support", icon: Bell, iconClass: "text-rose-700", hover: "hover:bg-rose-50", active: "bg-rose-100" },
] as const

export default function ConsoleShell({
  organizationName,
  initialCollapsed,
  children,
}: {
  organizationName: string
  initialCollapsed: boolean
  children: ReactNode
}) {
  const copy = dictionary()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [railPreviewHovered, setRailPreviewHovered] = useState(false)
  const [railPreviewFocused, setRailPreviewFocused] = useState(false)
  const railPreviewOpen = collapsed && (railPreviewHovered || railPreviewFocused)

  function toggleCollapsed() {
    setRailPreviewHovered(false)
    setRailPreviewFocused(false)
    setCollapsed((current) => {
      const next = !current
      const preference = next ? "rail" : "full"
      document.cookie = `swapgo_partner_sidebar=${preference}; Path=/; Max-Age=31536000; SameSite=Lax`
      document.documentElement.setAttribute("data-partner-sidebar-pref", preference)
      return next
    })
  }

  function navigation(variant: "full" | "rail", onNavigate?: () => void) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {variant === "full" ? <div className="shrink-0 pb-1 pl-6 pr-4 pt-4 text-[13px] font-normal leading-5 text-slate-700"><div className="truncate">{organizationName}</div></div> : null}
        <ul className={`min-h-0 flex-1 overflow-y-auto ${variant === "rail" ? "space-y-1 px-1 pb-2 pt-2" : "space-y-2 px-3 pb-4 pt-2 text-[15px]"}`}>
          {items.map((item) => {
            const href = item.href
            const active = pathname === href || pathname.startsWith(`${href}/`)
            const Icon = item.icon
            return (
              <li key={item.key}>
                <Link href={item.href} onClick={onNavigate} title={copy[item.key]} aria-label={copy[item.key]} className={`group flex items-center rounded-lg transition-colors ${item.hover} ${active ? item.active : ""} ${variant === "rail" ? "mx-auto h-11 w-11 justify-center" : "p-3"}`}>
                  <Icon className={`${variant === "rail" ? "h-5 w-5" : "h-6 w-6"} shrink-0 ${item.iconClass}`} />
                  {variant === "full" ? <span className="ml-3 truncate text-slate-600">{copy[item.key]}</span> : <span className="sr-only">{copy[item.key]}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
        <div className={`shrink-0 pb-3 ${variant === "rail" ? "space-y-1 px-1" : "space-y-1 px-3"}`}>
          {[
            { href: "/settings", label: copy.settings, icon: Settings },
            { href: "/guide", label: copy.guide, icon: BookOpen },
          ].map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return <Link key={item.href} href={item.href} onClick={onNavigate} title={item.label} aria-label={item.label} className={`flex items-center rounded-lg text-slate-500 hover:bg-slate-100 ${active ? "bg-slate-100 text-slate-700" : ""} ${variant === "rail" ? "mx-auto h-11 w-11 justify-center" : "w-full p-3 text-[14px]"}`}><Icon className="h-5 w-5" />{variant === "full" ? <span className="ml-3">{item.label}</span> : <span className="sr-only">{item.label}</span>}</Link>
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1920px] overflow-x-hidden bg-white md:h-screen md:min-h-0 md:overflow-hidden">
      <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="fixed left-1.5 top-1.5 z-50 flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white min-[390px]:hidden lg:hidden"><Menu className="h-4 w-4 text-slate-600" /></button>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[54px] flex-col overflow-hidden border-r border-slate-200 bg-white min-[390px]:flex lg:hidden">
        <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="flex h-12 w-[54px] shrink-0 items-center justify-center border-b border-slate-200 hover:bg-slate-100"><Menu className="h-5 w-5 text-slate-600" /></button>
        <div className="min-h-0 flex-1">{navigation("rail")}</div>
      </aside>

      <aside data-partner-sidebar={collapsed ? "rail" : "full"} className={`fixed inset-y-0 z-40 hidden shrink-0 flex-col bg-white transition-[width,margin-right] duration-200 ease-out lg:flex ${collapsed ? "w-[54px]" : "mr-[6px] w-60"}`} style={{ left: "max(0px, calc((100vw - 1920px) / 2))" }}>
        <div
          className={`flex h-full min-h-0 flex-col ${railPreviewOpen ? "pointer-events-none absolute inset-y-0 left-0 z-[60] w-60 bg-transparent" : "relative w-full bg-white"}`}
          onPointerLeave={() => setRailPreviewHovered(false)}
          onBlur={(event) => {
            const nextTarget = event.relatedTarget as Node | null
            if (collapsed && !event.currentTarget.contains(nextTarget)) setRailPreviewFocused(false)
          }}
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !railPreviewOpen) return
            event.preventDefault()
            setRailPreviewHovered(false)
            setRailPreviewFocused(false)
          }}
        >
          {collapsed ? (
            <div className="flex h-12 min-h-12 w-[54px] shrink-0 items-center justify-start border-b border-slate-100 bg-white">
              <button
                type="button"
                aria-label="Preview sidebar"
                title="Preview sidebar"
                aria-expanded={railPreviewOpen}
                onPointerEnter={() => setRailPreviewHovered(true)}
                onMouseDown={(event) => event.preventDefault()}
                onFocus={() => setRailPreviewFocused(true)}
                className="pointer-events-auto flex h-12 w-[54px] shrink-0 items-center justify-center border-r border-slate-200 bg-transparent text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
              >
                <Menu className="h-[23px] w-[23px]" strokeWidth={2.3} />
              </button>
            </div>
          ) : null}
          <div className={`flex min-h-0 flex-1 flex-col ${railPreviewOpen ? "pointer-events-auto w-60 border-r border-slate-200 bg-white" : "w-full border-r border-slate-200"}`}>
            {navigation(collapsed && !railPreviewOpen ? "rail" : "full")}
          </div>
          {!railPreviewOpen ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              className="absolute right-0 top-1/2 z-[70] flex h-12 w-[22px] -translate-y-1/2 items-center justify-center rounded-l-2xl rounded-r-none border border-r-0 border-slate-300 bg-white text-slate-600 transition-colors after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-slate-200 after:content-[''] hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
      </aside>

      <div data-partner-content={collapsed ? "rail" : "full"} className={`min-h-screen min-w-0 bg-white pt-12 min-[390px]:pl-[54px] min-[390px]:pt-0 md:h-screen md:min-h-0 md:overflow-hidden lg:pt-0 ${collapsed ? "lg:pl-[54px]" : "lg:pl-[246px]"}`}>
        <div className="relative flex h-full min-h-0 min-w-0 flex-col">
          {children}
        </div>
      </div>

      <div className={`fixed inset-y-0 left-0 z-[70] w-64 transform-gpu bg-white transition-transform duration-300 lg:hidden ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-12 items-center border-b border-slate-200 px-3"><button onClick={() => setDrawerOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-lg"><X className="h-5 w-5 text-slate-600" /></button></div>
        <div className="h-[calc(100%-4rem)]">{navigation("full", () => setDrawerOpen(false))}</div>
      </div>
      {drawerOpen ? <button aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-[60] bg-slate-900/30 lg:hidden" /> : null}
    </div>
  )
}
