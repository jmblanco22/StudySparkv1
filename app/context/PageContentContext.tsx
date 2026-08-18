'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

export type PageContent = {
  type: 'lecture' | 'roadmap'
  title: string
  content: string
  roadmapId?: string
  // Short one-line summary — only set for 'lecture' pages, used by /api/chat to
  // tell the assistant which submodule the learner is currently on.
  summary?: string
}

type PageContentContextValue = {
  pageContent: PageContent | null
  setPageContent: (content: PageContent | null) => void
}

const PageContentContext = createContext<PageContentContextValue | null>(null)

export function PageContentProvider({ children }: { children: ReactNode }) {
  const [pageContent, setPageContent] = useState<PageContent | null>(null)
  return (
    <PageContentContext.Provider value={{ pageContent, setPageContent }}>
      {children}
    </PageContentContext.Provider>
  )
}

export function usePageContent() {
  const ctx = useContext(PageContentContext)
  if (!ctx) throw new Error('usePageContent must be used within a PageContentProvider')
  return ctx
}
