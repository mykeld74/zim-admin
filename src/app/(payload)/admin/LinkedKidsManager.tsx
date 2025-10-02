'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

type Kid = {
  id: number
  name: string
  sponsors?: number[] | { id: number }[]
}

type Props = {
  value?: unknown
  path?: string
  label?: string
  readOnly?: boolean
  admin?: unknown
  form?: unknown
  data?: { id?: number }
}

export default function LinkedKidsManager(props: Props) {
  const { id: currentId } = useDocumentInfo()
  const sponsorId = currentId as number | undefined
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kids, setKids] = useState<Kid[]>([])
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<Kid[]>([])

  const headers: HeadersInit = useMemo(() => ({ 'Content-Type': 'application/json' }), [])

  const toIdArray = (value: Kid['sponsors']): number[] => {
    if (!value) return []
    const arr = Array.isArray(value) ? value : [value]
    return arr
      .map((v) => (typeof v === 'number' ? v : (v as any)?.id))
      .filter((v): v is number => typeof v === 'number')
  }

  const fetchLinkedKids = async () => {
    if (!sponsorId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/kids?limit=100&depth=0&where[sponsors][contains]=${sponsorId}`,
        { credentials: 'include' },
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

  const searchKids = async (q: string) => {
    setSearch(q)
    try {
      const res = await fetch(
        `/api/kids?limit=20&depth=0&where[name][like]=${encodeURIComponent(q)}`,
        { credentials: 'include' },
      )
      if (!res.ok) return
      const json = await res.json()
      setOptions(json?.docs ?? [])
    } catch {
      // ignore
    }
  }

  const addKid = async (kid: Kid) => {
    if (!sponsorId) return
    try {
      const resGet = await fetch(`/api/kids/${kid.id}?depth=0`, { credentials: 'include' })
      if (!resGet.ok) throw new Error('Failed to load kid')
      const data = await resGet.json()
      const current = toIdArray(data?.sponsors)
      if (current.includes(sponsorId)) return
      const res = await fetch(`/api/kids/${kid.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify({ sponsors: [...current, sponsorId] }),
      })
      if (!res.ok) throw new Error('Failed to update kid')
      await fetchLinkedKids()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add kid')
    }
  }

  const removeKid = async (kid: Kid) => {
    if (!sponsorId) return
    try {
      const resGet = await fetch(`/api/kids/${kid.id}?depth=0`, { credentials: 'include' })
      if (!resGet.ok) throw new Error('Failed to load kid')
      const data = await resGet.json()
      const current = toIdArray(data?.sponsors)
      const next = current.filter((id) => id !== sponsorId)
      const res = await fetch(`/api/kids/${kid.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify({ sponsors: next }),
      })
      if (!res.ok) throw new Error('Failed to update kid')
      setKids((prev) => prev.filter((k) => k.id !== kid.id))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to remove kid')
    }
  }

  useEffect(() => {
    fetchLinkedKids()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sponsorId])

  if (!sponsorId) {
    return (
      <div style={{ padding: 8, border: '1px solid var(--theme-elevation-150)' }}>
        Save the sponsor first to manage kids.
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search kids by name..."
          value={search}
          onChange={(e) => searchKids(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <select
          onChange={(e) => {
            const id = Number(e.target.value)
            const kid = options.find((k) => k.id === id)
            if (kid) addKid(kid)
            e.currentTarget.selectedIndex = 0
          }}
          style={{ padding: 8, minWidth: 180 }}
        >
          <option value="">Add kid…</option>
          {options.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </div>

      {error && <div style={{ color: 'var(--theme-error-500)' }}>{error}</div>}

      <div style={{ border: '1px solid var(--theme-elevation-150)' }}>
        <div style={{ padding: 8, borderBottom: '1px solid var(--theme-elevation-150)' }}>
          Linked Kids {loading ? '(loading...)' : ''}
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 8, display: 'grid', gap: 6 }}>
          {kids.map((k) => (
            <li
              key={k.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>{k.name}</span>
              <button type="button" onClick={() => removeKid(k)} style={{ padding: '4px 8px' }}>
                Remove
              </button>
            </li>
          ))}
          {kids.length === 0 && <li style={{ opacity: 0.7 }}>No kids linked</li>}
        </ul>
      </div>
    </div>
  )
}
