'use client'

import { useEffect, useRef } from 'react'

export type LeaderboardEntry = {
  user_id: string
  display_name: string
  points: number
  total_quizzes: number
}

export default function LeaderboardList({
  leaderboard,
  currentUserId,
  scrollToMe = false,
}: {
  leaderboard: LeaderboardEntry[]
  currentUserId: string | null
  scrollToMe?: boolean
}) {
  const myRowRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (scrollToMe && myRowRef.current) {
      myRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [scrollToMe, leaderboard])

  return (
    <div className="space-y-2">
      {leaderboard.map((entry, i) => {
        const isMe = entry.user_id === currentUserId
        return (
          <div
            key={entry.user_id}
            ref={isMe ? myRowRef : null}
            className={`flex items-center gap-4 px-4 py-3 rounded-lg border ${
              isMe ? 'border-secondary/50 bg-secondary/10' : 'border-border bg-surface'
            }`}
          >
            <span className="w-6 text-center text-sm font-medium text-gray-400">{i + 1}</span>
            <span className={`flex-1 font-medium ${isMe ? 'text-primary' : ''}`}>
              {entry.display_name}
              {isMe && <span className="ml-2 text-xs text-secondary">(you)</span>}
            </span>
            <span className="text-sm font-semibold">{entry.points} pts</span>
            <span className="text-xs text-gray-400 w-24 text-right">
              {entry.total_quizzes} quiz{Number(entry.total_quizzes) !== 1 ? 'zes' : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}