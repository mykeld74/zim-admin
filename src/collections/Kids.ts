import type { CollectionConfig } from 'payload'

export const Kids: CollectionConfig = {
  slug: 'kids',
  admin: {
    useAsTitle: 'name',
  },
  hooks: {},
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'sponsors',
      type: 'relationship',
      relationTo: 'sponsors',
      hasMany: true,
      required: false,
    },
    {
      name: 'birthday',
      type: 'date',
      required: false,
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      required: false,
    },
  ],
}
