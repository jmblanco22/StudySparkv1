// Searches Unsplash for a photo and returns its URL.
// Returns null if nothing is found or anything goes wrong —
// this function NEVER throws, so a failed image lookup
// can't break lecture generation.

export async function searchPhoto(query: string): Promise<string | null> {
  try {
    // Turn the search words into a safe URL (spaces become %20, etc.)
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`

    // Ask Unsplash for the photo. The header is how we prove who we are.
    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    })

    
    if (!res.ok) return null

    // Read the response body as JSON.
    const data = await res.json()

    // Grab the first result's image URL.
    // The ?. means "only if it exists" — so missing pieces give undefined
    // instead of crashing. The ?? null turns undefined into null.
    return data.results?.[0]?.urls?.regular ?? null
  } catch {
    // Network error, bad JSON, anything unexpected → return null.
    return null
  }
}