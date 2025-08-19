document.addEventListener("DOMContentLoaded", () => {
  let currentChatId = null;
  let currentUserEmail = null;

  const chatList = document.getElementById("chats");
  const searchInput = document.getElementById("create-chat-input");
  const searchChat = document.getElementById("search-chat-input");
  const searchResults = document.getElementById("search-results");
  const createChatForm = document.getElementById("create-chat-form");

  // Fetch the current user's email via Axios
  const fetchUserEmail = async () => {
    const {
      data: { email },
    } = await axios.get("/getEmail");
    currentUserEmail = email;
  };

  // Call fetchUserEmail on page load
  fetchUserEmail();

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

  // Carica tutte le chat personali
  const loadChats = async (num, val) => {
    let chatsCompleted;
    if (num === 0) {
      const response = await axios.get("/chat/getChats");
      chatsCompleted = response.data.chatsCompleted;
    } else {
      const response = await axios.get(`/chat/searchChats?chat=${val}`);
      chatsCompleted = response.data.chatsCompleted;
    }

    chatList.innerHTML = "";
    chatsCompleted.forEach((chat) => {
      const li = document.createElement("li");
      li.className = "chat-item";
      li.dataset.chatId = chat._id;

      const nameElement = document.createElement("div");
      nameElement.className = "chat-name";
      nameElement.textContent = chat.nameEmail?.name || "Chat senza nome";

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

  const socket = io();

  // Send a message
  const sendMessage = async (message) => {
    // Save message to the database
    await axios.post("/chat/messages", { message, currentChatId });

    // Emit the message to the server
    socket.emit("sendMessage", {
      message,
      currentChatId,
      createdBy: currentUserEmail,
    });
  };

  // Funzione unificata per caricare i messaggi
  const loadMessages = async (chatId) => {
    currentChatId = chatId;
    socket.emit("joinChat", chatId);

    const {
      data: { messages },
    } = await axios.get(`/chat/messages/${chatId}`);

    const messagesContainer = document.getElementById("messages");
    messagesContainer.innerHTML = "";

    messages.forEach(({ message, createdBy }) => {
      const messageContainer = document.createElement("div");
      messageContainer.className =
        createdBy === currentUserEmail ? "message-right" : "message-left";
      messageContainer.textContent = message;
      messagesContainer.appendChild(messageContainer);
    });
  };

  // Receive messages
  socket.on("receiveMessage", (data) => {
    const { message, createdBy } = data;
    const messageContainer = document.createElement("div");
    messageContainer.className =
      createdBy === currentUserEmail ? "message-right" : "message-left";
    messageContainer.textContent = message;
    document.getElementById("messages").appendChild(messageContainer);
  });

  // Listener per cercare utenti
  searchInput.addEventListener("input", (event) => {
    const query = event.target.value.trim();
    if (query.length > 1) {
      searchUsers(query);
    } else {
      searchResults.style.display = "none";
    }
  });

  // Listener per creare una nuova chat
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
    }
  });

  // Listener per cercare una chat
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
        sendMessage(messageInput.value.trim());
        messageInput.value = "";
      }
    });
  }

  // Carica le chat all'avvio
  loadChats(0, "");
});
