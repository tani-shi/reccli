export interface RecConfig {
  workspacePath: string;
  recording: {
    deviceIndex: number;
  };
  transcription: {
    model: string;
    language: string;
  };
}

export interface RecordMetadata {
  id: string;
  createdAt: string;
  duration: number;
  title: string;
  sessionId?: string;
}

export const DEFAULT_CONFIG: Omit<RecConfig, "workspacePath"> = {
  recording: {
    deviceIndex: 0,
  },
  transcription: {
    model: "whisper-1",
    language: "ja",
  },
};
