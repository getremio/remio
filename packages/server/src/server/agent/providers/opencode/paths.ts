import path from "node:path";

import { resolveRemioHome } from "../../../remio-home.js";

const OPENCODE_HOME_DIRNAME = "opencode-home";

export function resolveOpenCodeHomeDir(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(resolveRemioHome(env), OPENCODE_HOME_DIRNAME);
}
