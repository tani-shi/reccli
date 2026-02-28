import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import chalk from "chalk";
import {
  resolveWorkspacePath,
  isCustomWorkspacePath,
  buildConfig,
  saveConfig,
  configPath,
} from "../lib/config.js";
import { recordsDir } from "../lib/workspace.js";
import { listAudioDevices } from "../lib/recorder.js";
import { generateClaudeMd } from "../templates/claude-md.js";

export async function initCommand(
  inputPath?: string,
  options: { force?: boolean } = {}
): Promise<void> {
  const workspacePath = resolveWorkspacePath(inputPath);

  // Check if already initialized
  if (!options.force) {
    try {
      await fs.access(configPath(workspacePath));
      console.error(
        chalk.red(
          `Workspace already initialized at ${workspacePath}.\nUse --force to reinitialize.`
        )
      );
      process.exit(1);
    } catch {
      // Not initialized yet — proceed
    }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log(`Initializing workspace at: ${workspacePath}\n`);

    // Language
    const language = await rl.question("Language (ja/en/auto) [ja]: ");
    const lang = language.trim() || "ja";

    // Provider
    const providerInput = await rl.question(
      "Transcription provider (openai/local-whisper) [openai]: "
    );
    const provider = (providerInput.trim() || "openai") as
      | "openai"
      | "local-whisper";

    // OpenAI API key check
    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      console.log(
        "\nWarning: OPENAI_API_KEY is not set. Set it before using rec record."
      );
    }

    // Audio device
    let deviceIndex = 0;
    console.log("\nDetecting audio devices...");
    const devices = await listAudioDevices();
    if (devices.length > 0) {
      console.log("\nAvailable audio input devices:");
      for (const d of devices) {
        console.log(`  ${d}`);
      }
      const deviceInput = await rl.question(
        `\nDevice index [0]: `
      );
      deviceIndex = parseInt(deviceInput.trim() || "0", 10);
    } else {
      console.log("No devices detected (ffmpeg may not be installed).");
      console.log("Using default device index 0.");
    }

    // Create workspace
    await fs.mkdir(recordsDir(workspacePath), { recursive: true });

    // Save config
    const config = buildConfig(workspacePath, {
      language: lang,
      provider,
      deviceIndex,
    });
    await saveConfig(config);

    // Write CLAUDE.md
    await fs.writeFile(
      path.join(workspacePath, "CLAUDE.md"),
      generateClaudeMd()
    );

    console.log(`\nWorkspace initialized at ${workspacePath}`);

    if (isCustomWorkspacePath(workspacePath)) {
      console.log(
        chalk.yellow(
          `\nSet the environment variable to use this workspace:\n  export REC_WORKSPACE="${workspacePath}"`
        )
      );
    }
  } finally {
    rl.close();
  }
}
