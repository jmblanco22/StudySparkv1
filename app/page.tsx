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
    <div style={{ maxWidth: 700, margin: '60px auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Image src="/Logo-StudySpark-rbg.png" alt="StudySpark" height={48} width={180} priority />
        <div className="flex items-center gap-3">
          <Link href="/leaderboard" className="text-sm text-primary hover:underline">
            Leaderboard
          </Link>
          <button
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.signOut()
              router.replace('/login')
            }}
            style={{ padding: '6px 12px', background: '#F8F5FF', border: '1px solid #E2D9F3', borderRadius: 6 }}
          >
            Sign out
          </button>
        </div>
      </div>
      <p style={{ color: '#666' }}>Logged in as {email}</p>

      {stats && (
        <div className="flex gap-6 mt-3 text-sm text-gray-600">
          <span className="font-medium text-success">{stats.streak}-day streak</span>
          <span className="font-medium text-success">{stats.points} pts</span>
          <span className="text-gray-400">{stats.totalQuizzes} quiz{stats.totalQuizzes !== 1 ? 'zes' : ''} completed</span>
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        <p>What do you want to learn?</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !generating && topic.trim() && generateRoadmap()}
            placeholder="e.g. Calculus derivatives"
            style={{ flex: 1, padding: 10 }}
          />
          <button
            onClick={generateRoadmap}
            disabled={generating || !topic.trim()}
            style={{ padding: '10px 16px', background: '#7941F2', color: 'white', border: 'none', borderRadius: 6 }}
          >
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#F26D3D' }}>{error}</p>}

      {savedRoadmaps.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Your roadmaps</h2>
          {savedRoadmaps.map((r) => (
            <Link
              key={r.id}
              href={`/roadmap/${r.id}`}
              style={{
                display: 'block',
                padding: '10px 14px',
                marginBottom: 8,
                background: '#F8F5FF',
                border: '1px solid #E2D9F3',
                borderRadius: 6,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <strong>{r.topic}</strong>
              <span style={{ color: '#999', fontSize: 12, marginLeft: 10 }}>
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}