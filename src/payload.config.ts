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

// Force log to appear in production
console.error('=== CLOUDINARY SETUP ===')
console.error('Environment:', process.env.NODE_ENV)
console.error('Cloud name set:', !!process.env.CLOUDINARY_CLOUD_NAME)
console.error('API key set:', !!process.env.CLOUDINARY_API_KEY)
console.error('API secret set:', !!process.env.CLOUDINARY_API_SECRET)
console.error('Folder:', process.env.CLOUDINARY_FOLDER || 'default')
console.error('=== END CLOUDINARY SETUP ===')

console.log('Cloudinary config in production:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'NOT SET',
  api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET',
  folder: process.env.CLOUDINARY_FOLDER || 'NOT SET',
})

const cloudinaryAdapter = () => {
  console.error('=== CLOUDINARY ADAPTER INITIALIZED ===')
  return {
    name: 'cloudinary',
    handleUpload: async ({ file }: { file: any }) => {
      console.error('=== UPLOAD HANDLER CALLED ===')
      console.error('File:', file.filename, 'Size:', file.filesize)

      try {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'auto' as const,
              folder: process.env.CLOUDINARY_FOLDER || 'payload-media',
              use_filename: true,
              unique_filename: false,
              overwrite: false,
            },
            (err, res) => (err ? reject(err) : resolve(res!)),
          )
          stream.end(file.buffer)
        })

        file.filename = (result as any).public_id
        file.filesize = (result as any).bytes ?? file.filesize
        const rt = (result as any).resource_type
        const fmt = (result as any).format
        file.mimeType = rt === 'image' && fmt ? `image/${fmt}` : file.mimeType

        console.error('Upload completed:', {
          publicId: (result as any).public_id,
          bytes: (result as any).bytes,
        })
      } catch (error) {
        console.error('Cloudinary upload error:', error)
        throw error
      }
    },
    handleDelete: async ({ filename }: { filename: string }) => {
      await cloudinary.uploader.destroy(filename, { resource_type: 'auto' as const })
    },
    generateFileURL: ({ filename }: { filename: string }) => {
      return cloudinary.url(filename, {
        secure: true,
        resource_type: 'auto' as const,
        quality: 'auto',
        fetch_format: 'auto',
      })
    },
    staticHandler: async (req: any) => {
      const filename = req.params?.filename || req.query?.filename
      if (!filename) {
        return new Response('File not found', { status: 404 })
      }
      const url = cloudinary.url(filename, {
        secure: true,
        resource_type: 'auto' as const,
        quality: 'auto',
        fetch_format: 'auto',
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
        },
      },
    }),
  ],
})
