#!/usr/bin/env node
const http = require("http");
const fs = require("fs");

const serverJson = JSON.parse(fs.readFileSync("./server.json", "utf8"));
const MCP_URL = process.env.MCP_URL || "https://mail.misar.io/api/mcp";
const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve server metadata
  if (req.method === "GET" && (req.url === "/" || req.url === "/server.json")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(serverJson, null, 2));
    return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", version: serverJson.version }));
    return;
  }

  // Proxy MCP calls to hosted endpoint
  if (req.method === "POST") {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);

      const headers = {
        "Content-Type": "application/json",
        "Content-Length": body.length.toString(),
      };

      // Forward auth header
      if (req.headers.authorization) {
        headers["Authorization"] = req.headers.authorization;
      }
      if (req.headers["mcp-session-id"]) {
        headers["Mcp-Session-Id"] = req.headers["mcp-session-id"];
      }

      const url = new URL(MCP_URL);
      const proto = url.protocol === "https:" ? require("https") : http;

      const proxyReq = proto.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === "https:" ? 443 : 80),
          path: url.pathname,
          method: "POST",
          headers,
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on("error", (err) => {
        console.error("Proxy error:", err.message);
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Upstream MCP server unavailable" }));
      });

      proxyReq.write(body);
      proxyReq.end();
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`MisarMail MCP proxy listening on port ${PORT}`);
  console.log(`Proxying to: ${MCP_URL}`);
  console.log(`Version: ${serverJson.version}`);
});
