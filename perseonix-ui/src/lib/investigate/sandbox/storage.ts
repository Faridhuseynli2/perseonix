import "server-only"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

// Screenshots live next to the local database, one JPEG per investigation.
const DIRECTORY = process.env.CAPTURE_DIR || path.join(process.cwd(), ".data", "captures")
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fileFor(investigationId: string) {
  if (!ID.test(investigationId)) throw new Error("Invalid investigation id.")
  return path.join(DIRECTORY, `${investigationId}.jpg`)
}

export async function saveCapture(investigationId: string, image: Buffer) {
  await mkdir(DIRECTORY, { recursive: true })
  await writeFile(fileFor(investigationId), image)
}

export async function readCapture(investigationId: string): Promise<Buffer | null> {
  try {
    return await readFile(fileFor(investigationId))
  } catch {
    return null
  }
}
