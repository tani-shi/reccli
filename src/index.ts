import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { configShowCommand, configSetCommand, configDevicesCommand } from "./commands/config.js";
import { recordCommand } from "./commands/record.js";
import { transcribeCommand } from "./commands/transcribe.js";
import { listCommand } from "./commands/list.js";
import { getCommand } from "./commands/get.js";
import { searchCommand } from "./commands/search.js";
import { chatCommand } from "./commands/chat.js";
import { editCommand } from "./commands/edit.js";

const program = new Command();

program
  .name("rec")
  .description("Record, transcribe, and summarize audio")
  .version("0.1.0");

program
  .command("init [path]")
  .description("Initialize a rec workspace")
  .option("-f, --force", "Reinitialize an existing workspace")
  .action(async (path: string | undefined, options: { force?: boolean }) => {
    await initCommand(path, options);
  });

const configCmd = program
  .command("config")
  .description("Show or update workspace configuration");

configCmd
  .command("show", { isDefault: true })
  .description("Show current configuration")
  .action(async () => {
    await configShowCommand();
  });

configCmd
  .command("set <key> <value>")
  .description("Update a configuration value")
  .action(async (key: string, value: string) => {
    await configSetCommand(key, value);
  });

configCmd
  .command("devices")
  .description("List available audio input devices")
  .action(async () => {
    await configDevicesCommand();
  });

program
  .command("record")
  .description("Record audio, transcribe, and summarize")
  .option("-i, --input", "Select audio input device before recording")
  .action(async (options: { input?: boolean }) => {
    await recordCommand(options);
  });

program
  .command("transcribe <audio>")
  .description("Transcribe an existing audio file")
  .option("-l, --language <lang>", "Override transcription language")
  .action(async (audio: string, options: { language?: string }) => {
    await transcribeCommand(audio, options);
  });

program
  .command("list")
  .description("List recordings")
  .option("--limit <n>", "Limit number of results")
  .option("--json", "Output as JSON")
  .action(async (options: { limit?: string; json?: boolean }) => {
    await listCommand(options);
  });

program
  .command("get <id>")
  .description("Get a recording summary or transcript")
  .option("-t, --transcript", "Show transcript instead of summary")
  .option("--json", "Output as JSON")
  .action(async (id: string, options: { transcript?: boolean; json?: boolean }) => {
    await getCommand(id, options);
  });

program
  .command("edit <id> <prompt>")
  .description("Edit a recording's summary/transcript with a prompt")
  .action(async (id: string, prompt: string) => {
    await editCommand(id, prompt);
  });

program
  .command("search <prompt>")
  .description("Search recordings with Claude Code")
  .action(async (prompt: string) => {
    await searchCommand(prompt);
  });

program
  .command("chat")
  .description("Open Claude Code in the workspace")
  .action(async () => {
    await chatCommand();
  });

program.parseAsync();
