import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import ffmpegPath from 'ffmpeg-static'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { randomUUID } from 'crypto'
import { tmpdir } from 'os'
import path from 'path'
import { writeFile, readFile, unlink } from 'fs/promises'

const execFileAsync = promisify(execFile)

const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
// Generous ceiling on the ORIGINAL (pre-trim) upload — short phone-recorded
// clips before compression can easily be 100-300MB; this is purely an
// abuse/processing-time guard, not the chat attachment cap itself.
const MAX_ORIGINAL_SIZE = 300 * 1024 * 1024
// Must match MAX_VIDEO_ATTACHMENT_SIZE in chat-attachments.tsx — duplicated
// here (rather than imported from that 'use client' component) to keep
// this server route's dependencies plain Node, not client-bundle-coupled.
const MAX_TRIMMED_SIZE = 25 * 1024 * 1024
const MAX_CLIP_SECONDS = 10 * 60 // sanity cap — "short videos" only

/**
 * POST /api/chat/attachments/trim-video
 * Cuts [start, end) out of an uploaded video server-side via ffmpeg and
 * returns the trimmed clip's bytes. Exists because trying to do this
 * client-side via HTMLVideoElement.captureStream() + MediaRecorder proved
 * unreliable — it could silently produce a genuinely empty (0-byte) output
 * with no clear browser-side cause. ffmpeg re-encodes (not a stream copy)
 * so the cut lands on the exact requested timestamps rather than snapping
 * to the nearest keyframe.
 *
 * Body (multipart/form-data): file (the original oversized video),
 * start (seconds, string), end (seconds, string).
 * Response: the trimmed video/mp4 bytes directly (not JSON) — the client
 * wraps them in a File and sends that through the normal
 * POST /api/chat/attachments upload, same as any other attachment.
 */
export async function POST(request: NextRequest) {
  const tempFiles: string[] = []
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const startRaw = formData.get('start')
    const endRaw = formData.get('end')

    if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })
    if (!VIDEO_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only MP4, MOV, or WebM videos can be trimmed' }, { status: 400 })
    }
    if (file.size > MAX_ORIGINAL_SIZE) {
      return NextResponse.json({ error: `Video is too large to trim (max ${Math.round(MAX_ORIGINAL_SIZE / (1024 * 1024))}MB original size)` }, { status: 400 })
    }

    const start = Number(startRaw)
    const end = Number(endRaw)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
      return NextResponse.json({ error: 'Invalid start/end selection' }, { status: 400 })
    }
    const duration = end - start
    if (duration > MAX_CLIP_SECONDS) {
      return NextResponse.json({ error: 'Selected section is too long — keep clips short' }, { status: 400 })
    }

    if (!ffmpegPath) {
      console.error('[trim-video] ffmpeg-static did not resolve a binary path')
      return NextResponse.json({ error: 'Video trimming is unavailable on this server' }, { status: 500 })
    }

    const jobId = randomUUID()
    const inputExt = file.name.match(/\.[^./]+$/)?.[0] || '.mp4'
    const inputPath = path.join(tmpdir(), `chat-trim-in-${jobId}${inputExt}`)
    const outputPath = path.join(tmpdir(), `chat-trim-out-${jobId}.mp4`)
    tempFiles.push(inputPath, outputPath)

    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()))

    // -ss before -i (fast seek) combined with re-encoding the output still
    // lands on the exact requested timestamp — it only loses accuracy when
    // paired with -c copy (stream copy), which this deliberately avoids.
    await execFileAsync(ffmpegPath, [
      '-y',
      '-ss', String(start),
      '-i', inputPath,
      '-t', String(duration),
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      outputPath,
    ], { timeout: 2 * 60 * 1000 })

    const output = await readFile(outputPath)
    if (output.length < 1024) {
      return NextResponse.json({ error: 'Trimming produced an empty clip — try a different section' }, { status: 500 })
    }
    if (output.length > MAX_TRIMMED_SIZE) {
      return NextResponse.json({ error: `Trimmed clip is still ${(output.length / (1024 * 1024)).toFixed(1)}MB — select a shorter section and try again.` }, { status: 400 })
    }

    return new NextResponse(output, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(output.length),
      },
    })
  } catch (err) {
    console.error('[POST /api/chat/attachments/trim-video]', err)
    return NextResponse.json({ error: 'Failed to trim video' }, { status: 500 })
  } finally {
    await Promise.all(tempFiles.map(p => unlink(p).catch(() => {})))
  }
}
