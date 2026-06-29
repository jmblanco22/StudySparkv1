import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { quizId, answers } = await req.json()

  if (!quizId || !Array.isArray(answers)) {
    return Response.json({ error: 'Missing quizId or answers' }, { status: 400 })
  }

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('questions')
    .eq('id', quizId)
    .single()

  if (!quiz) return Response.json({ error: 'Quiz not found' }, { status: 404 })

  const questions = quiz.questions as { correctIndex: number }[]
  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0)
  const total = questions.length

  const { error: insertError } = await supabase
    .from('quiz_attempts')
    .insert({ user_id: user.id, quiz_id: quizId, answers, score, total })

  if (insertError) console.error('Attempt insert failed:', insertError)

  return Response.json({ score, total })
}
