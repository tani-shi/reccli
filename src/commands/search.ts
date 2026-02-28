import ora from "ora";
import { ensureConfigExists } from "../lib/config.js";
import { claudePrompt } from "../lib/claude.js";

export async function searchCommand(prompt: string): Promise<void> {
  const config = await ensureConfigExists();

  const spinner = ora("Searching...").start();
  try {
    const result = await claudePrompt(prompt, config.workspacePath);
    spinner.succeed("Search complete.");
    console.log();
    console.log(result);
  } catch (err) {
    spinner.fail("Search failed.");
    throw err;
  }
}
