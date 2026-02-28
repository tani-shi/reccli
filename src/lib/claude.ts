import { query } from "@anthropic-ai/claude-agent-sdk";
import { spawn as nodeSpawn } from "node:child_process";

export async function claudePrompt(
  prompt: string,
  workspacePath: string
): Promise<string> {
  let result = "";
  for await (const message of query({
    prompt,
    options: {
      cwd: workspacePath,
      permissionMode: "dontAsk",
      allowedTools: ["WebSearch", "WebFetch", "Read", "Grep", "Glob"],
      settingSources: ["project"],
    },
  })) {
    if ("result" in message) {
      result = message.result;
    }
  }
  if (!result) {
    throw new Error("No response from Claude");
  }
  return result;
}

export async function claudeEdit(
  prompt: string,
  workspacePath: string
): Promise<string> {
  let result = "";
  for await (const message of query({
    prompt,
    options: {
      cwd: workspacePath,
      permissionMode: "acceptEdits",
      allowedTools: ["Read", "Edit", "Write", "Glob", "Grep"],
      settingSources: ["project"],
    },
  })) {
    if ("result" in message) {
      result = message.result;
    }
  }
  if (!result) {
    throw new Error("No response from Claude");
  }
  return result;
}

export function claudePassthrough(
  args: string[],
  workspacePath: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = nodeSpawn("claude", args, {
      cwd: workspacePath,
      stdio: "inherit",
    });
    proc.on("close", (code) => resolve(code ?? 0));
    proc.on("error", (err) => {
      const e = err as NodeJS.ErrnoException;
      if (e.code === "ENOENT") {
        reject(
          new Error(
            "claude not found. Install Claude Code first: https://docs.anthropic.com/en/docs/claude-code"
          )
        );
      } else {
        reject(err);
      }
    });
  });
}
