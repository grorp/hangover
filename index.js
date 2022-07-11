import { createServer } from "http";
import express from "express";
import { Server as SockServer } from "socket.io";

const app = express();
const httpServer = createServer(app);

const sockserv = new SockServer(httpServer, {
  cors: {
    origin: "*",
  },
});

let waiting = [];

const request = (sock) => {
  if (!waiting.includes(sock)) {
    console.log(`[${sock.id}] requested peer`);

    waiting.push(sock);
    tryCouple();
  } else {
    console.log(`[${sock.id}] peer request ignored`);
  }
};

const tryCouple = () => {
  console.log("trying to couple");
  console.log("waiting: " + waiting.map((sock) => sock.id).join(", "));

  if (waiting.length === 2) {
    console.log("coupling");

    waiting[0].data.peer = waiting[1];
    waiting[0].emit("found_peer");
    waiting[1].data.peer = waiting[0];
    waiting[1].emit("found_peer");

    waiting = [];
  }
};

const leave = (sock) => {
  console.log(`[${sock.id}] leaving`);

  if (waiting.includes(sock)) {
    console.log("removing from waitlist");
    waiting = waiting.filter((it) => it !== sock);
  }

  if (sock.data.peer) {
    console.log("notifying peer");
    sock.data.peer.emit("peer_left");
    delete sock.data.peer.data.peer;
  }
};

sockserv.on("connection", (sock) => {
  console.log(`[${sock.id}] connected`);

  sock.on("request_peer", () => request(sock));

  sock.on("message", (msg) => {
    if (sock.data.peer) {
      console.log(`[${sock.id}] sent message`);

      sock.data.peer.emit("message", msg);
    } else {
      console.log(`[${sock.id}] ignoring message`);
    }
  });

  sock.on("leave_peer", () => leave(sock));
  sock.on("disconnect", () => leave(sock));
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const port = 3001;
httpServer.listen(port);
console.log(`Example app listening on port ${port}`);
