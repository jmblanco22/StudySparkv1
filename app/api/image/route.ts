import { searchPhoto } from '@/lib/unsplash'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query')
  if (!query) return Response.json({ url: null })

  const url = await searchPhoto(query)
  return Response.json({ url })
}