'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: true,
      }
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Magic link sent! Check your email.')
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h1>StudySpark</h1>
      <p>Enter your email to get a magic link</p>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '10px', background: '#0070f3', color: 'white', border: 'none' }}
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  )
}