# reccli

Record, transcribe, and summarize audio from the terminal.

## Prerequisites

- Node.js 22+
- ffmpeg (`brew install ffmpeg`)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)
- `OPENAI_API_KEY` environment variable

## Installation

```sh
pnpm install && pnpm build
npm link
```

## Quick Start

```sh
rec init
rec record
rec list
rec get <id>
```

## Commands

| Command | Description | Key Options |
|---------|-------------|-------------|
| `rec init [path]` | Initialize a workspace | `-f, --force` |
| `rec config show` | Show current configuration | |
| `rec config set <key> <value>` | Update a configuration value | |
| `rec config devices` | List available audio input devices | |
| `rec record` | Record audio, transcribe, and summarize | `-i, --input` |
| `rec transcribe <audio>` | Transcribe an existing audio file | `-l, --language <lang>` |
| `rec list` | List recordings | `--limit <n>`, `--json` |
| `rec get <id>` | Get a recording summary or transcript | `-t, --transcript`, `--json` |
| `rec edit <id> <prompt>` | Edit a recording with a prompt | |
| `rec search <prompt>` | Search recordings with Claude Code | |
| `rec chat` | Open Claude Code in the workspace | |

## Configuration

The workspace is located at `~/.rec` by default. Override with the `REC_WORKSPACE` environment variable or by passing a path to `rec init`.

`config.json` structure:

```json
{
  "recording": {
    "deviceIndex": 0
  },
  "transcription": {
    "model": "whisper-1",
    "language": "ja"
  }
}
```

| Key | Description | Default |
|-----|-------------|---------|
| `recording.deviceIndex` | Audio input device index | `0` |
| `transcription.model` | OpenAI transcription model | `whisper-1` |
| `transcription.language` | Language code (`ja`, `en`, `auto`) | `ja` |

Environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for transcription |
| `REC_WORKSPACE` | No | Custom workspace path |

## Workspace Structure

```
~/.rec/
├── config.json
├── CLAUDE.md
└── records/
    └── YYYYMMDD-HHmmss-title-slug/
        ├── audio.wav
        ├── transcript.md
        ├── summary.md
        └── metadata.json
```
