'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

type LectureData = {
  content: string
  moduleTitle: string
  submoduleTitle: string
}

export default function LecturePage() {
  const params = useParams()
  const router = useRouter()
  const [lecture, setLecture] = useState<LectureData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const { id: roadmapId, moduleIndex, submoduleIndex } = params as Record<string, string>
  const quizHref = `/roadmap/${roadmapId}/${moduleIndex}/${submoduleIndex}/quiz`

  // Load the lecture text.
  useEffect(() => {
    const url = `/api/lecture?roadmapId=${roadmapId}&moduleIndex=${moduleIndex}&submoduleIndex=${submoduleIndex}`

    fetch(url)
      .then(async (res) => {
        if (res.status === 401) { router.replace('/login'); return }
        if (!res.ok) throw new Error('Failed to load lecture')
        const data = await res.json()
        setLecture(data)
      })
      .catch(() => setError('Something went wrong loading this lecture. Try again.'))
      .finally(() => setLoading(false))
  }, [params, router])

  // After the text loads, resolve any [FIGURE:...] placeholders into images.
  useEffect(() => {
    if (!lecture) return
    const figureRegex = /\[FIGURE:\s*([^|\]]+)\|\s*([^\]]+)\]/g
    const figures = [...lecture.content.matchAll(figureRegex)]
    if (figures.length === 0) return  // nothing to do (and prevents an infinite loop)

    let cancelled = false
    ;(async () => {
      // Fetch every image in parallel.
      const urls = await Promise.all(
        figures.map(async (f) => {
          try {
            const res = await fetch(`/api/image?query=${encodeURIComponent(f[1].trim())}`)
            const { url } = await res.json()
            return url as string | null
          } catch {
            return null
          }
        })
      )

      // Swap each placeholder for an image, or remove it if none was found.
      let updated = lecture.content
      figures.forEach((f, i) => {
        updated = updated.replace(f[0], urls[i] ? `![${f[2].trim()}](${urls[i]})` : '')
      })

      if (cancelled) return
      setLecture({ ...lecture, content: updated })

      // Cache the finished version so the next visit is instant with images.
      fetch('/api/lecture/save-images', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roadmapId, moduleIndex, submoduleIndex, content: updated }),
      }).catch(() => null)
    })()

    return () => { cancelled = true }
  }, [lecture?.content, roadmapId, moduleIndex, submoduleIndex])

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href={`/roadmap/${roadmapId}`} className="text-sm text-primary hover:underline">
        ← Back to roadmap
      </Link>

      {loading && (
        <div className="mt-10 flex justify-center">
          <span className="loader" />
        </div>
      )}

      {error && (
        <p className="mt-10 text-red-600">{error}</p>
      )}

      {lecture && (
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-1">{lecture.moduleTitle}</p>
          <h1 className="text-2xl font-bold mb-6">{lecture.submoduleTitle}</h1>
          <div className="prose prose-neutral max-w-none">
            <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
              {lecture.content.replace(/^#{1,6}\s+.+\n?/, '')}
            </ReactMarkdown>
          </div>
          <div className="mt-10 pt-6 border-t border-gray-200">
            <Link
              href={quizHref}
              className="inline-block px-5 py-3 bg-primary text-white rounded-lg hover:opacity-90 font-medium"
            >
              Take quiz →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}