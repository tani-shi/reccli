import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { RecConfig } from "../types.js";

const execFileAsync = promisify(execFile);

export async function transcribe(
  audioPath: string,
  config: RecConfig,
  languageOverride?: string
): Promise<string> {
  const language = languageOverride || config.transcription.language;
  return transcribeOpenAI(audioPath, language);
}

async function convertToWhisperFormat(audioPath: string): Promise<string> {
  const tmpFile = path.join(
    os.tmpdir(),
    `rec-whisper-${Date.now()}.wav`
  );
  await execFileAsync("ffmpeg", [
    "-nostdin",
    "-threads", "0",
    "-i", audioPath,
    "-ac", "1",
    "-acodec", "pcm_s16le",
    "-ar", "16000",
    "-y",
    tmpFile,
  ]);
  return tmpFile;
}

async function transcribeOpenAI(
  audioPath: string,
  language: string
): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI();

  const convertedPath = await convertToWhisperFormat(audioPath);
  try {
    const file = fs.createReadStream(convertedPath);
    const response = await client.audio.transcriptions.create({
      model: "whisper-1",
      file,
      ...(language && language !== "auto" ? { language } : {}),
    });
    return response.text;
  } finally {
    fs.promises.unlink(convertedPath).catch(() => {});
  }
}

