'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

type Module = {
  title: string
  description: string
  submodules: { title: string; summary: string }[]
}

type RoadmapRow = {
  id: string
  topic: string
  content: { topic: string; modules: Module[] }
  created_at: string
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState<string | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)

  const [topic, setTopic] = useState('')
  const [activeRoadmap, setActiveRoadmap] = useState<RoadmapRow | null>(null)
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

      const { data } = await supabase
        .from('roadmaps')
        .select('id, topic, content, created_at')
        .order('created_at', { ascending: false })
      if (data) {
        setSavedRoadmaps(data as RoadmapRow[])
        const returnId = searchParams.get('roadmapId')
        if (returnId) {
          const match = (data as RoadmapRow[]).find(r => r.id === returnId)
          if (match) setActiveRoadmap(match)
        }
      }

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
      const newRow: RoadmapRow = await res.json()
      setSavedRoadmaps(prev => [newRow, ...prev])
      setActiveRoadmap(newRow)
    } catch {
      setError('Something went wrong generating your roadmap. Try again.')
    } finally {
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

      {activeRoadmap && (
        <div style={{ marginTop: 30 }}>
          <h2>{activeRoadmap.content.topic}</h2>
          {activeRoadmap.content.modules.map((mod, i) => (
            <div key={i} style={{ marginBottom: 20, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
              <h3 style={{ margin: '0 0 4px' }}>{mod.title}</h3>
              <p style={{ margin: '0 0 12px', color: '#666' }}>{mod.description}</p>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {mod.submodules.map((sub, j) => (
                  <li key={j} style={{ marginBottom: 6 }}>
                    <Link
                      href={`/learn/${activeRoadmap.id}/${i}/${j}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {sub.title}
                    </Link>
                    {' — '}{sub.summary}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {savedRoadmaps.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Your roadmaps</h2>
          {savedRoadmaps.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRoadmap(r)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                marginBottom: 8,
                background: activeRoadmap?.id === r.id ? '#EDE6FF' : '#F8F5FF',
                border: activeRoadmap?.id === r.id ? '1px solid #7941F2' : '1px solid #E2D9F3',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              <strong>{r.topic}</strong>
              <span style={{ color: '#999', fontSize: 12, marginLeft: 10 }}>
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <span className="loader" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
