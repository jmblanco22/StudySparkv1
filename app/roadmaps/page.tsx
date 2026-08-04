'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type RoadmapRow = {
  id: string
  topic: string
  created_at: string
}

export default function RoadmapsPage() {
  const router = useRouter()
  const [roadmaps, setRoadmaps] = useState<RoadmapRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      const { data } = await supabase
        .from('roadmaps')
        .select('id, topic, created_at')
        .order('created_at', { ascending: false })
      if (data) setRoadmaps(data as RoadmapRow[])
      setLoading(false)
    })
  }, [router])

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <span className="loader" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-5 pt-14 pb-28">
      <Link href="/" className="text-sm text-accent-blue hover:underline">
        ← Back to home
      </Link>

      <h1 className="text-3xl font-bold mt-6 mb-8">Your roadmaps</h1>

      {roadmaps.length === 0 ? (
        <p className="text-muted">No roadmaps yet. Generate one from the home page!</p>
      ) : (
        <div className="space-y-3">
          {roadmaps.map((r) => (
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
      )}
    </div>
  )
}