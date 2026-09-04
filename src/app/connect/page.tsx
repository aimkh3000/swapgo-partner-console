// Purpose: English-only Partner API connection screen.

import { ArrowLeftRight } from "lucide-react"
import { redirect } from "next/navigation"

import ConnectForm from "@/components/ConnectForm"
import { readApiKey } from "@/lib/session"

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const invalidKey = params.reason === "invalid-key"
  if (!invalidKey && await readApiKey()) redirect("/")
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-[440px] rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-7">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><ArrowLeftRight className="h-5 w-5" /></div>
        <div className="mt-4 text-[12px] font-medium text-teal-700">SwapGo.me</div>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-slate-700">Partner Console</h1>
        <p className="mt-2 text-[13px] leading-6 text-slate-500">An independent partner interface powered only by SwapGo.me Partner API.</p>
        <ConnectForm invalidKey={invalidKey} />
      </section>
    </main>
  )
}
