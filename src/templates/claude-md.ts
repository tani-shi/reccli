export function generateClaudeMd(): string {
  return `# rec workspace

This directory is a rec CLI workspace containing audio recordings, transcripts, and summaries.

## Directory structure

- \`records/\` — each subdirectory is one recording session
  - \`audio.wav\` — recorded audio
  - \`transcript.md\` — full transcription
  - \`summary.md\` — AI-generated summary
  - \`metadata.json\` — session metadata (id, createdAt, duration, title)
- \`config.json\` — workspace configuration

## Guidelines

- When asked about recordings, search through \`records/*/transcript.md\` and \`records/*/summary.md\`.
- Reference specific recordings by their directory name (ID).
- When summarizing or analyzing, consider all available transcripts and summaries.
- Respond in the same language as the transcripts unless asked otherwise.
`;
}
