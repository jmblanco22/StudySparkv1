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
    <div className="flex items-center justify-center h-screen">
      <span className="loader" />
    </div>
  )

  if (error || !roadmap) return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-24">
      <Link href="/" className="text-sm text-primary hover:underline">← Back to dashboard</Link>
      <p className="mt-5 text-danger">{error || 'Roadmap not found.'}</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-24">
      <Link href="/" className="text-sm text-primary hover:underline">← Back to dashboard</Link>

      <h1 className="text-2xl sm:text-3xl font-bold mt-5 mb-6 sm:mb-8">
        {roadmap.content.topic}
      </h1>

      {roadmap.content.modules.map((mod, i) => (
        <div key={i} className="card mb-5">
          <h3 className="font-semibold text-base mb-1">{mod.title}</h3>
          <p className="text-muted mb-3">{mod.description}</p>
          <ul className="space-y-2 pl-5">
            {mod.submodules.map((sub, j) => (
              <li key={j}>
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