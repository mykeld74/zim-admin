import type { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

export const Updates: CollectionConfig = {
  slug: 'updates',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
  },
  timestamps: true,
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: false,
      unique: true,
      admin: {
        description: 'Auto-generated from title if left blank',
      },
    },
    {
      name: 'content',
      type: 'richText',
      editor: lexicalEditor(),
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data }) => {
        const toSlug = (value: string): string =>
          value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')

        const incoming = { ...(data || {}) } as Record<string, unknown>
        const title = (incoming.title as string | undefined) ?? ''
        const existingSlug = (incoming.slug as string | undefined) ?? ''

        if (!existingSlug && title) {
          incoming.slug = toSlug(title)
        }

        return incoming
      },
    ],
  },
}
