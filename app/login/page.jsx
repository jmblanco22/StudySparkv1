'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Already signed in (e.g. logged in from another tab, or navigated back here) — go home.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/')
    })
  }, [router])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Magic link sent! Check your email.')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-sm mx-auto mt-16 sm:mt-24 px-4 sm:px-6">
      <h1 className="text-2xl sm:text-3xl font-bold">StudySpark</h1>
      <p className="text-muted mt-2 mb-6">Enter your email to get a magic link</p>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full min-h-11 px-4 py-3 rounded-xl border border-border mb-3 focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full min-h-11 disabled:opacity-40"
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>
      {message && <p className="mt-4 text-muted">{message}</p>}
    </div>
  )
}
