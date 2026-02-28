import chalk from "chalk";
import Table from "cli-table3";
import { format } from "date-fns";
import { ensureConfigExists } from "../lib/config.js";
import { listRecords } from "../lib/workspace.js";

export async function listCommand(options: {
  limit?: string;
  json?: boolean;
}): Promise<void> {
  const config = await ensureConfigExists();
  let records = await listRecords(config.workspacePath);

  if (options.limit) {
    records = records.slice(0, parseInt(options.limit, 10));
  }

  if (records.length === 0) {
    console.log("No recordings found.");
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(records.map((r) => r.metadata), null, 2));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold("ID"),
      chalk.bold("Date"),
      chalk.bold("Duration"),
      chalk.bold("Title"),
    ],
    style: { head: [] },
  });

  for (const { metadata } of records) {
    const date = format(new Date(metadata.createdAt), "yyyy-MM-dd HH:mm");
    const dur = `${metadata.duration}s`;
    // Show a short ID prefix for display
    const shortId = metadata.id.slice(0, 20);
    table.push([shortId, date, dur, metadata.title]);
  }

  console.log(table.toString());
}
