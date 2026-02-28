export interface RecConfig {
  workspacePath: string;
  recording: {
    sampleRate: number;
    channels: number;
    format: string;
    acodec: string;
    deviceIndex: number;
  };
  transcription: {
    provider: "openai" | "local-whisper";
    model: string;
    language: string;
  };
}

export interface RecordMetadata {
  id: string;
  createdAt: string;
  duration: number;
  title: string;
}

export const DEFAULT_CONFIG: Omit<RecConfig, "workspacePath"> = {
  recording: {
    sampleRate: 16000,
    channels: 1,
    format: "wav",
    acodec: "pcm_s16le",
    deviceIndex: 0,
  },
  transcription: {
    provider: "openai",
    model: "whisper-1",
    language: "ja",
  },
};
