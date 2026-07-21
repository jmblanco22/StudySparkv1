import { createClient } from '@/lib/supabase/server'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateObject } from 'ai'
import { z } from 'zod'

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })

const quizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      correctIndex: z.number().int().min(0).max(3),
    })
  ).length(4),
})

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const roadmapId = searchParams.get('roadmapId')
  const moduleIndex = parseInt(searchParams.get('moduleIndex') ?? '')
  const submoduleIndex = parseInt(searchParams.get('submoduleIndex') ?? '')

  if (!roadmapId || isNaN(moduleIndex) || isNaN(submoduleIndex)) {
    return Response.json({ error: 'Missing or invalid params' }, { status: 400 })
  }

  // Always fetch roadmap for counts and context
  const { data: roadmap } = await supabase
    .from('roadmaps')
    .select('content')
    .eq('id', roadmapId)
    .single()

  const totalModules: number = roadmap?.content?.modules?.length ?? 0
  const totalSubmodules: number = roadmap?.content?.modules?.[moduleIndex]?.submodules?.length ?? 0

  // Check cache
  const { data: cached } = await supabase
    .from('quizzes')
    .select('id, questions')
    .eq('roadmap_id', roadmapId)
    .eq('module_index', moduleIndex)
    .eq('submodule_index', submoduleIndex)
    .single()

  if (cached) return Response.json({ quizId: cached.id, questions: cached.questions, totalModules, totalSubmodules })

  // Fetch lecture content for context
  const { data: lecture } = await supabase
    .from('lectures')
    .select('content')
    .eq('roadmap_id', roadmapId)
    .eq('module_index', moduleIndex)
    .eq('submodule_index', submoduleIndex)
    .single()

  // Fallback to roadmap submodule summary if no lecture cached yet
  let context = (lecture?.content ?? '').replace(/!\[.*?\]\(.*?\)/g, '')
  if (!context) {
    const sub = roadmap?.content?.modules?.[moduleIndex]?.submodules?.[submoduleIndex]
    context = sub ? `${sub.title}: ${sub.summary}` : ''
  }

  if (!context) return Response.json({ error: 'No content found to generate quiz from' }, { status: 404 })

  let questions
  try {
    const result = await generateObject({
      model: openrouter.chat('deepseek/deepseek-v4-flash'),
      schema: quizSchema,
      prompt: `Based on the following study material, generate exactly 4 multiple-choice questions for a quick study session.
Each question must have exactly 4 options (A–D) and one correct answer.
Keep questions simple and straightforward — test basic recall and key facts, not nuanced analysis.
Wrong answer options should be clearly different from the correct one so students can build confidence.
Avoid trick questions or overly similar answer choices.

Material:
${context}`,
    })
    questions = result.object.questions
  } catch (err) {
    console.error('Quiz generation failed:', err)
    return Response.json({ error: 'Failed to generate quiz' }, { status: 500 })
  }

  const { data: inserted, error: insertError } = await supabase
    .from('quizzes')
    .insert({
      user_id: user.id,
      roadmap_id: roadmapId,
      module_index: moduleIndex,
      submodule_index: submoduleIndex,
      questions,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    console.error('Quiz insert failed:', insertError)
    return Response.json({ error: 'Failed to save quiz' }, { status: 500 })
  }

  return Response.json({ quizId: inserted.id, questions, totalModules, totalSubmodules })
}
