import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { RecConfig } from "../types.js";

const execFileAsync = promisify(execFile);

export interface RecordingResult {
  filePath: string;
  duration: number;
}

interface AudioDeviceInfo {
  name: string;
  sampleRate: number;
  channels: number;
  isDefaultInput: boolean;
}

export async function getSystemAudioDevices(): Promise<AudioDeviceInfo[]> {
  const { stdout } = await execFileAsync("system_profiler", ["SPAudioDataType"]);
  const devices: AudioDeviceInfo[] = [];
  let currentName: string | null = null;
  let currentDevice: Partial<AudioDeviceInfo> = {};

  for (const line of stdout.split("\n")) {
    const trimmed = line.trimEnd();

    // Device name line: indented exactly 8 spaces, ends with ":"
    if (/^ {8}\S/.test(trimmed) && trimmed.endsWith(":")) {
      if (currentName && currentDevice.channels !== undefined) {
        devices.push({
          name: currentName,
          sampleRate: currentDevice.sampleRate ?? 48000,
          channels: currentDevice.channels,
          isDefaultInput: currentDevice.isDefaultInput ?? false,
        });
      }
      currentName = trimmed.trim().replace(/:$/, "");
      currentDevice = {};
      continue;
    }

    const kvMatch = trimmed.match(/^\s+(.+?):\s+(.+)$/);
    if (!kvMatch) continue;
    const [, key, value] = kvMatch;

    if (key === "Input Channels") {
      currentDevice.channels = parseInt(value, 10);
    } else if (key === "Current SampleRate") {
      currentDevice.sampleRate = parseInt(value, 10);
    } else if (key === "Default Input Device" && value === "Yes") {
      currentDevice.isDefaultInput = true;
    }
  }

  // Flush last device
  if (currentName && currentDevice.channels !== undefined) {
    devices.push({
      name: currentName,
      sampleRate: currentDevice.sampleRate ?? 48000,
      channels: currentDevice.channels,
      isDefaultInput: currentDevice.isDefaultInput ?? false,
    });
  }

  return devices;
}

export async function getAudioDeviceName(deviceIndex: number): Promise<string | undefined> {
  const devices = await listAudioDevices();
  for (const d of devices) {
    const match = d.match(/^\[(\d+)] (.+)$/);
    if (match && parseInt(match[1], 10) === deviceIndex) {
      return match[2];
    }
  }
  return undefined;
}

export async function listAudioDevices(): Promise<string[]> {
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", [
      "-f", "avfoundation",
      "-list_devices", "true",
      "-i", "",
    ]);

    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", () => {
      const devices: string[] = [];
      let inAudio = false;
      for (const line of stderr.split("\n")) {
        if (line.includes("AVFoundation audio devices:")) {
          inAudio = true;
          continue;
        }
        if (inAudio) {
          const match = line.match(/\[(\d+)] (.+)/);
          if (match) {
            devices.push(`[${match[1]}] ${match[2]}`);
          } else if (!line.includes("[AVFoundation")) {
            break;
          }
        }
      }
      resolve(devices);
    });
  });
}

export async function selectAudioDevice(): Promise<number> {
  const devices = await listAudioDevices();
  if (devices.length === 0) {
    throw new Error("No audio devices detected. Is ffmpeg installed?");
  }

  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log("\nAvailable audio input devices:");
    for (const d of devices) {
      console.log(`  ${d}`);
    }
    const input = await rl.question("\nDevice index: ");
    const index = parseInt(input.trim(), 10);
    if (isNaN(index)) {
      throw new Error(`Invalid device index: ${input}`);
    }
    return index;
  } finally {
    rl.close();
  }
}

export async function record(
  outputPath: string,
  config: RecConfig,
  deviceIndexOverride?: number
): Promise<RecordingResult> {
  const deviceIndex = deviceIndexOverride ?? config.recording.deviceIndex;

  const [deviceName, systemDevices] = await Promise.all([
    getAudioDeviceName(deviceIndex),
    getSystemAudioDevices(),
  ]);
  const deviceInfo = systemDevices.find(d => deviceName?.includes(d.name))
    ?? systemDevices.find(d => d.isDefaultInput);
  const sampleRate = deviceInfo?.sampleRate ?? 48000;
  const channels = deviceInfo?.channels ?? 1;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const proc = spawn("ffmpeg", [
      "-nostats",
      "-loglevel", "warning",
      "-thread_queue_size", "1024",
      "-f", "avfoundation",
      "-i", `:${deviceIndex}`,
      "-ar", String(sampleRate),
      "-ac", String(channels),
      "-acodec", "pcm_s16le",
      "-y",
      outputPath,
    ], {
      stdio: ["pipe", "ignore", "pipe"],
    });

    // Drain stderr to prevent pipe backpressure from blocking ffmpeg
    proc.stderr!.resume();

    let stopped = false;

    const stopRecording = () => {
      if (stopped) return;
      stopped = true;
      // Send 'q' to ffmpeg stdin for graceful stop
      proc.stdin.write("q");
    };

    process.on("SIGINT", stopRecording);

    proc.on("close", (code) => {
      process.removeListener("SIGINT", stopRecording);
      const duration = Math.round((Date.now() - startTime) / 1000);
      // ffmpeg may exit with non-zero when stopped via 'q', that's fine
      if (code !== null && code !== 0 && code !== 255 && !stopped) {
        reject(new Error(`ffmpeg exited with code ${code}`));
        return;
      }
      resolve({ filePath: outputPath, duration });
    });

    proc.on("error", (err) => {
      process.removeListener("SIGINT", stopRecording);
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new Error(
            "ffmpeg not found. Install it with: brew install ffmpeg"
          )
        );
      } else {
        reject(err);
      }
    });
  });
}
