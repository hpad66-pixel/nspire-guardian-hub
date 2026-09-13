#!/usr/bin/env node
/**
 * Local stdio bridge for MCP hosts that do not support remote HTTP MCP yet.
 *
 * Required environment:
 * - PROJ_OS_MCP_URL   e.g. https://<project-ref>.supabase.co/functions/v1/proj-os-mcp
 * - PROJ_OS_MCP_TOKEN short-lived token from /functions/v1/oauth-token
 *
 * The bridge does not know Proj OS credentials. It only forwards JSON-RPC
 * messages over stdio to the remote Proj OS MCP endpoint.
 */

import readline from "node:readline";

const url = process.env.PROJ_OS_MCP_URL;
const token = process.env.PROJ_OS_MCP_TOKEN;

if (!url || !token) {
  process.stderr.write("Missing PROJ_OS_MCP_URL or PROJ_OS_MCP_TOKEN.\n");
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", async (line) => {
  if (!line.trim()) return;

  let request;
  try {
    request = JSON.parse(line);
  } catch {
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "parse_error" },
    }) + "\n");
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (response.status === 202 || response.status === 204) return;
    const text = await response.text();
    process.stdout.write((text || JSON.stringify({
      jsonrpc: "2.0",
      id: request.id ?? null,
      error: { code: -32603, message: "empty_remote_response" },
    })) + "\n");
  } catch (error) {
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0",
      id: request.id ?? null,
      error: { code: -32603, message: error instanceof Error ? error.message : "bridge_error" },
    }) + "\n");
  }
});
