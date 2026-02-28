import { ensureConfigExists } from "../lib/config.js";
import { claudePassthrough } from "../lib/claude.js";

export async function searchCommand(prompt: string): Promise<void> {
  const config = await ensureConfigExists();
  const code = await claudePassthrough(["-p", prompt], config.workspacePath);
  process.exit(code);
}
