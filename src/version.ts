/**
 * The server's identity, in one place.
 *
 * These used to be declared in index.ts while http.ts carried its own
 * hardcoded default of "3.0.0". Only the HTTP path is used by the hosted
 * endpoint, so `initialize` reported 3.0.0 to every directory that scans it
 * long after the package had reached 5.x — a drift that was invisible from the
 * file that looks like the source of truth. Keeping them here means both
 * transports read the same constant.
 *
 * Keep SERVER_VERSION in step with package.json.
 */
export const SERVER_NAME = "misarmail";
export const SERVER_VERSION = "5.1.1";
