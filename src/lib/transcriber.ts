import fs from "node:fs";
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

  if (config.transcription.provider === "openai") {
    return transcribeOpenAI(audioPath, language);
  }
  return transcribeLocal(audioPath, config.transcription.model, language);
}

async function transcribeOpenAI(
  audioPath: string,
  language: string
): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI();

  const file = fs.createReadStream(audioPath);
  const response = await client.audio.transcriptions.create({
    model: "whisper-1",
    file,
    ...(language && language !== "auto" ? { language } : {}),
  });

  return response.text;
}

async function transcribeLocal(
  audioPath: string,
  model: string,
  language: string
): Promise<string> {
  const args = [
    "run",
    "--with", "faster-whisper-cli",
    "faster-whisper",
    audioPath,
    "--model", model,
  ];
  if (language && language !== "auto") {
    args.push("--language", language);
  }

  const { stdout } = await execFileAsync("uv", args, {
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}
