'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LeaderboardList, { type LeaderboardEntry } from '@/app/components/LeaderboardList'

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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-28">
      <Link href="/" className="text-sm text-primary hover:underline">
        ← Back to home
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold mt-6 mb-8">Leaderboard</h1>

      {loading && <span className="loader" />}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && leaderboard.length === 0 && (
        <p className="text-gray-500">No quiz attempts yet. Be the first!</p>
      )}

      {leaderboard.length > 0 && (
        <LeaderboardList leaderboard={leaderboard} currentUserId={currentUserId} />
      )}
    </div>
  )
}