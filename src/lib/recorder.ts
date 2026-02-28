import { spawn } from "node:child_process";
import { RecConfig } from "../types.js";

export interface RecordingResult {
  filePath: string;
  duration: number;
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
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const deviceIndex = deviceIndexOverride ?? config.recording.deviceIndex;

    const proc = spawn("nice", [
      "-n", "-10",
      "ffmpeg",
      "-f", "avfoundation",
      "-i", `:${deviceIndex}`,
      "-acodec", config.recording.acodec,
      "-ar", String(config.recording.sampleRate),
      "-ac", String(config.recording.channels),
      "-y",
      outputPath,
    ], {
      stdio: ["pipe", "pipe", "pipe"],
    });

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
