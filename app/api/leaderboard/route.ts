import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.rpc('get_leaderboard')

  if (error) {
    console.error('Leaderboard fetch failed:', error)
    return Response.json({ error: 'Failed to load leaderboard' }, { status: 500 })
  }

  return Response.json({ leaderboard: data, currentUserId: user.id })
}
