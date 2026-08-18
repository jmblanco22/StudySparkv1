import { createClient } from '@/lib/supabase/server'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateObject } from 'ai'
import { extractText, getDocumentProxy } from 'unpdf'
import { z } from 'zod'

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })

const MAX_FILE_BYTES = 10 * 1024 * 1024

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

// Shared by both the typed-topic and uploaded-notes paths so scope-judgment and
// visual-flagging behave identically no matter where the subject came from.
const SCOPE_AND_VISUAL_RULES = `First, judge the scope of what the learner asked for, and size the roadmap to match:
- A narrow, simple, or single-skill request (e.g. "how to add two numbers," "what is a noun," "how to tie a shoe") → 1-2 modules with a few submodules. Do NOT pad a small question into a full course.
- A moderate topic (e.g. "basic photography," "intro to chess") → 2-3 modules.
- A broad subject (e.g. "calculus," "web development," "organic chemistry") → 4-5 modules.
Match the structure to what was actually asked. Never inflate a small question into a large roadmap.

- Order modules so each builds on the previous.
- Each module has 2-4 bite-sized submodules.
- Keep titles short and every description to one sentence.
- Set "visual" to true ONLY if this submodule teaches something that can be literally photographed: a physical object, material, tool, place, or a person performing a hands-on activity.
- Set "visual" to false for anything conceptual, mathematical, theoretical, or symbolic — including formulas, proofs, economics, philosophy, and abstract processes. When in doubt, use false.`

async function extractFileText(file: File): Promise<{ text: string } | { error: string }> {
  if (file.size > MAX_FILE_BYTES) {
    return { error: 'File must be 10MB or smaller' }
  }

  const name = file.name.toLowerCase()
  let text: string

  if (name.endsWith('.txt')) {
    text = await file.text()
  } else if (name.endsWith('.pdf')) {
    try {
      const buffer = new Uint8Array(await file.arrayBuffer())
      const pdf = await getDocumentProxy(buffer)
      const result = await extractText(pdf, { mergePages: true })
      text = result.text
    } catch (error) {
      console.error('PDF text extraction failed:', error)
      return { error: 'Could not read that PDF' }
    }
  } else {
    return { error: 'Only .txt and .pdf files are supported' }
  }

  if (!text.trim()) {
    return { error: 'Could not find any text in that file' }
  }
  return { text }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Two ways to get here: a typed topic (JSON) or an uploaded .txt/.pdf (multipart).
  // Both converge on the same `subjectPrompt` + generation call below.
  let topic: string | null
  let subjectPrompt: string

  if ((req.headers.get('content-type') || '').includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return Response.json({ error: 'File is required' }, { status: 400 })
    }

    const extracted = await extractFileText(file)
    if ('error' in extracted) {
      return Response.json({ error: extracted.error }, { status: 400 })
    }

    // No user-typed topic in this path — the model infers one from the notes,
    // and we use its answer (roadmapSchema.topic) when saving below.
    topic = null
    subjectPrompt = `based on the study notes below. Infer the subject and scope from the notes themselves — build a learning roadmap that teaches the material, not a summary of the notes.

--- NOTES ---
${extracted.text}
--- END NOTES ---`
  } else {
    const body = await req.json()
    if (!body.topic || typeof body.topic !== 'string') {
      return Response.json({ error: 'Topic is required' }, { status: 400 })
    }
    topic = body.topic
    subjectPrompt = `for someone who wants to learn: "${topic}"`
  }

  let object
  try {
    const result = await generateObject({ //how prompting works
      model: openrouter.chat('deepseek/deepseek-v4-flash'),
      schema: roadmapSchema,
      prompt: `Create a structured learning roadmap ${subjectPrompt}.

${SCOPE_AND_VISUAL_RULES}`,
    })
    object = result.object
  } catch (error) {
    console.error('Roadmap generation failed:', error)
    return Response.json({ error: 'Failed to generate roadmap' }, { status: 500 })
  }

  const { data: row, error: insertError } = await supabase
    .from('roadmaps')
    .insert({ user_id: user.id, topic: topic ?? object.topic, content: object })
    .select('id, topic, content, created_at')
    .single()

  if (insertError || !row) {
    console.error('Roadmap insert failed:', insertError)
    return Response.json({ error: 'Failed to save roadmap' }, { status: 500 })
  }

  return Response.json(row)
}
