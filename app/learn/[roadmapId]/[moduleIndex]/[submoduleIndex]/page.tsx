'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

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

  const { roadmapId, moduleIndex, submoduleIndex } = params as Record<string, string>
  const quizHref = `/learn/${roadmapId}/${moduleIndex}/${submoduleIndex}/quiz`

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to roadmaps
      </Link>

      {loading && (
        <div className="mt-10 text-gray-500">
          Generating your micro-lecture…
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
            <ReactMarkdown>{lecture.content}</ReactMarkdown>
          </div>
          <div className="mt-10 pt-6 border-t border-gray-200">
            <Link
              href={quizHref}
              className="inline-block px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Take quiz →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
