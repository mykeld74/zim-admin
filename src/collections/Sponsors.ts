import type { CollectionConfig } from 'payload'

export const Sponsors: CollectionConfig = {
  slug: 'sponsors',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'phoneNumber'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'name',
      type: 'text',
      required: false,
      admin: {
        readOnly: true,
        hidden: true,
        description: 'Auto-generated from first and last name',
      },
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'phoneNumber',
      type: 'text',
      required: false,
    },
    // Linked kids manager removed; manage sponsorships from Kids collection only
    {
      name: 'sponsoredKids',
      label: 'Sponsored Kids',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Auto-populated from Kids',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data }) => {
        const incoming = { ...(data || {}) } as Record<string, unknown>
        const firstName = (incoming.firstName as string | undefined) ?? ''
        const lastName = (incoming.lastName as string | undefined) ?? ''
        const name = `${firstName} ${lastName}`.trim()
        if (name) incoming.name = name
        delete (incoming as any).sponsoredKids
        delete (incoming as any).sponsoredKidsList
        return incoming
      },
    ],
    afterRead: [
      async ({ doc, req }) => {
        try {
          const sponsorId = (doc as any)?.id
          if (!sponsorId) return doc
          const kids = await req.payload.find({
            collection: 'kids',
            where: { sponsors: { contains: sponsorId } },
            depth: 0,
            limit: 200,
          })
          ;(doc as any).sponsoredKids = kids.docs
            .map((k: any) => k.name)
            .filter(Boolean)
            .join(', ')
        } catch {}
        return doc
      },
    ],
  },
}
