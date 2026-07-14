import { createClient } from '@/lib/supabase/server'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateObject } from 'ai'
import { z } from 'zod'

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })

const roadmapSchema = z.object({        // an object that has...
  topic: z.string(),                    // a "topic" that's text
  modules: z.array(                     // a "modules" list, where each item is...
    z.object({
      title: z.string(),                // a title (text)
      description: z.string(),          // a description (text)
      submodules: z.array(              // a "submodules" list, each with...
        z.object({
          title: z.string(),            // a title
          summary: z.string(),          // a summary
        })
      ),
    })
  ),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { topic } = await req.json()

  if (!topic || typeof topic !== 'string') {
    return Response.json({ error: 'Topic is required' }, { status: 400 })
  }

  let object
  try {
    const result = await generateObject({ //how prompting works
      model: openrouter.chat('deepseek/deepseek-v4-flash'),
      schema: roadmapSchema,
      prompt: `Create a structured learning roadmap for someone who wants to learn "${topic}".
Break it into 3-5 modules, ordered so each builds on the previous.
Each module has 2-4 bite-sized submodules.
Keep titles short and every description to one sentence.`,
    })
    object = result.object
  } catch (error) {
    console.error('Roadmap generation failed:', error)
    return Response.json({ error: 'Failed to generate roadmap' }, { status: 500 })
  }

  const { data: row, error: insertError } = await supabase
    .from('roadmaps')
    .insert({ user_id: user.id, topic, content: object })
    .select('id, topic, content, created_at')
    .single()

  if (insertError || !row) {
    console.error('Roadmap insert failed:', insertError)
    return Response.json({ error: 'Failed to save roadmap' }, { status: 500 })
  }

  return Response.json(row)
}
