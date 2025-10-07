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
      unique: true,
      admin: {
        description: 'Auto-generated from title when empty',
      },
    },
    {
      name: 'layout',
      type: 'blocks',
      blocks: [
        {
          slug: 'hero',
          fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'subtitle', type: 'text' },
            { name: 'image', type: 'upload', relationTo: 'media' },
          ],
        },
        {
          slug: 'content',
          fields: [{ name: 'body', type: 'richText' }],
        },
        {
          slug: 'image',
          fields: [
            { name: 'media', type: 'upload', relationTo: 'media' },
            { name: 'caption', type: 'text' },
          ],
        },
      ],
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
