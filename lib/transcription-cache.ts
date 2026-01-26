import { promises as fs } from 'fs';
import path from 'path';

// Use file-based cache since in-memory doesn't persist in serverless
const CACHE_DIR = '/tmp/dubbing-transcriptions';

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
}

export async function setOriginalTranscription(dubbingId: string, data: any) {
  try {
    await ensureCacheDir();
    const filePath = path.join(CACHE_DIR, `${dubbingId}_original.json`);
    await fs.writeFile(filePath, JSON.stringify(data));
    console.log(`Cached original transcription for ${dubbingId} at ${filePath}`);
  } catch (error) {
    console.error('Failed to cache transcription:', error);
  }
}

export async function getOriginalTranscription(dubbingId: string): Promise<any | null> {
  try {
    await ensureCacheDir();
    const filePath = path.join(CACHE_DIR, `${dubbingId}_original.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet
    return null;
  }
}

export async function hasOriginalTranscription(dubbingId: string): Promise<boolean> {
  try {
    const filePath = path.join(CACHE_DIR, `${dubbingId}_original.json`);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
