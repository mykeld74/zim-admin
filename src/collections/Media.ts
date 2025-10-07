import type { CollectionConfig } from 'payload'
import { v2 as cloudinary } from 'cloudinary'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  hooks: {
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
        const thumb = cloudinary.url(publicId, {
          secure: true,
          resource_type: 'image',
          width: 240,
          height: 240,
          crop: 'fill',
          quality: 'auto',
          fetch_format: 'auto',
        })
        ;(doc as any).url = (doc as any).url || url
        ;(doc as any).thumbnailURL = (doc as any).thumbnailURL || thumb
        ;(doc as any).sizes = {
          ...((doc as any).sizes || {}),
          thumbnail: {
            ...((doc as any).sizes?.thumbnail || {}),
            url: (doc as any).sizes?.thumbnail?.url || thumb,
            width: 240,
            height: 240,
            mimeType: (doc as any).mimeType || 'image/jpeg',
          },
        }
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
    imageSizes: [
      {
        name: 'thumbnail',
        width: 240,
        height: 240,
        position: 'centre',
      },
    ],
  },
}
