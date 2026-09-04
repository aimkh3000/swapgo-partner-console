"use client"

// Purpose: Let a partner connect their own browser-visible MapTiler style without rebuilding the console.

import { CheckCircle2, Link2, RotateCcw } from "lucide-react"
import { type FormEvent, useState } from "react"

import { type MapProviderConfig, parseMapTilerConfig, useMapProviderConfig } from "@/components/MapProviderConfig"

export default function MapTilerSetupForm() {
  const config = useMapProviderConfig()
  return <MapTilerSetupFormState key={config.styleUrl} config={config} />
}

function MapTilerSetupFormState({ config }: { config: ReturnType<typeof useMapProviderConfig> & MapProviderConfig }) {
  const [input, setInput] = useState(config.styleUrl)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError("")
    setSaved(false)
    try {
      const candidate = parseMapTilerConfig(input)
      const response = await fetch(candidate.styleUrl, { cache: "no-store" })
      if (!response.ok) throw new Error(`MapTiler returned status ${response.status}.`)
      config.save(candidate.styleUrl)
      setSaved(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The MapTiler URL could not be verified.")
    } finally {
      setPending(false)
    }
  }

  function reset() {
    config.reset()
    setError("")
    setSaved(false)
  }

  return (
    <section className="max-w-[840px] rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-700">
        <Link2 className="h-4 w-4 text-teal-700" />Connect MapTiler
      </div>
      <p className="mt-1 text-[12px] leading-5 text-slate-500">
        Paste your MapTiler style URL. A raw MapTiler browser key is also accepted and will use the Streets v2 style.
      </p>
      <form onSubmit={submit} className="mt-3 flex max-w-[760px] flex-wrap items-start gap-2">
        <label className="min-w-[280px] flex-1">
          <span className="sr-only">MapTiler style URL or browser key</span>
          <input
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              setSaved(false)
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder="https://api.maptiler.com/maps/streets-v2/style.json?key=…"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[12px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-600"
          />
        </label>
        <button disabled={pending || !input.trim()} className="h-10 rounded-lg bg-teal-700 px-4 text-[13px] font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300">
          {pending ? "Checking…" : "Connect"}
        </button>
        {config.source === "browser" ? (
          <button type="button" onClick={reset} className="flex h-10 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <RotateCcw className="h-3.5 w-3.5" />Use environment key
          </button>
        ) : null}
      </form>
      {error ? <p className="mt-2 text-[12px] text-rose-700">{error}</p> : null}
      {saved ? <p className="mt-2 flex items-center gap-1.5 text-[12px] text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Connected. Maps now use this style.</p> : null}
      {!saved && config.styleUrl ? (
        config.source === "project" ? (
          <p className="mt-2 max-w-[760px] rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">
            Maps currently use <code>NEXT_PUBLIC_MAPTILER_API_KEY</code> from this deployment. Replace it with your own browser-restricted MapTiler key before publishing the console.
          </p>
        ) : (
          <p className="mt-2 text-[11px] text-slate-500">Current source: this browser.</p>
        )
      ) : null}
    </section>
  )
}
