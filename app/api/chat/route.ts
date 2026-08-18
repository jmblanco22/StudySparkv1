import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createClient } from '@/lib/supabase/server'

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })

export const maxDuration = 30

type Submodule = { title: string; summary: string }
type Module = { title: string; description: string; submodules: Submodule[] }

function buildRoadmapContext(modules: Module[]): string {
  return modules
    .map((m) => {
      const subs = m.submodules.map((s) => `  - ${s.title}: ${s.summary}`).join('\n')
      return `${m.title}\n${subs}`
    })
    .join('\n\n')
}

const SYSTEM_PROMPT = (roadmapContext: string, currentSubmoduleContext: string) => `
You are the StudySpark AI study assistant. The learner is currently viewing their roadmap, and you have access to its full structure below.

YOUR JOB: Point learners to where an answer lives in their roadmap. You are an index, not a textbook. Never dump a full micro-lecture into the chat, no matter how the question is phrased.

Classify every question into one of three tiers before answering:

TIER 1 — ROADMAP-LEVEL
The question is about a whole topic, not a specific detail (e.g. "how do you do addition", "what does this cover", "where do I learn about X").
→ Respond with ONLY a redirect: name the module and/or submodule where this lives, one short line on what they'll find there, and tell them to go read it.
→ Do not explain the concept. Do not give examples. Do not summarize the content. One to two sentences total.

TIER 2 — CONCEPTUAL / SUBMODULE-LEVEL
The question asks about a concept, relationship, or "why" that a specific submodule covers, but isn't asking for one exact fact (e.g. "what's the difference between limits and derivatives", "why does the power rule work").
→ Give a short 2-3 sentence conceptual answer — enough to orient them, not enough to replace reading the lecture.
→ Follow it with a pointer to the exact submodule for the full explanation.
→ Never reproduce the lecture's wording closely. Paraphrase your own short version.

TIER 3 — SPECIFIC-DETAIL-LEVEL
The question has one concrete, factual answer (e.g. "what's 7 + 5", "what's the formula for the power rule").
→ Give the direct answer.
→ Immediately cite which submodule it came from, e.g. "(from your 'Power Rule' submodule)".

HARD RULES, all tiers:
- Never paste or closely paraphrase an entire micro-lecture.
- If you're unsure which tier a question falls into, treat it as one tier more restrictive (when in doubt, redirect more, explain less).
- Always name the exact module/submodule title when referencing content, so the learner can find it.
- If the question isn't covered anywhere in the roadmap below, say so plainly and don't guess.

ROADMAP STRUCTURE (titles and one-line summaries only — use this to find where to point the learner):
${roadmapContext}

CURRENT SUBMODULE THE LEARNER IS VIEWING (if any):
${currentSubmoduleContext || 'None — learner is not currently on a submodule page.'}

Answer the learner's question now, following the tier rules above.
`.trim()

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, roadmapId, currentSubmodule }: {
    messages: UIMessage[]
    roadmapId?: string
    currentSubmodule?: Submodule
  } = await req.json()

  let roadmapContext = 'No roadmap loaded.'

  if (roadmapId) {
    const { data: roadmap } = await supabase
      .from('roadmaps')
      .select('content')
      .eq('id', roadmapId)
      .single()

    if (roadmap?.content?.modules) {
      roadmapContext = buildRoadmapContext(roadmap.content.modules)
    }
  }

  const currentSubmoduleContext = currentSubmodule
    ? `${currentSubmodule.title}: ${currentSubmodule.summary}`
    : ''

  const result = streamText({
    model: openrouter.chat('deepseek/deepseek-v4-flash'),
    system: SYSTEM_PROMPT(roadmapContext, currentSubmoduleContext),
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}