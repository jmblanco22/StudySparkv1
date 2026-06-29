'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type LeaderboardEntry = {
  user_id: string
  display_name: string
  points: number
  total_quizzes: number
}

export default function LeaderboardPage() {
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(async (res) => {
        if (res.status === 401) { router.replace('/login'); return }
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        setLeaderboard(data.leaderboard)
        setCurrentUserId(data.currentUserId)
      })
      .catch(() => setError('Could not load the leaderboard. Try again.'))
      .finally(() => setLoading(false))
  }, [router])

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to home
      </Link>

      <h1 className="text-2xl font-bold mt-6 mb-8">Leaderboard</h1>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && leaderboard.length === 0 && (
        <p className="text-gray-500">No quiz attempts yet. Be the first!</p>
      )}

      {leaderboard.length > 0 && (
        <div className="space-y-2">
          {leaderboard.map((entry, i) => {
            const isMe = entry.user_id === currentUserId
            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg border ${
                  isMe
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <span className="w-6 text-center text-sm font-medium text-gray-400">
                  {i + 1}
                </span>
                <span className={`flex-1 font-medium ${isMe ? 'text-blue-700' : ''}`}>
                  {entry.display_name}
                  {isMe && <span className="ml-2 text-xs text-blue-500">(you)</span>}
                </span>
                <span className="text-sm font-semibold">{entry.points} pts</span>
                <span className="text-xs text-gray-400 w-24 text-right">
                  {entry.total_quizzes} quiz{Number(entry.total_quizzes) !== 1 ? 'zes' : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
