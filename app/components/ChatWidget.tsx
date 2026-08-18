'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { usePageContent } from '@/app/context/PageContentContext'

export default function ChatWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const { pageContent } = usePageContent()

  // A single stable transport — page context is attached per-message instead (see
  // handleSubmit), so this never needs to be recreated as the user navigates.
  const [transport] = useState(() => new DefaultChatTransport({ api: '/api/chat' }))

  const { messages, sendMessage, status } = useChat({ transport })

  const listRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, status])

  const busy = status === 'submitted' || status === 'streaming'

  // Only show while actually inside a roadmap (overview, lecture, or quiz pages) —
  // not on the home page, the "/roadmaps" list, leaderboard, or login.
  if (!pathname.startsWith('/roadmap/')) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || busy) return
    sendMessage(
      { text: input },
      {
        body: {
          roadmapId: pageContent?.roadmapId,
          currentSubmodule:
            pageContent?.type === 'lecture' && pageContent.summary
              ? { title: pageContent.title, summary: pageContent.summary }
              : undefined,
        },
      }
    )
    setInput('')
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-36 right-4 sm:right-6 z-[60] w-[90vw] max-w-sm h-[70vh] max-h-[520px] bg-white rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-white shrink-0">
            <span className="font-semibold">
              {pageContent ? `Ask about: ${pageContent.title}` : 'Study assistant'}
            </span>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-white/80 hover:text-white text-xl leading-none">
              &times;
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-muted text-sm">
                {pageContent
                  ? `Ask me anything about "${pageContent.title}".`
                  : 'Ask me anything about what you’re studying.'}
              </p>
            )}
            {messages.map((m) => {
              const text = m.parts.filter((p) => p.type === 'text').map((p) => p.text).join('')
              if (!text) return null
              const isUser = m.role === 'user'
              return (
                <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      isUser ? 'bg-primary text-white' : 'bg-soft text-foreground'
                    }`}
                  >
                    {text}
                  </div>
                </div>
              )
            })}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-soft text-muted rounded-xl px-3 py-2 text-sm">Thinking…</div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-border shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="flex-1 min-h-11 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              className="min-h-11 px-4 rounded-lg font-medium text-white bg-primary hover:opacity-90 disabled:opacity-40 text-sm shrink-0"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Open study assistant chat'}
        className="fixed bottom-20 right-4 sm:right-6 z-[60] w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:opacity-90"
      >
        {open ? (
          <span className="text-2xl leading-none">&times;</span>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>
    </>
  )
}
