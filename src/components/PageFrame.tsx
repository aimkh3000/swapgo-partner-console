import type { ReactNode } from "react"

export default function PageFrame({ title, centerAction, contained = false, children }: { title: string; centerAction?: ReactNode; contained?: boolean; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <div className="relative flex h-12 min-h-12 shrink-0 items-center gap-2 border-b border-slate-100 px-3">
        {title ? <h1 className="min-w-0 truncate text-[15px] font-normal text-slate-600">{title}</h1> : null}
        {centerAction ? <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">{centerAction}</div> : null}
      </div>
      <div className={`min-h-0 flex-1 ${contained ? "overflow-hidden" : "overflow-y-auto"}`}>
        <div className={`mx-auto w-full max-w-[1180px] px-3 py-3 sm:px-4 lg:px-5 ${contained ? "h-full" : ""}`}>
          {children}
        </div>
      </div>
    </div>
  )
}
