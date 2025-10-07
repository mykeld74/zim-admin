import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables BEFORE importing config
dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function importCloudinaryMedia() {
  console.log('🚀 Starting Cloudinary media import...')

  // Validate credentials
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error('Cloudinary environment variables are missing')
  }

  // Dynamic imports AFTER env vars are loaded
  const { v2: cloudinary } = await import('cloudinary')
  const { getPayload } = await import('payload')
  const configModule = await import('../src/payload.config.js')
  const config = configModule.default

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
  })

  const folderName = process.env.CLOUDINARY_FOLDER || 'zim-admin'
  console.log(`📁 Fetching images from Cloudinary folder: ${folderName}`)

  // Get all images from Cloudinary folder
  const result = await cloudinary.api.resources({
    type: 'upload',
    prefix: folderName,
    max_results: 500,
    resource_type: 'image',
  })

  console.log(`✅ Found ${result.resources.length} images in Cloudinary`)

  if (result.resources.length === 0) {
    console.log('⚠️  No images found in the specified folder')
    return
  }

  // Initialize Payload
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  console.log('💾 Starting database import...')

  let successCount = 0
  let errorCount = 0

  for (const resource of result.resources) {
    try {
      // Extract filename from public_id (remove folder prefix and extension)
      const publicId = resource.public_id.replace(`${folderName}/`, '')
      const filename = `${publicId}.${resource.format}`

      // Generate Cloudinary URL
      const url = cloudinary.url(publicId, {
        secure: true,
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
      })

      // Check if media already exists
      const existing = await payload.find({
        collection: 'media',
        where: {
          filename: {
            equals: filename,
          },
        },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        console.log(`⏭️  Skipping ${filename} (already exists)`)
        continue
      }

      // Insert directly into database to bypass upload handler
      await payload.db.create({
        collection: 'media',
        data: {
          alt: publicId, // Use public_id as default alt text
          filename: filename,
          mimeType: `image/${resource.format}`,
          filesize: resource.bytes,
          width: resource.width,
          height: resource.height,
          url: url,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        req: {} as any,
      })

      successCount++
      console.log(`✅ Imported: ${filename}`)
    } catch (error: any) {
      errorCount++
      console.error(`❌ Failed to import ${resource.public_id}:`, error.message)
    }
  }

  console.log('\n📊 Import Summary:')
  console.log(`   ✅ Successfully imported: ${successCount}`)
  console.log(`   ❌ Failed: ${errorCount}`)
  console.log(`   📋 Total processed: ${result.resources.length}`)
  console.log('\n🎉 Import complete!')

  process.exit(0)
}

importCloudinaryMedia().catch((error) => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
