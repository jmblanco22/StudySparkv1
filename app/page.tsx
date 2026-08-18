'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import SurpriseMe from '@/app/components/SurpriseMe'

const MAX_FILE_BYTES = 10 * 1024 * 1024

const DESKTOP_QUERY = '(min-width: 1024px)'
function subscribeDesktop(callback: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY)
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}
function getIsDesktop() {
  return window.matchMedia(DESKTOP_QUERY).matches
}
function getIsDesktopServer() {
  return false
}

type RoadmapRow = {
  id: string
  topic: string
  created_at: string
  last_opened_at: string
}

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)

  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState<'topic' | 'file'>('topic')
  const [file, setFile] = useState<File | null>(null)
  const [savedRoadmaps, setSavedRoadmaps] = useState<RoadmapRow[]>([])
  const [totalRoadmaps, setTotalRoadmaps] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<{ streak: number; points: number; totalQuizzes: number } | null>(null)

  // Drives both the 5-vs-3 recent-roadmaps count and whether the surprise-me column
  // mounts at all — a CSS-only hide would still mount (and fire requests for) that
  // column on mobile, which is exactly what we don't want.
  const isDesktop = useSyncExternalStore(subscribeDesktop, getIsDesktop, getIsDesktopServer)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setEmail(session.user.email ?? null)
      setLoadingSession(false)

      // Only need id/topic/dates for the list — no need to pull full content.
      // `count: 'exact'` gets the true total alongside the 5 most-recently-used rows,
      // so "View all" can still tell whether more roadmaps exist beyond this page.
      const { data, count } = await supabase
        .from('roadmaps')
        .select('id, topic, created_at, last_opened_at', { count: 'exact' })
        .order('last_opened_at', { ascending: false })
        .limit(5)
      if (data) setSavedRoadmaps(data as RoadmapRow[])
      setTotalRoadmaps(count ?? 0)

      fetch('/api/stats')
        .then((r) => r.json())
        .then((s) => setStats(s))
        .catch(() => null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login')
      else setEmail(session.user.email ?? null)
    })

    return () => subscription.unsubscribe()
  }, [router])

  // Accepts an optional override so callers (like "Yes, build this roadmap" from the
  // surprise-me card) can generate immediately without racing the async `setTopic` update.
  const generateRoadmap = async (overrideTopic?: string) => {
    const topicToUse = overrideTopic ?? topic
    if (!topicToUse.trim()) return
    setTopic(topicToUse)
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicToUse }),
      })
      if (!res.ok) throw new Error('Request failed')
      const newRow: { id: string } = await res.json()
      // Go straight to the new roadmap's own page.
      router.push(`/roadmap/${newRow.id}`)
    } catch {
      setError('Something went wrong generating your roadmap. Try again.')
      setGenerating(false)
    }
  }

  const generateRoadmapFromFile = async (uploadedFile: File) => {
    setGenerating(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)
      const res = await fetch('/api/roadmap', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Request failed')
      }
      const newRow: { id: string } = await res.json()
      router.push(`/roadmap/${newRow.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong generating your roadmap. Try again.')
      setGenerating(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    if (!selected) {
      setFile(null)
      return
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError('That file is too big — please upload something under 10MB.')
      setFile(null)
      e.target.value = ''
      return
    }
    setError('')
    setFile(selected)
  }

  const handleGenerateClick = () => {
    if (mode === 'file') {
      if (file) generateRoadmapFromFile(file)
    } else {
      generateRoadmap()
    }
  }

  if (loadingSession) return (
    <div className="flex items-center justify-center h-screen">
      <span className="loader" />
    </div>
  )

const visibleCount = isDesktop ? 5 : 3

return (
    <div className="max-w-2xl lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-10 sm:pt-14 pb-28">
      <div className="flex justify-end items-center gap-3">
        <button
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            router.replace('/login')
          }}
          className="min-h-11 px-3 sm:px-4 rounded-lg text-sm border border-border hover:bg-soft shrink-0"
        >
          Sign out
        </button>
      </div>

      <p className="text-muted mt-4 text-sm sm:text-base break-words">Logged in as {email}</p>

      <div className="mt-8 sm:mt-10 lg:grid lg:grid-cols-3 lg:gap-8 lg:items-stretch lg:min-h-[500px]">
        {/* Generator — first in DOM so it's what mobile shows first; center column on desktop */}
        <div className="lg:order-2 lg:flex lg:flex-col lg:justify-center">
          <div className="flex justify-center mb-4">
            <Image src="/studysparklogoapp.png" alt="StudySpark" height={1000} width={1000} priority className="h-40 sm:h-52 w-auto" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-4">What do you want to learn?</h1>

          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => { setMode('topic'); setError('') }}
              className={`min-h-9 px-3 rounded-lg text-sm font-medium border ${
                mode === 'topic' ? 'bg-primary text-white border-primary' : 'border-border hover:bg-soft'
              }`}
            >
              Type a topic
            </button>
            <button
              type="button"
              onClick={() => { setMode('file'); setError('') }}
              className={`min-h-9 px-3 rounded-lg text-sm font-medium border ${
                mode === 'file' ? 'bg-primary text-white border-primary' : 'border-border hover:bg-soft'
              }`}
            >
              Upload notes
            </button>
          </div>

          {mode === 'topic' ? (
            <div key="topic-mode" className="flex flex-col sm:flex-row lg:flex-col gap-3">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !generating && topic.trim() && generateRoadmap()}
                placeholder="e.g. Calculus derivatives"
                className="flex-1 min-h-11 px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleGenerateClick}
                disabled={generating || !topic.trim()}
                className="min-h-11 px-6 py-3 rounded-xl font-bold text-white bg-primary hover:opacity-90 disabled:opacity-40"
              >
                {generating ? 'Generating…' : 'Generate'}
              </button>
            </div>
          ) : (
            <div key="file-mode" className="flex flex-col gap-3">
              <input
                type="file"
                accept=".txt,.pdf"
                onChange={handleFileChange}
                className="flex-1 min-h-11 px-3 py-2 rounded-xl border border-border text-sm file:mr-3 file:min-h-9 file:px-3 file:rounded-lg file:border-0 file:bg-soft file:font-medium"
              />
              <p className="text-muted text-xs">.txt or .pdf, up to 10MB</p>
              <button
                onClick={handleGenerateClick}
                disabled={generating || !file}
                className="min-h-11 px-6 py-3 rounded-xl font-bold text-white bg-primary hover:opacity-90 disabled:opacity-40"
              >
                {generating ? 'Generating…' : 'Generate from notes'}
              </button>
            </div>
          )}

          {stats && (
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 text-sm items-center">
              <span className="flex items-center gap-1.5 font-semibold text-success">
                <img src="/streak.svg" alt="" width={18} height={18}
                  style={{ filter: 'invert(41%) sepia(93%) saturate(500%) hue-rotate(85deg)' }} />
                {stats.streak}-day streak
              </span>
              <span className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--color-gold)' }}>
                <img src="/points.svg" alt="" width={18} height={18}
                  style={{ filter: 'invert(72%) sepia(85%) saturate(700%) hue-rotate(2deg)' }} />
                {stats.points} pts
              </span>
              <span className="text-muted">
                {stats.totalQuizzes} quiz{stats.totalQuizzes !== 1 ? 'zes' : ''} completed
              </span>
            </div>
          )}

          {error && <p className="text-danger mt-3">{error}</p>}
        </div>

        {/* Recent roadmaps — left column on desktop */}
        {savedRoadmaps.length > 0 && (
          <div className="mt-12 lg:mt-0 lg:order-1 lg:flex lg:flex-col lg:justify-center">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Recent roadmaps</h2>
              {totalRoadmaps > visibleCount && (
                <Link href="/roadmaps" className="text-sm text-accent-blue hover:underline font-medium">
                  View all →
                </Link>
              )}
            </div>
            <div className="space-y-3">
              {savedRoadmaps.slice(0, visibleCount).map((r) => (
                <Link
                  key={r.id}
                  href={`/roadmap/${r.id}`}
                  className="card-soft flex flex-wrap items-baseline gap-x-3 gap-y-1 hover:opacity-90 transition"
                >
                  <strong className="text-foreground">{r.topic}</strong>
                  <span className="text-muted text-xs">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Surprise me — right column, desktop only. isDesktop gates actual mounting,
            not just visibility, so this never renders (or fires requests) on mobile. */}
        {isDesktop && (
          <div className="lg:order-3 lg:flex lg:flex-col lg:justify-center">
            <SurpriseMe onBuildRoadmap={(t) => generateRoadmap(t)} building={generating} />
          </div>
        )}
      </div>
    </div>
  )
}