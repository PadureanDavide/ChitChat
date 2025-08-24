document.addEventListener("DOMContentLoaded", () => {
  let currentChatId = null;
  let currentUserEmail = null;

  let unreadMessElement = null;

  const chatList = document.getElementById("chats");
  const searchInput = document.getElementById("create-chat-input");
  const searchChat = document.getElementById("search-chat-input");
  const searchResults = document.getElementById("search-results");
  const createChatForm = document.getElementById("create-chat-form");
  const messageForm = document.getElementById("message-form");
  const messageInput = document.getElementById("message-input");

  const socket = io();

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

  //load all the personal chats
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

      //create name element
      const nameElement = document.createElement("div");
      nameElement.className = "chat-name";
      nameElement.textContent = chat.nameEmail?.name || "Chat senza nome";

      //create detail element (email)
      const detailsElement = document.createElement("div");
      detailsElement.className = "chat-details";
      //if the value email do not exist, then this space will be empty
      detailsElement.textContent = chat.nameEmail?.email || "";

      li.appendChild(nameElement);
      li.appendChild(detailsElement);

      //create element for unread messages
      const returnUser = chat.members.find(
        (user) => user.name === currentUserEmail
      );

      //check if the result is empty and if are any messages unread
      if (returnUser && returnUser.numUnreadMessages !== 0) {
        unreadMessElement = document.createElement("div");
        unreadMessElement.className = "unread-count";
        unreadMessElement.textContent = returnUser.numUnreadMessages;
        li.appendChild(unreadMessElement);
      }

      //add a eventlistener for every chat loaded
      li.addEventListener("click", async (e) => {
        document.querySelectorAll(".chat-list li").forEach((item) => {
          item.classList.remove("selected");
        });

        //load first the chat, and the currentChatId will be setted in the function called
        loadMessages(chat._id);

        //remove the unread-count if it exists
        unreadMessElement = document.querySelector(".unread-count");
        if (unreadMessElement) {
          unreadMessElement.remove();
          await axios.patch(`/chat/removeUnreadMess/${currentChatId}`);
        }
        li.classList.add("selected");
      });

      chatList.appendChild(li);
    });
  };

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

  // Function to scroll to the bottom of the messages container
  const scrollToBottom = () => {
    const messagesContainer = document.getElementById("messages");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  //function called when a chat is cliked, so all the messages for that chat will be displayed
  const loadMessages = async (chatId) => {
    currentChatId = chatId;

    //to connect to the communication channel
    socket.emit("joinChat", chatId);

    //get all the messages
    const {
      data: { messages },
    } = await axios.get(`/chat/messages/${chatId}`);

    const messagesContainer = document.getElementById("messages");
    messagesContainer.innerHTML = "";

    //display every message
    messages.forEach(({ message, createdBy }) => {
      const messageContainer = document.createElement("div");
      messageContainer.className =
        createdBy === currentUserEmail ? "message-right" : "message-left";
      messageContainer.textContent = message;
      messagesContainer.appendChild(messageContainer);
    });

    if (messageForm.classList.contains("hide-form-sender"))
      messageForm.classList.remove("hide-form-sender");

    //to position the view on the last message of the chat
    scrollToBottom();
  };

  // Receive messages
  socket.on("receiveMessage", async (data) => {
    if (data.currentChatId === currentChatId) {
      const { message, createdBy } = data;
      const messageContainer = document.createElement("div");
      messageContainer.className =
        createdBy === currentUserEmail ? "message-right" : "message-left";
      messageContainer.textContent = message;
      document.getElementById("messages").appendChild(messageContainer);

      scrollToBottom();

      //to increment the unread messages for every one in the chat except the emitter
      await axios.patch(`/chat/unreadCont/${data.currentChatId}`);
    } else {
      //ONLY IF THE USER IS ONLINE
      // Increment unread message count for the chat
      const chatItem = document.querySelector(
        `li.chat-item[data-chat-id="${data.currentChatId}"]`
      );

      if (chatItem) {
        let unreadCount = chatItem.querySelector(".unread-count");

        if (!unreadCount) {
          unreadCount = document.createElement("span");
          unreadCount.className = "unread-count";
          unreadCount.textContent = "1";

          // Aggiungi il numerino accanto al nome della chat
          chatItem.appendChild(unreadCount);
        } else {
          // Incrementa il contatore esistente
          unreadCount.textContent = parseInt(unreadCount.textContent) + 1;
        }
      }

      // to move up the chat that got a increment in the unread message counter
      const chatList = document.getElementById("chats");
      if (chatList && chatItem.parentNode === chatList) {
        chatList.insertBefore(chatItem, chatList.firstChild);
      }
    }
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
