import chalk from "chalk";
import ora from "ora";
import { ensureConfigExists } from "../lib/config.js";
import { findRecordById } from "../lib/workspace.js";
import { claudeEdit } from "../lib/claude.js";

export async function editCommand(
  id: string,
  prompt: string
): Promise<void> {
  const config = await ensureConfigExists();

  const record = await findRecordById(config.workspacePath, id);
  if (!record) {
    console.error(chalk.red(`No recording found matching: ${id}`));
    process.exit(1);
  }

  const fullPrompt = `Edit the recording at ${record.dir}.
The recording contains:
- transcript.md: full transcription
- summary.md: AI-generated summary
- metadata.json: session metadata

User request: ${prompt}`;

  const spinner = ora("Editing...").start();
  try {
    const result = await claudeEdit(fullPrompt, config.workspacePath);
    spinner.succeed("Edit complete.");
    console.log();
    console.log(result);
  } catch (err) {
    spinner.fail("Edit failed.");
    throw err;
  }
}
