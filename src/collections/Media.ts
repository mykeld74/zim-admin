import type { CollectionConfig } from 'payload'
import { v2 as cloudinary } from 'cloudinary'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data?.filename) {
          // Strip file extension from filename
          data.filename = data.filename.replace(/\.[^/.]+$/, '')
        }
        return data
      },
    ],
    afterRead: [
      ({ doc }) => {
        const folder = process.env.CLOUDINARY_FOLDER || 'payload-media'
        const filename: string | undefined | null = (doc as any)?.filename
        if (!filename) return doc
        const base = filename.replace(/\.[^/.]+$/, '')
        const publicId = base.startsWith(`${folder}/`) ? base : `${folder}/${base}`
        const url = cloudinary.url(publicId, {
          secure: true,
          resource_type: 'image',
          quality: 'auto',
          fetch_format: 'auto',
        })
        ;(doc as any).url = (doc as any).url || url
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    focalPoint: true,
    mimeTypes: ['image/*'],
  },
}
