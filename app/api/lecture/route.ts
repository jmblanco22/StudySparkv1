import { createClient } from '@/lib/supabase/server'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })

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

  // Check cache
  const { data: cached } = await supabase
    .from('lectures')
    .select('content')
    .eq('roadmap_id', roadmapId)
    .eq('module_index', moduleIndex)
    .eq('submodule_index', submoduleIndex)
    .single()

  // Fetch the roadmap for context and titles regardless (needed for response metadata)
  const { data: roadmap } = await supabase
    .from('roadmaps')
    .select('content')
    .eq('id', roadmapId)
    .single()

  if (!roadmap) return Response.json({ error: 'Roadmap not found' }, { status: 404 })

  const mod = roadmap.content.modules[moduleIndex]
  const sub = mod?.submodules[submoduleIndex]
  if (!mod || !sub) return Response.json({ error: 'Submodule not found' }, { status: 404 })

  if (cached) {
    return Response.json({
      content: cached.content,
      moduleTitle: mod.title,
      submoduleTitle: sub.title,
    })
  }

  // Generate micro-lecture
  let text: string
  try {
    const result = await generateText({
      model: openrouter.chat('deepseek/deepseek-v4-flash'),
      prompt: `Write a concise micro-lecture on "${sub.title}" within the module "${mod.title}".
Context: ${sub.summary}
Format as markdown: use ## subheadings, bullet points where helpful, and end with a ## Key Takeaway section.
Do NOT include a title heading at the start — jump straight into the content.
Length: 300–500 words. Be clear, educational, and direct.

Diagram rule: if the topic involves a process, steps, a workflow, a hierarchy, stages, or any sequential or structural relationship, include exactly ONE diagram as a fenced mermaid code block placed after the first paragraph. Use simple valid Mermaid syntax — prefer flowchart TD or graph TD. Keep every node label very short and use only plain alphanumeric text and spaces — no parentheses, no quotes, no brackets, no special characters inside labels, as these break parsing.
If the topic is purely conceptual (a definition, a theory, an abstract idea with no inherent structure), include no diagram at all.`,
    })
    text = result.text
  } catch (err) {
    console.error('Lecture generation failed:', err)
    return Response.json({ error: 'Failed to generate lecture' }, { status: 500 })
  }

  // Save to cache
  const { error: insertError } = await supabase
    .from('lectures')
    .insert({
      user_id: user.id,
      roadmap_id: roadmapId,
      module_index: moduleIndex,
      submodule_index: submoduleIndex,
      content: text,
    })

  if (insertError) console.error('Lecture insert failed:', insertError)

  return Response.json({
    content: text,
    moduleTitle: mod.title,
    submoduleTitle: sub.title,
  })
}
