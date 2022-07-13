if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service_worker.js");
}

const socket = io();

const id = document.getElementById.bind(document);
const activate = (view) => view.classList.add("active");
const deactivate = (view) => view.classList.remove("active");
const isActive = (view) => view.classList.contains("active");

const viewStart = id("view-start");
const viewStartSearch = id("view-start-search");

const viewSearching = id("view-searching");
const viewSearchingCancel = id("view-searching-cancel");

const viewChat = id("view-chat");
const viewChatLeave = id("view-chat-leave");
const viewChatLog = id("view-chat-log");
const viewChatForm = id("view-chat-form");
const viewChatInput = id("view-chat-input");

const viewPeerLeft = id("view-peer-left");
const viewPeerLeftOK = id("view-peer-left-ok");

viewStartSearch.addEventListener("click", () => {
  deactivate(viewStart);
  activate(viewSearching);

  socket.emit("request_peer");
});

viewSearchingCancel.addEventListener("click", () => {
  deactivate(viewSearching);
  activate(viewStart);

  socket.emit("leave_peer");
});

socket.on("found_peer", () => {
  if (isActive(viewSearching)) {
    deactivate(viewSearching);
    activate(viewChat);
  } else {
    socket.emit("leave_peer");
  }
});

const SENDER = Object.freeze({
  YOU: 0,
  SOMEONE: 1,
});

const message = (sender, content) => {
  const scroll =
    viewChat.offsetHeight + viewChat.scrollTop >= viewChat.scrollHeight;

  const div = document.createElement("div");
  div.className = "message";

  const span = document.createElement("span");
  span.className = "sender";
  span.appendChild(
    document.createTextNode(`[${sender === SENDER.YOU ? "Du" : "Jemand"}]`)
  );
  div.appendChild(span);

  div.appendChild(document.createTextNode(" "));

  const span2 = document.createElement("span");
  span2.className = "content";
  span2.appendChild(document.createTextNode(content));
  div.appendChild(span2);

  viewChatLog.appendChild(div);

  if (scroll) {
    viewChat.scrollTo({
      top: viewChat.scrollHeight,
      behavior: "instant",
    });
  }
};

viewChatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const content = viewChatInput.value;
  socket.emit("message", content);
  message(SENDER.YOU, content);
  viewChatForm.reset();
});

socket.on("message", (content) => {
  if (isActive(viewChat)) {
    message(SENDER.SOMEONE, content);
  }
});

const viewChatReset = () => (viewChatLog.innerHTML = "");

viewChatLeave.addEventListener("click", () => {
  socket.emit("leave_peer");

  deactivate(viewChat);
  activate(viewStart);
  viewChatReset();
});

socket.on("peer_left", () => {
  if (isActive(viewChat)) {
    deactivate(viewChat);
    activate(viewPeerLeft);
    viewChatReset();
  }
});

viewPeerLeftOK.addEventListener("click", () => {
  deactivate(viewPeerLeft);
  activate(viewStart);
});
