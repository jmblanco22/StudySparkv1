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
          visual: z.boolean(),
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
      prompt: `Create a structured learning roadmap for someone who wants to learn: "${topic}".

First, judge the scope of what the learner asked for, and size the roadmap to match:
- A narrow, simple, or single-skill request (e.g. "how to add two numbers," "what is a noun," "how to tie a shoe") → 1-2 modules with a few submodules. Do NOT pad a small question into a full course.
- A moderate topic (e.g. "basic photography," "intro to chess") → 2-3 modules.
- A broad subject (e.g. "calculus," "web development," "organic chemistry") → 4-5 modules.
Match the structure to what was actually asked. Never inflate a small question into a large roadmap.

- Order modules so each builds on the previous.
- Each module has 2-4 bite-sized submodules.
- Keep titles short and every description to one sentence.
- Set "visual" to true ONLY if this submodule teaches something that can be literally photographed: a physical object, material, tool, place, or a person performing a hands-on activity.
- Set "visual" to false for anything conceptual, mathematical, theoretical, or symbolic — including formulas, proofs, economics, philosophy, and abstract processes. When in doubt, use false.`,
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
