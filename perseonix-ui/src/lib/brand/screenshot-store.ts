import "server-only"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

// Sandbox screenshots of suspected lookalike sites, one JPEG per detection,
// kept under the local capture directory in a "brand" subfolder.
const DIRECTORY = path.join(process.env.CAPTURE_DIR || path.join(process.cwd(), ".data", "captures"), "brand")
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fileFor(detectionId: string) {
  if (!ID.test(detectionId)) throw new Error("Invalid detection id.")
  return path.join(DIRECTORY, `${detectionId}.jpg`)
}

export async function saveBrandCapture(detectionId: string, image: Buffer) {
  await mkdir(DIRECTORY, { recursive: true })
  await writeFile(fileFor(detectionId), image)
}

export async function readBrandCapture(detectionId: string): Promise<Buffer | null> {
  try {
    return await readFile(fileFor(detectionId))
  } catch {
    return null
  }
}
