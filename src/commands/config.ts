import { ensureConfigExists, saveConfig, loadConfig } from "../lib/config.js";
import { listAudioDevices } from "../lib/recorder.js";
import { RecConfig } from "../types.js";

export async function configShowCommand(): Promise<void> {
  const config = await ensureConfigExists();
  console.log(JSON.stringify(config, null, 2));
}

export async function configSetCommand(
  key: string,
  value: string
): Promise<void> {
  const config = await ensureConfigExists();

  const setNested = (obj: Record<string, unknown>, path: string, val: unknown) => {
    const parts = path.split(".");
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]] as Record<string, unknown>;
      if (!current) {
        throw new Error(`Invalid config key: ${path}`);
      }
    }
    const lastKey = parts[parts.length - 1];
    if (!(lastKey in current)) {
      throw new Error(`Invalid config key: ${path}`);
    }
    // Coerce types
    const existing = current[lastKey];
    if (typeof existing === "number") {
      current[lastKey] = Number(val);
    } else {
      current[lastKey] = val;
    }
  };

  setNested(config as unknown as Record<string, unknown>, key, value);
  await saveConfig(config as RecConfig);
  console.log(`Set ${key} = ${value}`);
}

export async function configDevicesCommand(): Promise<void> {
  const devices = await listAudioDevices();
  if (devices.length === 0) {
    console.log("No audio devices detected.");
    return;
  }
  console.log("Available audio input devices:");
  for (const d of devices) {
    console.log(`  ${d}`);
  }
}
