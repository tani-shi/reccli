import fs from "node:fs/promises";
import path from "node:path";
import { format } from "date-fns";
import { RecordMetadata } from "../types.js";

export function recordsDir(workspacePath: string): string {
  return path.join(workspacePath, "records");
}

export function generateId(date: Date, title: string): string {
  const timestamp = format(date, "yyyyMMdd-HHmmss");
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${timestamp}-${sanitized || "untitled"}`;
}

export async function createRecordDir(
  workspacePath: string,
  id: string
): Promise<string> {
  const dir = path.join(recordsDir(workspacePath), id);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function saveMetadata(
  recordDir: string,
  metadata: RecordMetadata
): Promise<void> {
  await fs.writeFile(
    path.join(recordDir, "metadata.json"),
    JSON.stringify(metadata, null, 2) + "\n"
  );
}

export async function listRecords(
  workspacePath: string
): Promise<{ dir: string; metadata: RecordMetadata }[]> {
  const dir = recordsDir(workspacePath);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }

  const results: { dir: string; metadata: RecordMetadata }[] = [];
  for (const entry of entries) {
    const metaPath = path.join(dir, entry, "metadata.json");
    try {
      const raw = await fs.readFile(metaPath, "utf-8");
      results.push({
        dir: path.join(dir, entry),
        metadata: JSON.parse(raw) as RecordMetadata,
      });
    } catch {
      // skip directories without valid metadata
    }
  }

  // Sort by createdAt descending
  results.sort(
    (a, b) =>
      new Date(b.metadata.createdAt).getTime() -
      new Date(a.metadata.createdAt).getTime()
  );
  return results;
}

export async function findRecordById(
  workspacePath: string,
  idPrefix: string
): Promise<{ dir: string; metadata: RecordMetadata } | null> {
  const records = await listRecords(workspacePath);
  const matches = records.filter((r) => r.metadata.id.startsWith(idPrefix));
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    throw new Error(
      `Ambiguous ID prefix "${idPrefix}". Matches: ${matches.map((r) => r.metadata.id).join(", ")}`
    );
  }
  return matches[0];
}
