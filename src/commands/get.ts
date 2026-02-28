import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { ensureConfigExists } from "../lib/config.js";
import { findRecordById } from "../lib/workspace.js";

export async function getCommand(
  id: string,
  options: { transcript?: boolean; json?: boolean }
): Promise<void> {
  const config = await ensureConfigExists();

  const record = await findRecordById(config.workspacePath, id);
  if (!record) {
    console.error(chalk.red(`No recording found matching: ${id}`));
    process.exit(1);
  }

  if (options.json) {
    const data: Record<string, unknown> = { ...record.metadata };
    const fileName = options.transcript ? "transcript.md" : "summary.md";
    const content = await fs.readFile(
      path.join(record.dir, fileName),
      "utf-8"
    );
    data.content = content.trim();
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const fileName = options.transcript ? "transcript.md" : "summary.md";
  const label = options.transcript ? "Transcript" : "Summary";

  console.log(chalk.bold(`${label} — ${record.metadata.id}\n`));

  const content = await fs.readFile(
    path.join(record.dir, fileName),
    "utf-8"
  );
  console.log(content.trim());
}
