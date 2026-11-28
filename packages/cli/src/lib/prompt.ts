import { stdin, stderr } from "node:process";

function promptHidden(label: string): Promise<string> {
  if (!stdin.isTTY) {
    throw new Error("No interactive TTY available. Set FORREL_PASSPHRASE in the environment.");
  }

  return new Promise((resolve, reject) => {
    stderr.write(label);
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";

    const cleanup = () => {
      stdin.setRawMode(Boolean(wasRaw));
      stdin.pause();
      stdin.removeListener("data", onData);
    };

    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stderr.write("\n");
          cleanup();
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          stderr.write("\n");
          cleanup();
          reject(new Error("Cancelled."));
          return;
        }
        if (ch === "\u007f" || ch === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += ch;
      }
    };

    stdin.on("data", onData);
  });
}

/**
 * Resolve a keyfile passphrase from `FORREL_PASSPHRASE` (or `envVar`) or an interactive
 * hidden prompt. When `confirm` is true, asks twice for new keyfiles.
 */
export async function readPassphrase(opts: {
  envVar?: string;
  label?: string;
  confirm?: boolean;
} = {}): Promise<string> {
  const envKey = opts.envVar ?? "FORREL_PASSPHRASE";
  const fromEnv = process.env[envKey];
  if (fromEnv !== undefined && fromEnv.length > 0) {
    return fromEnv;
  }

  const first = await promptHidden(opts.label ?? "Passphrase: ");
  if (first.length === 0) {
    throw new Error("Passphrase cannot be empty.");
  }
  if (opts.confirm) {
    const second = await promptHidden("Confirm passphrase: ");
    if (first !== second) {
      throw new Error("Passphrases do not match.");
    }
  }
  return first;
}
