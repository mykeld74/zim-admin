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

const cloudinaryAdapter = () => ({
  name: 'cloudinary',
  handleUpload: async ({
    file,
  }: {
    file: { buffer: Buffer; filename: string; filesize: number; mimeType: string }
  }) => {
    try {
      const result = await new Promise<{
        public_id: string
        bytes: number
        resource_type: string
        format: string
      }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            folder: process.env.CLOUDINARY_FOLDER || 'payload-media',
            use_filename: true,
            unique_filename: false,
            overwrite: false,
          },
          (err, res) => (err ? reject(err) : resolve(res!)),
        )
        stream.end(file.buffer)
      })

      // store Cloudinary public_id; do not add extension
      file.filename = result.public_id
      file.filesize = result.bytes ?? file.filesize
      // best-effort mime
      const rt = result.resource_type
      const fmt = result.format
      file.mimeType = rt === 'image' && fmt ? `image/${fmt}` : file.mimeType
    } catch (error) {
      console.error('Cloudinary upload error:', error)
      throw error
    }
  },
  handleDelete: async ({ filename }: { filename: string }) => {
    // filename is the stored public_id
    await cloudinary.uploader.destroy(filename, { resource_type: 'auto' })
  },
  // build URL from public_id
  generateFileURL: ({ filename }: { filename: string }) =>
    cloudinary.url(filename, { secure: true, resource_type: 'auto' }),
  staticHandler: () => new Response('Not implemented', { status: 501 }),
})

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
