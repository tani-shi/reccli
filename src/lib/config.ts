import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { RecConfig, DEFAULT_CONFIG } from "../types.js";

const DEFAULT_WORKSPACE = path.join(os.homedir(), ".rec");

export function resolveWorkspacePath(input?: string): string {
  if (input) {
    if (input.startsWith("~")) {
      return path.join(os.homedir(), input.slice(1));
    }
    return path.resolve(input);
  }
  if (process.env.REC_WORKSPACE) {
    const envPath = process.env.REC_WORKSPACE;
    if (envPath.startsWith("~")) {
      return path.join(os.homedir(), envPath.slice(1));
    }
    return path.resolve(envPath);
  }
  return DEFAULT_WORKSPACE;
}

export function isCustomWorkspacePath(workspacePath: string): boolean {
  return workspacePath !== DEFAULT_WORKSPACE;
}

export function configPath(workspacePath: string): string {
  return path.join(workspacePath, "config.json");
}

export async function loadConfig(workspacePath?: string): Promise<RecConfig> {
  const ws = workspacePath ?? DEFAULT_WORKSPACE;
  const fp = configPath(ws);
  const raw = await fs.readFile(fp, "utf-8");
  return JSON.parse(raw) as RecConfig;
}

export async function saveConfig(config: RecConfig): Promise<void> {
  const fp = configPath(config.workspacePath);
  await fs.writeFile(fp, JSON.stringify(config, null, 2) + "\n");
}

export async function ensureConfigExists(): Promise<RecConfig> {
  const ws = resolveWorkspacePath();
  try {
    return await loadConfig(ws);
  } catch {
    console.error(
      `Workspace not initialized. Run "rec init" first.`
    );
    process.exit(1);
  }
}

export function buildConfig(
  workspacePath: string,
  overrides: Partial<{
    language: string;
    deviceIndex: number;
  }> = {}
): RecConfig {
  const config: RecConfig = {
    workspacePath,
    ...DEFAULT_CONFIG,
  };
  if (overrides.language !== undefined) {
    config.transcription.language = overrides.language;
  }
  if (overrides.deviceIndex !== undefined) {
    config.recording.deviceIndex = overrides.deviceIndex;
  }
  return config;
}
