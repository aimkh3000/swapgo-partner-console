"use client"

// Purpose: Manual Partner API connection without persisting the raw key in browser storage.

import { Eye, EyeOff, KeyRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

export default function ConnectForm({ invalidKey = false }: { invalidKey?: boolean }) {
  const router = useRouter()
  const [apiKey, setApiKey] = useState("")
  const [visible, setVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(invalidKey ? "The connected key is no longer valid. Enter an active key to continue." : "")

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError("")
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    })
    if (!response.ok) {
      setError("The key could not be verified. Check its status and expiry.")
      setPending(false)
      return
    }
    router.replace("/")
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-[13px] font-medium text-slate-600">Partner API key</span>
        <span className="relative mt-1.5 block">
          <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            type={visible ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            maxLength={180}
            placeholder="sgp_test_…"
            className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-11 text-[14px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-600"
          />
          <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Hide key" : "Show key"} className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
      </label>
      {error ? <p className="text-[12px] text-rose-700">{error}</p> : null}
      <button disabled={pending || !apiKey.trim()} className="h-10 w-full rounded-lg bg-teal-700 px-4 text-[14px] font-medium text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300">
        {pending ? "Checking…" : "Connect API"}
      </button>
      <p className="text-[11px] leading-5 text-slate-500">
        The server verifies the key and keeps it in an encrypted HttpOnly session. It is never stored in localStorage or returned to the browser.
      </p>
    </form>
  )
}
