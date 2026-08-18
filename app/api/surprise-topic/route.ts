import { createClient } from '@/lib/supabase/server'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateObject } from 'ai'
import { z } from 'zod'

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })

const surpriseSchema = z.object({
  topic: z.string(),
  summary: z.string(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await generateObject({
      model: openrouter.chat('deepseek/deepseek-v4-flash'),
      schema: surpriseSchema,
      temperature: 1,
      prompt: `Suggest one interesting, specific, learnable topic for someone browsing for something new to learn.

Avoid generic, broad subjects like "science," "history," or "art" — pick something narrow and concrete instead (e.g. "The Fermi Paradox," "How mechanical watches work," "The Byzantine-Sasanian War," "Fermentation chemistry in sourdough bread"). Vary the domain each time rather than defaulting to the same subject area.

Write a 1-2 sentence summary of what someone would actually learn.`,
    })
    return Response.json(result.object)
  } catch (error) {
    console.error('Surprise topic generation failed:', error)
    return Response.json({ error: 'Failed to generate a topic' }, { status: 500 })
  }
}
