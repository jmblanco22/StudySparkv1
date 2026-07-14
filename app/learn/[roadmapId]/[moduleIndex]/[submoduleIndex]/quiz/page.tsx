'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Question = {
  question: string
  options: string[]
  correctIndex: number
}

type QuizData = {
  quizId: string
  questions: Question[]
  totalModules: number
  totalSubmodules: number
}

type ResultData = {
  score: number
  total: number
}

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const { roadmapId, moduleIndex, submoduleIndex } = params as Record<string, string>

  const lectureHref = `/learn/${roadmapId}/${moduleIndex}/${submoduleIndex}`

  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // selected answer index per question (null = unanswered)
  const [selected, setSelected] = useState<(number | null)[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)

  useEffect(() => {
    const url = `/api/quiz?roadmapId=${roadmapId}&moduleIndex=${moduleIndex}&submoduleIndex=${submoduleIndex}`
    fetch(url)
      .then(async (res) => {
        if (res.status === 401) { router.replace('/login'); return }
        if (!res.ok) throw new Error('Failed to load quiz')
        const data: QuizData = await res.json()
        setQuiz(data)
        setSelected(new Array(data.questions.length).fill(null))
      })
      .catch(() => setError('Something went wrong loading the quiz. Try again.'))
      .finally(() => setLoading(false))
  }, [roadmapId, moduleIndex, submoduleIndex, router])

  const allAnswered = selected.length > 0 && selected.every((s) => s !== null)

  const handleSubmit = async () => {
    if (!quiz || !allAnswered) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/quiz/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: quiz.quizId, answers: selected }),
      })
      if (!res.ok) throw new Error('Submit failed')
      const data: ResultData = await res.json()
      setResult(data)
    } catch {
      setError('Something went wrong submitting your answers.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetake = () => {
    setResult(null)
    setSelected(new Array(quiz!.questions.length).fill(null))
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 flex justify-center">
        <span className="loader" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <p className="text-danger">{error}</p>
        <Link href={lectureHref} className="text-sm text-primary hover:underline mt-4 block">
          ← Back to lecture
        </Link>
      </div>
    )
  }

  if (result) {
    const pct = Math.round((result.score / result.total) * 100)
    const mIdx = parseInt(moduleIndex)
    const sIdx = parseInt(submoduleIndex)
    const nextLectureHref = sIdx + 1 < quiz!.totalSubmodules
      ? `/learn/${roadmapId}/${mIdx}/${sIdx + 1}`
      : mIdx + 1 < quiz!.totalModules
        ? `/learn/${roadmapId}/${mIdx + 1}/0`
        : null

    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">Quiz Results</h1>
        <p className="text-4xl font-bold mb-1">{result.score}/{result.total}</p>
        <p className="text-gray-500 mb-6">{pct}% correct</p>

        <div className="space-y-4 mb-8">
          {quiz!.questions.map((q, i) => {
            const isCorrect = selected[i] === q.correctIndex
            return (
              <div
                key={i}
                className={`p-4 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}
              >
                <p className="font-medium mb-2">{q.question}</p>
                <p className="text-sm">
                  {isCorrect ? '✓' : '✗'} You chose: <span className="font-medium">{q.options[selected[i]!]}</span>
                </p>
                {!isCorrect && (
                  <p className="text-sm text-green-700 mt-1">
                    Correct: <span className="font-medium">{q.options[q.correctIndex]}</span>
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-3">
          {nextLectureHref ? (
            <Link href={nextLectureHref} className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90">
              Next lecture →
            </Link>
          ) : null}
          <button onClick={handleRetake} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            Try again
          </button>
          <Link href={`/?roadmapId=${roadmapId}`} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            Back to roadmap
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href={lectureHref} className="text-sm text-primary hover:underline">
        ← Back to lecture
      </Link>

      <h1 className="text-2xl font-bold mt-6 mb-8">Quiz</h1>

      <div className="space-y-8">
        {quiz!.questions.map((q, i) => (
          <div key={i}>
            <p className="font-medium mb-3">{i + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, j) => (
                <button
                  key={j}
                  onClick={() => setSelected((prev) => prev.map((v, idx) => idx === i ? j : v))}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selected[i] === j
                      ? 'border-primary bg-primary/10 text-foreground font-medium'
                      : 'border-border hover:border-secondary/50 hover:bg-secondary/5'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className="mt-10 px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting…' : 'Submit answers'}
      </button>
    </div>
  )
}
