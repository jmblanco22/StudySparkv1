import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('score, created_at')
    .order('created_at', { ascending: false })

  if (!attempts || attempts.length === 0) {
    return Response.json({ streak: 0, points: 0, totalQuizzes: 0 })
  }

  const points = attempts.reduce((acc, a) => acc + a.score * 10, 0)
  const totalQuizzes = attempts.length

  // Collect distinct UTC dates that have at least one attempt
  const dateSet = new Set(attempts.map((a) => a.created_at.slice(0, 10)))
  const dates = Array.from(dateSet).sort().reverse() // descending

  // Count consecutive days ending today or yesterday
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  let streak = 0
  if (dates[0] === today || dates[0] === yesterday) {
    let cursor = new Date(dates[0])
    for (const d of dates) {
      const expected = cursor.toISOString().slice(0, 10)
      if (d === expected) {
        streak++
        cursor = new Date(cursor.getTime() - 86400000)
      } else {
        break
      }
    }
  }

  return Response.json({ streak, points, totalQuizzes })
}
