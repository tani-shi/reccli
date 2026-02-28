import { ensureConfigExists } from "../lib/config.js";
import { claudePassthrough } from "../lib/claude.js";

export async function chatCommand(): Promise<void> {
  const config = await ensureConfigExists();
  const code = await claudePassthrough([], config.workspacePath);
  process.exit(code);
}
