import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import chalk from "chalk";
import { ensureConfigExists } from "../lib/config.js";
import { record as recordAudio, selectAudioDevice } from "../lib/recorder.js";
import { processRecording } from "./shared.js";
import { createRecordDir, generateId, saveMetadata } from "../lib/workspace.js";

export async function recordCommand(options: {
  input?: boolean;
}): Promise<void> {
  const config = await ensureConfigExists();

  // Select input device if --input is specified
  let deviceIndex: number | undefined;
  if (options.input) {
    deviceIndex = await selectAudioDevice();
  }

  // Phase 1: Record to temp file
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "rec-"));
  const tmpAudio = path.join(tmpDir, "audio.wav");

  console.log(chalk.yellow("Recording... Press Ctrl+C to stop.\n"));

  const now = new Date();
  const { duration } = await recordAudio(tmpAudio, config, deviceIndex);

  console.log(chalk.green(`\nRecording complete. Duration: ${duration}s`));

  // Save audio to workspace immediately
  const tempId = generateId(now, "processing");
  const recordDir = await createRecordDir(config.workspacePath, tempId);
  const audioPath = path.join(recordDir, "audio.wav");
  await fs.copyFile(tmpAudio, audioPath);
  await saveMetadata(recordDir, {
    id: tempId,
    createdAt: now.toISOString(),
    duration,
    title: "processing",
  });

  console.log(chalk.dim(`Audio saved: ${recordDir}\n`));

  // Cleanup temp dir
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

  // Phase 2-5: Transcribe, summarize, rename
  await processRecording(audioPath, duration, config, recordDir, now);
}
