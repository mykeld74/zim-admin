import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'level'],
  },
  auth: true,
  hooks: {},
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
      name: 'level',
      type: 'select',
      required: true,
      defaultValue: 'sponsor',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Sponsor', value: 'sponsor' },
      ],
    },
    // Email added by default
  ],
}
