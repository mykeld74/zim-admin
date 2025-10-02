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
    {
      name: 'linkedKidsManager',
      label: 'Linked Kids',
      type: 'ui',
      admin: {
        components: {
          Field: './app/(payload)/admin/LinkedKidsManager#default',
        },
      },
    },
    // sponsoredKids now via Sponsorships join table
  ],
  hooks: {
    beforeChange: [
      async ({ data }) => {
        const incoming = { ...(data || {}) } as Record<string, unknown>
        const firstName = (incoming.firstName as string | undefined) ?? ''
        const lastName = (incoming.lastName as string | undefined) ?? ''
        const name = `${firstName} ${lastName}`.trim()
        if (name) incoming.name = name
        return incoming
      },
    ],
  },
}
