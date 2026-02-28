import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { ensureConfigExists } from "../lib/config.js";
import { processExternalAudio } from "./shared.js";

export async function transcribeCommand(
  audioFile: string,
  options: { language?: string }
): Promise<void> {
  const config = await ensureConfigExists();

  // Verify audio file exists
  const resolvedPath = path.resolve(audioFile);
  try {
    await fs.access(resolvedPath);
  } catch {
    console.error(chalk.red(`File not found: ${resolvedPath}`));
    process.exit(1);
  }

  // Get duration via ffprobe (best effort)
  let duration = 0;
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "quiet",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      resolvedPath,
    ]);
    duration = Math.round(parseFloat(stdout.trim()) || 0);
  } catch {
    // ffprobe not available or failed, duration stays 0
  }

  console.log(chalk.yellow(`Processing: ${resolvedPath}\n`));

  await processExternalAudio(resolvedPath, duration, config, options.language);
}
