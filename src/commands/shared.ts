import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { RecConfig } from "../types.js";
import { transcribe } from "../lib/transcriber.js";
import { claudePrompt } from "../lib/claude.js";
import {
  generateId,
  createRecordDir,
  saveMetadata,
  recordsDir,
} from "../lib/workspace.js";

/**
 * Process a recording that is already saved in a record directory.
 * Used by `rec record` — audio is already in recordDir.
 */
export async function processRecording(
  audioPath: string,
  duration: number,
  config: RecConfig,
  recordDir: string,
  createdAt: Date,
  languageOverride?: string
): Promise<void> {
  // Pre-check: API key
  if (!process.env.OPENAI_API_KEY) {
    console.error(
      chalk.red("OPENAI_API_KEY is not set. Set it before transcribing:\n  export OPENAI_API_KEY='sk-...'")
    );
    process.exit(1);
  }

  // Phase 2: Transcribe
  const spinner = ora("Transcribing...").start();
  let transcript: string;
  try {
    transcript = await transcribe(audioPath, config, languageOverride);
    spinner.succeed("Transcription complete.");
  } catch (err) {
    spinner.fail("Transcription failed.");
    throw err;
  }

  // Save transcript immediately
  await fs.writeFile(path.join(recordDir, "transcript.md"), transcript + "\n");

  // Phase 3: Summarize & generate title
  const summarySpinner = ora("Generating summary...").start();
  let summary: string;
  let title: string;
  let sessionId: string;
  try {
    const prompt = `You have the following transcript of an audio recording. Do two things:

1. Write a concise summary in the same language as the transcript. Use markdown formatting.
2. On the very last line, output ONLY a short English slug title (lowercase, hyphens, no spaces, max 40 chars) that describes the topic. Example: standup-meeting, project-review, interview-notes

Transcript:
${transcript}`;

    const response = await claudePrompt(prompt, config.workspacePath);
    sessionId = response.sessionId;
    const lines = response.result.trim().split("\n");
    title = lines[lines.length - 1].trim();
    summary = lines.slice(0, -1).join("\n").trim();

    // Sanitize title
    title = title
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);

    if (!title) title = "untitled";

    summarySpinner.succeed("Summary generated.");
  } catch (err) {
    summarySpinner.fail("Summary generation failed.");
    throw err;
  }

  // Phase 4: Save summary and rename directory
  await fs.writeFile(path.join(recordDir, "summary.md"), summary + "\n");

  const id = generateId(createdAt, title);
  const newDir = path.join(recordsDir(config.workspacePath), id);

  if (recordDir !== newDir) {
    await fs.rename(recordDir, newDir);
  }

  await saveMetadata(newDir, {
    id,
    createdAt: createdAt.toISOString(),
    duration,
    title,
    sessionId: sessionId || undefined,
  });

  console.log(chalk.green(`\nSaved as: ${id}`));
  console.log(chalk.dim(`  ${newDir}\n`));

  // Show summary
  console.log(chalk.bold("Summary:"));
  console.log(summary);
  console.log();

  // Guide for adjustment
  console.log(chalk.dim(`To adjust, run:`));
  console.log(chalk.dim(`  rec edit ${id} "your instructions here"`));

  // Show Claude Code session ID
  if (sessionId) {
    console.log();
    console.log(chalk.dim(`Session: ${sessionId}`));
  }
}

/**
 * Process an external audio file (used by `rec transcribe`).
 * Copies audio into a new record directory, then runs the same flow.
 */
export async function processExternalAudio(
  audioPath: string,
  duration: number,
  config: RecConfig,
  languageOverride?: string
): Promise<void> {
  const now = new Date();
  const tempId = generateId(now, "processing");
  const recordDir = await createRecordDir(config.workspacePath, tempId);

  await fs.copyFile(audioPath, path.join(recordDir, "audio.wav"));
  await saveMetadata(recordDir, {
    id: tempId,
    createdAt: now.toISOString(),
    duration,
    title: "processing",
  });

  console.log(chalk.dim(`Audio saved: ${recordDir}\n`));

  await processRecording(
    path.join(recordDir, "audio.wav"),
    duration,
    config,
    recordDir,
    now,
    languageOverride
  );
}
