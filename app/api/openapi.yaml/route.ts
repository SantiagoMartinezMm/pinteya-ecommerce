import { readFileSync } from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'docs', 'api', 'openapi.yaml')
    const fileContents = readFileSync(filePath, 'utf8')

    return new NextResponse(fileContents, {
      headers: {
        'Content-Type': 'application/yaml',
      },
    })
  } catch (error) {
    console.error('Error loading OpenAPI spec:', error)
    return new NextResponse('Error loading API documentation', { status: 500 })
  }
}
