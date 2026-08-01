/**
 * MCP protocol version advertised on `initialize`.
 *
 * Kept in its own module so the stdio server (which gets this from the SDK) and
 * the hand-rolled HTTP handler can never drift to different versions.
 */
export const SERVER_PROTOCOL_VERSION = "2025-06-18";
