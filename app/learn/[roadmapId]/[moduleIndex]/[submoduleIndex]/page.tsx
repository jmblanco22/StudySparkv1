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

function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function render() {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ startOnLoad: false, theme: 'neutral', suppressErrorRendering: true })

        // Validate first — parse() throws on invalid syntax
        try {
          await mermaid.parse(code)
        } catch {
          if (!cancelled) setFailed(true)
          return
        }

        // Only render if parse passed
        try {
          const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`
          const { svg: rendered } = await mermaid.render(id, code)
          if (!cancelled) setSvg(rendered)
        } catch {
          if (!cancelled) setFailed(true)
        }
      } catch {
        if (!cancelled) setFailed(true)
      }
    }
    render()
    return () => { cancelled = true }
  }, [code])

  if (failed || !svg) return null

  return (
    <div
      className="my-6 flex justify-center p-4 bg-surface border border-border rounded-lg overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CodeBlock({ className, children }: any) {
  const language = /language-(\w+)/.exec(className ?? '')?.[1]
  if (language === 'mermaid') {
    return <MermaidDiagram code={String(children).replace(/\n$/, '')} />
  }
  return <code className={className}>{children}</code>
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
      <Link href="/" className="text-sm text-primary hover:underline">
        ← Back to roadmaps
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
            <ReactMarkdown components={{ code: CodeBlock }}>
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
