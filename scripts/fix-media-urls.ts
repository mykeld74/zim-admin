import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Resolve project root and load env before dynamic imports
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function run() {
  const folderName = process.env.CLOUDINARY_FOLDER || 'zim-admin'
  if (!process.env.CLOUDINARY_CLOUD_NAME) throw new Error('Missing CLOUDINARY_CLOUD_NAME')

  const { v2: cloudinary } = await import('cloudinary')
  const { getPayload } = await import('payload')
  const configModule = await import('../src/payload.config.js')
  const config = configModule.default

  const payload = await getPayload({ config })

  console.log('Finding media records to fix...')
  let page = 1
  let fixed = 0
  // paginate through media
  for (;;) {
    const res = await payload.find({ collection: 'media', limit: 100, page })
    if (res.docs.length === 0) break

    for (const doc of res.docs as any[]) {
      const filename: string | undefined = doc.filename ?? undefined
      if (!filename) continue

      const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '')
      const publicId = `${folderName}/${filenameWithoutExt}`
      const url = cloudinary.url(publicId, {
        secure: true,
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
      })
      const thumbUrl = cloudinary.url(publicId, {
        secure: true,
        resource_type: 'image',
        width: 240,
        height: 240,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto',
      })

      const needsUpdate =
        doc.url !== url || doc.thumbnailURL !== thumbUrl || !doc.sizes?.thumbnail?.url

      if (needsUpdate) {
        await payload.update({
          collection: 'media',
          id: doc.id,
          data: {
            url,
            thumbnailURL: thumbUrl,
            sizes: {
              ...(doc.sizes || {}),
              thumbnail: {
                ...(doc.sizes?.thumbnail || {}),
                url: thumbUrl,
                width: 240,
                height: 240,
                mimeType: 'image/jpeg',
              },
            },
          },
        })
        fixed++
        console.log(`Updated ${filename} -> url:${url} thumb:${thumbUrl}`)
      }
    }

    if (page >= (res.totalPages || 1)) break
    page++
  }

  console.log(`Done. Fixed ${fixed} media URLs.`)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
