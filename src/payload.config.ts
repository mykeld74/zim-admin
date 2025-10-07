// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import { v2 as cloudinary } from 'cloudinary'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Kids } from './collections/Kids'
import { Sponsors } from './collections/Sponsors'
import { Updates } from './collections/Updates'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
})

if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  throw new Error('Cloudinary env vars missing')
}

const cloudinaryAdapter = () => {
  return {
    name: 'cloudinary',
    handleUpload: async ({ file }: { file: any }) => {
      const originalFilename = file.filename

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: process.env.CLOUDINARY_FOLDER || 'payload-media',
            use_filename: true,
            unique_filename: false,
            public_id: originalFilename,
          },
          (err, res) => {
            if (err) {
              reject(err)
            } else {
              resolve(res!)
            }
          },
        )
        stream.end(file.buffer)
      })

      // Keep the original filename unchanged
      file.filesize = (result as any).bytes ?? file.filesize

      // Generate URL using the Cloudinary public_id (which is the original filename)
      const publicId = (result as any).public_id
      const filenameWithoutExt = publicId.replace(/\.[^/.]+$/, '')
      const cloudinaryPublicId = `${process.env.CLOUDINARY_FOLDER || 'payload-media'}/${filenameWithoutExt}`
      const cloudinaryUrl = cloudinary.url(cloudinaryPublicId, {
        secure: true,
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
      })

      // Ensure the URL is set on the file object
      file.url = cloudinaryUrl

      return file
    },
    handleDelete: async ({ filename }: { filename: string }) => {
      await cloudinary.uploader.destroy(filename, { resource_type: 'image' })
    },
    generateFileURL: ({ filename }: { filename: string | null | undefined }) => {
      if (!filename) return '' as any
      // Remove file extension from filename for URL generation
      const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '')
      const cloudinaryPublicId = `${process.env.CLOUDINARY_FOLDER || 'payload-media'}/${filenameWithoutExt}`
      return cloudinary.url(cloudinaryPublicId, {
        secure: true,
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
      })
    },
    staticHandler: async (req: any) => {
      const folder = process.env.CLOUDINARY_FOLDER || 'payload-media'
      const filenameParam = req.params?.filename || req.query?.filename
      if (!filenameParam) return new Response('File not found', { status: 404 })

      // Support both Express-like req.query and Next.js Request
      let width: number | undefined
      let height: number | undefined
      let crop: string | undefined

      try {
        const urlObj =
          typeof req.url === 'string' ? new URL(req.url, 'http://localhost') : undefined
        if (urlObj) {
          const w = urlObj.searchParams.get('width') || urlObj.searchParams.get('w')
          const h = urlObj.searchParams.get('height') || urlObj.searchParams.get('h')
          crop = urlObj.searchParams.get('crop') || urlObj.searchParams.get('c') || undefined
          width = w ? Number(w) : undefined
          height = h ? Number(h) : undefined
        }
      } catch {}

      const filenameWithoutExt = String(filenameParam).replace(/\.[^/.]+$/, '')
      const alreadyPrefixed = filenameWithoutExt.startsWith(`${folder}/`)
      const publicId = alreadyPrefixed ? filenameWithoutExt : `${folder}/${filenameWithoutExt}`

      const url = cloudinary.url(publicId, {
        secure: true,
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
        width,
        height,
        crop: crop as any,
      })

      return Response.redirect(url, 302)
    },
  }
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Updates, Kids, Sponsors],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    cloudStoragePlugin({
      collections: {
        media: {
          adapter: cloudinaryAdapter,
          disableLocalStorage: true,
          generateFileURL: ({ filename }) => {
            if (!filename) return '' as any
            const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '')
            const cloudinaryPublicId = `${process.env.CLOUDINARY_FOLDER || 'payload-media'}/${filenameWithoutExt}`
            return cloudinary.url(cloudinaryPublicId, {
              secure: true,
              resource_type: 'image',
              quality: 'auto',
              fetch_format: 'auto',
            })
          },
        },
      },
    }),
  ],
})
