'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

type RoadmapRow = {
  id: string
  topic: string
  created_at: string
}

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)

  const [topic, setTopic] = useState('')
  const [savedRoadmaps, setSavedRoadmaps] = useState<RoadmapRow[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<{ streak: number; points: number; totalQuizzes: number } | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setEmail(session.user.email ?? null)
      setLoadingSession(false)

      // Only need id/topic/date for the list — no need to pull full content.
      const { data } = await supabase
        .from('roadmaps')
        .select('id, topic, created_at')
        .order('created_at', { ascending: false })
      if (data) setSavedRoadmaps(data as RoadmapRow[])

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

  const generateRoadmap = async () => {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
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

  if (loadingSession) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <span className="loader" />
    </div>
  )

return (
    <div className="max-w-2xl mx-auto px-5 pt-14 pb-28">
      <div className="flex justify-between items-center">
        <Image src="/Logo-StudySpark-rbg.png" alt="StudySpark" height={48} width={180} priority />
        <button
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            router.replace('/login')
          }}
          className="px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-soft"
        >
          Sign out
        </button>
      </div>

      <p className="text-muted mt-4">Logged in as {email}</p>

      {stats && (
  <div className="flex gap-6 mt-3 text-sm items-center">
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

      <h1 className="text-3xl font-bold mt-10 mb-4">What do you want to learn?</h1>
      <div className="flex gap-3">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !generating && topic.trim() && generateRoadmap()}
          placeholder="e.g. Calculus derivatives"
          className="flex-1 px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary"
        />
        <button
          onClick={generateRoadmap}
          disabled={generating || !topic.trim()}
          style={{ background: '#3b6b96' }}
          className="px-6 py-3 rounded-xl font-bold text-white hover:opacity-90"
        >
          {generating ? 'Generating…' : 'Generate'}
        </button>
      </div>

      {error && <p className="text-danger mt-3">{error}</p>}

      {savedRoadmaps.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent roadmaps</h2>
            {savedRoadmaps.length > 3 && (
              <Link href="/roadmaps" className="text-sm text-accent-blue hover:underline font-medium">
                View all →
              </Link>
            )}
          </div>
          <div className="space-y-3">
            {savedRoadmaps.slice(0, 3).map((r) => (
              <Link
                key={r.id}
                href={`/roadmap/${r.id}`}
                className="card-soft block hover:opacity-90 transition"
              >
                <strong className="text-foreground">{r.topic}</strong>
                <span className="text-muted text-xs ml-3">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}