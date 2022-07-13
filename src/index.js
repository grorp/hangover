import { createServer } from "http";
import express from "express";
import { Server as SockServer } from "socket.io";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));

const app = express();
app.set("env", "production");
app.set("x-powered-by", false);
app.use(express.static(join(dir, "frontend")));

const httpServer = createServer(app);
const sockserv = new SockServer(httpServer);

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

sockserv.on("connection", (sock) => {
  sock.on("request_peer", () => request(sock));

  sock.on("message", (content) => {
    if (sock.data.peer) {
      sock.data.peer.emit("message", content);
    }
  });

  sock.on("leave_peer", () => leave(sock));
  sock.on("disconnect", () => leave(sock));
});

const port = 8080;
httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}.`);
});
