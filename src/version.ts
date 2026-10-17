/**
 * The server's identity, in one place.
 *
 * Both transports used to hardcode "3.0.0" (index.ts, and http.ts's default,
 * which is what the hosted endpoint uses), so `initialize` reported 3.0.0 long
 * after the package reached 5.x. Read the version from package.json — always
 * shipped by npm, one level above dist/ — so it cannot drift again.
 */
import { createRequire } from "node:module";

export const SERVER_NAME = "misarmail";
export const SERVER_VERSION: string = (
  createRequire(import.meta.url)("../package.json") as { version: string }
).version;
