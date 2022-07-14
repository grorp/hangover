import express from "express";
import { Server as SockServer } from "socket.io";
import { readFileSync } from "node:fs";
import { createServer as createServerHTTP } from "node:http";
import { createServer as createServerHTTPS } from "node:https";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

const httpServer = createServerHTTP((req, res) => {
  res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
  res.end();
});

const app = express();
app.set("env", "production");
app.set("x-powered-by", false);
app.use(express.static(join(dir, "frontend")));

const httpsServer = createServerHTTPS(
  {
    key: readFileSync(process.env.TLS_KEY),
    cert: readFileSync(process.env.TLS_CERT),
  },
  app
);

const sockServer = new SockServer(httpsServer);

let waiting = [];

const request = (sock) => {
  if (!waiting.includes(sock)) {
    waiting.push(sock);
    tryCouple();
  }
};

const tryCouple = () => {
  if (waiting.length === 2) {
    waiting[0].data.peer = waiting[1];
    waiting[0].emit("found_peer");
    waiting[1].data.peer = waiting[0];
    waiting[1].emit("found_peer");

    waiting = [];
  }
};

const leave = (sock) => {
  waiting = waiting.filter((it) => it !== sock);

  if (sock.data.peer) {
    sock.data.peer.emit("peer_left");

    delete sock.data.peer.data.peer;
    delete sock.data.peer;
  }
};

sockServer.on("connection", (sock) => {
  sock.on("request_peer", () => request(sock));

  sock.on("message", (content) => {
    if (sock.data.peer) {
      sock.data.peer.emit("message", content);
    }
  });

  sock.on("leave_peer", () => leave(sock));
  sock.on("disconnect", () => leave(sock));
});

httpServer.listen(80, () => console.log("HTTP server started."));
httpsServer.listen(443, () => console.log("HTTPS server started."));
