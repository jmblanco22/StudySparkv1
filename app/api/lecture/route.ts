import { createClient } from '@/lib/supabase/server'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { searchPhoto } from '@/lib/unsplash'

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
 const figuresBlock = sub.visual
    ? `

FIGURES:
Where a visual would genuinely help, insert a placeholder on its own line, exactly:
[FIGURE: search query | caption]
- The search query is 3-6 plain keywords for a stock photo search. No punctuation.
- The query must name the ACTUAL physical thing being taught — the real object, tool, material, or activity. Never a metaphor or symbolic stand-in.
- The caption is one short sentence explaining what the figure shows.
- Include 1-3 figures, placed inline next to the text they illustrate.
- If you can't name a concrete photographable subject, omit the figure.`
    : ''

  // Generate micro-lecture
  let text: string
  try {
    const result = await generateText({
      model: openrouter.chat('deepseek/deepseek-v4-flash'),
     prompt: `Write a concise micro-lecture on "${sub.title}" within the module "${mod.title}".
Context: ${sub.summary}
Format as markdown: use ## subheadings, bullet points where helpful, and end with a ## Key Takeaway section.
Do NOT include a title heading at the start — jump straight into the content.
Length: 300–500 words. Be clear, educational, and direct.${figuresBlock}`,
    })
    text = result.text
  } catch (err) {
    console.error('Lecture generation failed:', err)
    return Response.json({ error: 'Failed to generate lecture' }, { status: 500 })
  }
  // Find every placeholder. Group 1 = search query, group 2 = caption.
  const figureRegex = /\[FIGURE:\s*([^|\]]+)\|\s*([^\]]+)\]/g
  const figures = [...text.matchAll(figureRegex)]

  if (figures.length > 0) {
    // Look up all images at the same time (not one after another).
    const urls = await Promise.all(
      figures.map((f) => searchPhoto(f[1].trim()))
    )

    // Swap each placeholder for an image, or remove it if no image was found.
    figures.forEach((figure, i) => {
      const fullPlaceholder = figure[0]   // the whole [FIGURE: ...] text
      const caption = figure[2].trim()
      const url = urls[i]

      text = text.replace(
        fullPlaceholder,
        url ? `![${caption}](${url})` : ''
      )
    })
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
