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

console.log('Cloudinary config in production:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'NOT SET',
  api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET',
  folder: process.env.CLOUDINARY_FOLDER || 'NOT SET',
})

const cloudinaryAdapter = (args: { collection: any; prefix?: string }) => {
  console.log('Cloudinary adapter called with args:', Object.keys(args))
  return {
    name: 'cloudinary',
    handleUpload: async ({
      file,
    }: {
      file: { buffer: Buffer; filename: string; filesize: number; mimeType: string }
    }) => {
      try {
        console.log('Starting Cloudinary upload for file:', file.filename, 'size:', file.filesize)

        const result = await new Promise<{
          public_id: string
          bytes: number
          resource_type: string
          format: string
        }>((resolve, reject) => {
          const uploadOptions = {
            resource_type: 'auto' as const,
            folder: process.env.CLOUDINARY_FOLDER || 'payload-media',
            use_filename: true,
            unique_filename: false,
            overwrite: false,
          }

          console.log('Cloudinary upload options:', uploadOptions)

          const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, res) => {
            if (err) {
              console.error('Cloudinary upload error:', err)
              reject(err)
            } else {
              console.log('Cloudinary upload success:', res)
              resolve(res!)
            }
          })
          stream.end(file.buffer)
        })

        // store Cloudinary public_id; do not add extension
        file.filename = result.public_id
        file.filesize = result.bytes ?? file.filesize
        // best-effort mime
        const rt = result.resource_type
        const fmt = result.format
        file.mimeType = rt === 'image' && fmt ? `image/${fmt}` : file.mimeType

        console.log('Upload completed:', {
          originalFilename: file.filename,
          publicId: result.public_id,
          bytes: result.bytes,
          resourceType: rt,
          format: fmt,
          mimeType: file.mimeType,
        })
      } catch (error) {
        console.error('Cloudinary upload error:', error)
        throw error
      }
    },
    handleDelete: async ({ filename }: { filename: string }) => {
      // filename is the stored public_id
      await cloudinary.uploader.destroy(filename, { resource_type: 'auto' as const })
    },
    // build URL from public_id
    generateFileURL: ({ filename }: { filename: string }) => {
      const url = cloudinary.url(filename, {
        secure: true,
        resource_type: 'auto' as const,
        quality: 'auto',
        fetch_format: 'auto',
      })
      console.log('Generated Cloudinary URL:', url, 'for filename:', filename)
      return url
    },
    staticHandler: async (req: any) => {
      const filename = req.params?.filename || req.query?.filename
      console.log('Static handler called with filename:', filename)

      if (!filename) {
        console.log('No filename provided, returning 404')
        return new Response('File not found', { status: 404 })
      }

      try {
        const url = cloudinary.url(filename, {
          secure: true,
          resource_type: 'auto' as const,
          quality: 'auto',
          fetch_format: 'auto',
        })
        console.log('Static handler redirecting to:', url, 'for filename:', filename)
        return Response.redirect(url, 302)
      } catch (error) {
        console.error('Error generating Cloudinary URL:', error)
        return new Response('Error generating file URL', { status: 500 })
      }
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
