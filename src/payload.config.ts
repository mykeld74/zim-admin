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
} else {
  console.log('Cloudinary config:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY?.substring(0, 8) + '...',
    api_secret: process.env.CLOUDINARY_API_SECRET?.substring(0, 8) + '...',
  })
}

const cloudinaryAdapter = () => {
  return {
    name: 'cloudinary',
    handleUpload: async ({ file }: { file: any }) => {
      const originalFilename = file.filename
      
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
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
      
      return file
    },
    handleDelete: async ({ filename }: { filename: string }) => {
      await cloudinary.uploader.destroy(filename, { resource_type: 'auto' })
    },
    generateFileURL: ({ filename }: { filename: string }) => {
      return cloudinary.url(filename, { secure: true, resource_type: 'auto' })
    },
    staticHandler: async (req: any) => {
      const filename = req.params?.filename || req.query?.filename
      if (!filename) {
        return new Response('File not found', { status: 404 })
      }
      const url = cloudinary.url(filename, {
        secure: true,
        resource_type: 'auto',
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
