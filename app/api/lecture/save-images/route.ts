import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { roadmapId, moduleIndex, submoduleIndex, content } = await req.json()

  // RLS ensures a user can only update their own lecture rows.
  const { error } = await supabase
    .from('lectures')
    .update({ content })
    .eq('roadmap_id', roadmapId)
    .eq('module_index', moduleIndex)
    .eq('submodule_index', submoduleIndex)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: 'Update failed' }, { status: 500 })
  return Response.json({ ok: true })
}