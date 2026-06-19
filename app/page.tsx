'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login')
      else { setEmail(session.user.email ?? null); setLoading(false) }
    })
  }, [router])

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 20 }}>
      <h1>StudySpark</h1>
      <p>You're logged in as {email}</p>
      <button
        onClick={async () => { await supabase.auth.signOut(); router.replace('/login') }}
        style={{ padding: 10, background: '#0070f3', color: 'white', border: 'none' }}
      >
        Sign out
      </button>
    </div>
  )
}