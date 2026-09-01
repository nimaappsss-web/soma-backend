import * as fs from "fs";
import * as path from "path";

const SECRETS_DIR = "/etc/secrets";

export const envGet = (key: string): string | undefined => {
  if (process.env[key]) return process.env[key]!;
  try {
    const file = path.join(SECRETS_DIR, key);
    if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  } catch {
    /* ignore file read errors */
  }
  return undefined;
};

export const loadRenderSecrets = (): void => {
  try {
    if (!fs.existsSync(SECRETS_DIR)) return;
    for (const file of fs.readdirSync(SECRETS_DIR)) {
      try {
        const value = fs.readFileSync(path.join(SECRETS_DIR, file), "utf8").trim();
        if (value && !process.env[file]) process.env[file] = value;
      } catch {
        /* ignore individual file errors */
      }
    }
  } catch {
    /* ignore directory read errors */
  }
};