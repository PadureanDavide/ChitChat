document.addEventListener("DOMContentLoaded", () => {
  // Socket.IO client setup
  const socket = io();
  let currentChatId = null;
  const chatList = document.getElementById("chats");
  const searchInput = document.getElementById("create-chat-input");
  const searchChat = document.getElementById("search-chat-input");
  const searchResults = document.getElementById("search-results");
  const createChatForm = document.getElementById("create-chat-form");

  // Funzione per cercare utenti
  const searchUsers = async (query) => {
    const {
      data: { users },
    } = await axios.get(`/chat/searchUsers?email=${query}`);

    searchResults.innerHTML = "";

    if (users.length > 0) {
      users.forEach((user) => {
        const resultItem = document.createElement("div");
        resultItem.className = "user-result";

        const nameElement = document.createElement("div");
        nameElement.className = "user-name";
        nameElement.textContent = user.name || "Nome non disponibile";

        const emailElement = document.createElement("div");
        emailElement.className = "user-email";
        emailElement.textContent = user.email;

        resultItem.appendChild(nameElement);
        resultItem.appendChild(emailElement);

        resultItem.addEventListener("click", () => {
          searchInput.value = user.email;
          searchResults.style.display = "none";
        });

        searchResults.appendChild(resultItem);
      });
      searchResults.style.display = "block";
    } else {
      searchResults.style.display = "none";
    }
  };

  // load all the personal chats
  const loadChats = async (num, val) => {
    if (num === 0) {
      var {
        data: { chatsCompleted },
      } = await axios.get("/chat/getChats");
    } else {
      var {
        data: { chatsCompleted },
      } = await axios.get(`/chat/searchChats?chat=${val}`);
    }

    chatList.innerHTML = "";
    chatsCompleted.forEach((chat) => {
      const li = document.createElement("li");
      li.className = "chat-item";
      li.dataset.chatId = chat._id; // Usa sempre _id

      const nameElement = document.createElement("div");
      nameElement.className = "chat-name";
      nameElement.textContent = chat.nameEmail?.name || "Chat senza nome";

      // Aggiungi altri dettagli se disponibili (es. ultimo messaggio o partecipanti)
      const detailsElement = document.createElement("div");
      detailsElement.className = "chat-details";

      if (chat.lastMessage) {
        detailsElement.textContent = `Ultimo messaggio: ${chat.lastMessage}`;
      } else if (chat.participants) {
        detailsElement.textContent = `${chat.participants.length} partecipanti`;
      } else {
        detailsElement.textContent = chat.nameEmail?.email || "";
      }

      li.appendChild(nameElement);
      li.appendChild(detailsElement);

      // LISTENER to click on a chat
      li.addEventListener("click", () => {
        document.querySelectorAll(".chat-list li").forEach((item) => {
          item.classList.remove("selected");
        });
        li.classList.add("selected");
        loadMessages(chat._id);
      });

      chatList.appendChild(li);
    });
  };

  // Funzione per caricare i messaggi di una chat specifica
  const loadMessages = async (chatId) => {
    currentChatId = chatId;
    socket.emit("joinChat", chatId);
    const {
      data: { messages },
    } = await axios.get(`/chat/messages?chat=${chatId}`);
    const messageList = document.getElementById("messages");
    messageList.innerHTML = "";
    messages.forEach((message) => {
      const li = document.createElement("li");
      li.textContent = message.content;
      messageList.appendChild(li);
    });
  };

  // Funzione per inviare un messaggio (real-time + salvataggio DB)
  const sendMessage = async (chatId, content) => {
    // Recupera l'utente loggato (puoi migliorare con JWT/cookie)
    let sender = window.currentUserEmail;
    if (!sender) {
      // fallback: prova a ricavare da un meta tag o altro
      const meta = document.querySelector('meta[name="user-email"]');
      sender = meta ? meta.content : "anonimo";
    }
    socket.emit("sendMessage", { chatId, sender, content });
    // Mostra subito il messaggio nella lista
    const messageList = document.getElementById("messages");
    const li = document.createElement("li");
    li.textContent = content;
    messageList.appendChild(li);
    messageList.scrollTop = messageList.scrollHeight;

    await axios.post("/chat/messages", {
      message: content,
    });
  };

  // Ricezione messaggi in tempo reale
  socket.on("newMessage", (message) => {
    console.log(message);
    if (message.chat === currentChatId) {
      const messageList = document.getElementById("messages");
      const li = document.createElement("li");
      li.textContent = message.content;
      messageList.appendChild(li);
      messageList.scrollTop = messageList.scrollHeight;
    }
  });

  //---------------------------------------------------------------------------------------------
  // LISTENER inputs for searching users
  searchInput.addEventListener("input", (event) => {
    const query = event.target.value.trim();
    if (query.length > 1) {
      searchUsers(query);
    } else {
      searchResults.style.display = "none";
    }
  });

  // LISTENER to create a new chat
  createChatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = searchInput.value;

    const {
      data: { success },
    } = await axios.post("/chat/createChat", {
      emailOther: email,
    });

    if (success) {
      searchInput.value = "";
      searchResults.style.display = "none";
      loadChats(0, "");
    } else {
    }
  });

  //LISTENER to search a chat
  searchChat.addEventListener("input", async (event) => {
    const query = event.target.value.trim();
    if (query !== "") loadChats(1, query);
    else loadChats(0, "");
  });

  // Invio messaggio dal form
  const messageForm = document.getElementById("message-form");
  const messageInput = document.getElementById("message-input");
  if (messageForm && messageInput) {
    messageForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (currentChatId && messageInput.value.trim()) {
        sendMessage(currentChatId, messageInput.value.trim());
        messageInput.value = "";
      }
    });
  }

  //---------------------------------------------------------
  loadChats(0, "");
});
