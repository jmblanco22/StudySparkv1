'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/slug'


type Module = {
  title: string
  description: string
  submodules: { title: string; summary: string }[]
}

type RoadmapRow = {
  id: string
  topic: string
  content: { topic: string; modules: Module[] }
}

export default function RoadmapPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const [roadmap, setRoadmap] = useState<RoadmapRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }

      // RLS means this only returns the roadmap if it belongs to this user.
      const { data } = await supabase
        .from('roadmaps')
        .select('id, topic, content')
        .eq('id', id)
        .single()

      if (data) setRoadmap(data as RoadmapRow)
      else setError('Roadmap not found.')
      setLoading(false)
    })
  }, [id, router])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <span className="loader" />
    </div>
  )

  if (error || !roadmap) return (
    <div style={{ maxWidth: 700, margin: '60px auto', padding: 20 }}>
      <Link href="/" className="text-sm text-primary hover:underline">← Back to dashboard</Link>
      <p style={{ marginTop: 20, color: '#F26D3D' }}>{error || 'Roadmap not found.'}</p>
    </div>
  )

  return (
    <div style={{ maxWidth: 700, margin: '60px auto', padding: 20 }}>
      <Link href="/" className="text-sm text-primary hover:underline">← Back to dashboard</Link>

      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '20px 0 30px' }}>
        {roadmap.content.topic}
      </h1>

      {roadmap.content.modules.map((mod, i) => (
        <div key={i} style={{ marginBottom: 20, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
          <h3 style={{ margin: '0 0 4px' }}>{mod.title}</h3>
          <p style={{ margin: '0 0 12px', color: '#666' }}>{mod.description}</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {mod.submodules.map((sub, j) => (
              <li key={j} style={{ marginBottom: 6 }}>
                <Link
                  href={`/roadmap/${roadmap.id}/${i}-${slugify(mod.title)}/${j}-${slugify(sub.title)}`}
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
  )
}