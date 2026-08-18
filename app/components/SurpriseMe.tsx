'use client'

import { useEffect, useState } from 'react'

type Suggestion = {
  topic: string
  summary: string
}

export default function SurpriseMe({
  onBuildRoadmap,
  building = false,
}: {
  onBuildRoadmap: (topic: string) => void
  building?: boolean
}) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // No synchronous setState here — `loading`/`error` already start at the right
  // values for a fresh mount, so this only needs to update state once the fetch settles.
  const fetchSuggestion = () => {
    fetch('/api/surprise-topic')
      .then(async (res) => {
        if (!res.ok) throw new Error('Request failed')
        setSuggestion(await res.json())
      })
      .catch(() => setError('Something went wrong. Try again.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSuggestion()
  }, [])

  // Retrying is a real state transition (back to loading), triggered from a click
  // handler rather than an effect, so setting state synchronously here is fine.
  const retry = () => {
    setLoading(true)
    setError('')
    fetchSuggestion()
  }

  return (
    <div className="card-soft">
      <h2 className="text-lg font-bold mb-3">Surprise me</h2>

      {loading && (
        <div className="flex justify-center py-6">
          <span className="loader" />
        </div>
      )}

      {!loading && error && (
        <>
          <p className="text-danger text-sm mb-3">{error}</p>
          <button
            onClick={retry}
            className="min-h-11 w-full px-4 rounded-lg text-sm border border-border hover:bg-soft-border"
          >
            Try again
          </button>
        </>
      )}

      {!loading && !error && suggestion && (
        <>
          <p className="font-semibold text-foreground mb-1">{suggestion.topic}</p>
          <p className="text-muted text-sm mb-4">{suggestion.summary}</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onBuildRoadmap(suggestion.topic)}
              disabled={building}
              className="min-h-11 px-4 rounded-lg font-bold text-white bg-primary hover:opacity-90 disabled:opacity-40"
            >
              {building ? 'Building…' : 'Yes, build this roadmap'}
            </button>
            <button
              onClick={retry}
              disabled={building}
              className="min-h-11 px-4 rounded-lg text-sm border border-border hover:bg-soft-border disabled:opacity-40"
            >
              No, try another
            </button>
          </div>
        </>
      )}
    </div>
  )
}
