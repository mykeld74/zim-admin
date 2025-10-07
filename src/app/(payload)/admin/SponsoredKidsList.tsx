'use client'

import { useEffect, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

type Kid = { id: number; name: string }

export default function SponsoredKidsList() {
  const { id } = useDocumentInfo()
  const sponsorId = id as number | undefined
  const [kids, setKids] = useState<Kid[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!sponsorId) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/kids?limit=100&depth=0&where[sponsors][contains]=${sponsorId}`,
          {
            credentials: 'include',
          },
        )
        if (!res.ok) throw new Error(`Failed to load kids (${res.status})`)
        const json = await res.json()
        setKids(json?.docs ?? [])
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load kids')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [sponsorId])

  if (!sponsorId) {
    return <div style={{ opacity: 0.7 }}>Save the sponsor first to see sponsored kids.</div>
  }

  const title = kids.length === 1 ? 'Sponsored Kid:' : 'Sponsored Kids:'

  return (
    <div>
      <div style={{ padding: 8, borderBottom: '1px solid var(--theme-elevation-150)' }}>
        {title} {loading ? '(loading...)' : ''}
      </div>
      {error && <div style={{ color: 'var(--theme-error-500)', padding: 8 }}>{error}</div>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 8, display: 'grid', gap: 6 }}>
        {kids.map((k) => (
          <li key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{k.name}</span>
          </li>
        ))}
        {kids.length === 0 && !loading && (
          <li style={{ opacity: 0.7 }}>No kids currently sponsored.</li>
        )}
      </ul>
    </div>
  )
}
