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

let myid_storage = {};

let connected = [];
let waiting = [];

const check_connect = () => {
  if (waiting.length === 2) {
    let peer1 = waiting[0];
    let peer2 = waiting[1];

    console.log(`[${peer1.id} ♥ ${peer2.id}] 2 waiting! making them happy`);

    myid_storage[peer1.myid] ??= {};
    myid_storage[peer2.myid] ??= {};
    myid_storage[peer1.myid].last_peer = performance.now();
    myid_storage[peer2.myid].last_peer = performance.now();

    peer1.emit("peer_found");
    peer2.emit("peer_found");

    const peer1messagehandler = (msg) => peer2.emit("message", msg);
    const peer2messagehandler = (msg) => peer1.emit("message", msg);
    peer1.on("message", peer1messagehandler);
    peer2.on("message", peer2messagehandler);

    const peer1disconnecthandler = () => {
      peer2.off("message", peer2messagehandler);
      peer2.off("disconnect", peer2disconnecthandler);

      peer2.emit("peer_lost");
      waiting.push(peer2);
      peer2.emit("queued");
      check_connect();
    };
    const peer2disconnecthandler = () => {
      peer1.off("message", peer1messagehandler);
      peer1.off("disconnect", peer1disconnecthandler);

      peer1.emit("peer_lost");
      waiting.push(peer1);
      peer1.emit("queued");
      check_connect();
    };

    peer1.on("disconnect", peer1disconnecthandler);
    peer2.on("disconnect", peer2disconnecthandler);

    waiting = [];
  }
};

sockserv.on("connection", (socket) => {
  console.log(`[${socket.id}] got connection!`);

  socket.on("identify", (id) => {
    if (connected.some((it) => it.myid === id)) {
      console.log(`[${socket.id}] tried to identify as ${id} (already online)`);
      socket.emit("already_online");
      socket.disconnect();
      return;
    }

    console.log(`[${socket.id}] identified as ${id}`);
    socket.myid = id;
    connected.push(socket);

    waiting.push(socket);
    socket.emit("queued");
    check_connect();

    socket.on("disconnect", () => {
      connected = connected.filter((it) => it.id !== socket.id);
      waiting = waiting.filter((it) => it.id !== socket.id);
      console.log(`[${socket.id}] disconnected`);
    });
  });

  /*
  if (waiting.length === 0) {
    console.log(`[${socket.id}] no one waiting, so let this socket wait`);

    waiting.push(socket);
    socket.on(
      "disconnect",
      () => (waiting = waiting.filter((it) => it !== socket))
    );
  } else {
    console.log(`[${socket.id}] someone waiting, let's connect them`);

    const peer = waiting.pop();

    socket.on("message", (e) => {
      peer.emit("message", e);
    });
    peer.on("message", (e) => {
      socket.emit("message", e);
    });

    socket.emit("found_peer");
    peer.emit("found_peer");

    socket.on("disconnect", () => peer.emit("peer_lost"));
    peer.on("disconnect", () => socket.emit("peer_lost"));
  }
  */
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const port = 3001;
httpServer.listen(port);
console.log(`Example app listening on port ${port}`);
