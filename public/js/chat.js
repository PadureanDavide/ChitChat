document.addEventListener("DOMContentLoaded", () => {
  const chatList = document.getElementById("chats");
  const searchInput = document.getElementById("create-chat-input");
  const searchResults = document.getElementById("search-results");
  const createChatForm = document.getElementById("create-chat-form");

  // Funzione per cercare utenti
  const searchUsers = async (query) => {
    try {
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
    } catch (error) {
      console.error("Errore nella ricerca degli utenti:", error);
      searchResults.style.display = "none";
    }
  };

  // load all the personal chats
  const loadChats = async () => {
    try {
      const {
        data: { chatsCompleted },
      } = await axios.get("/chat/getChats");

      chatList.innerHTML = "";
      chatsCompleted.forEach((chat) => {
        const li = document.createElement("li");
        li.className = "chat-item";
        li.dataset.chatId = chat.withid; // Aggiunto per identificare la chat

        const nameElement = document.createElement("div");
        nameElement.className = "chat-name";
        nameElement.textContent = chat.nameEmail.name || "Chat senza nome";

        // Aggiungi altri dettagli se disponibili (es. ultimo messaggio o partecipanti)
        const detailsElement = document.createElement("div");
        detailsElement.className = "chat-details";

        if (chat.lastMessage) {
          detailsElement.textContent = `Ultimo messaggio: ${chat.lastMessage}`;
        } else if (chat.participants) {
          detailsElement.textContent = `${chat.participants.length} partecipanti`;
        } else {
          detailsElement.textContent = chat.nameEmail.email;
        }

        li.appendChild(nameElement);
        li.appendChild(detailsElement);

        // Aggiungi eventuale gestione del click
        li.addEventListener("click", () => {
          // Seleziona la chat e carica i messaggi
          document.querySelectorAll(".chat-list li").forEach((item) => {
            item.classList.remove("selected");
          });
          li.classList.add("selected");
          loadMessages(chat._id);
        });

        chatList.appendChild(li);
      });
    } catch (error) {
      console.error("Errore nel caricamento delle chat:", error);
    }
  };

  // Funzione per caricare i messaggi di una chat specifica
  const loadMessages = async (chatId) => {
    try {
      const {
        data: { messages },
      } = await axios.get(`/chat/messages/${chatId}`);

      const messageList = document.getElementById("messages");
      messageList.innerHTML = "";

      messages.forEach((message) => {
        const li = document.createElement("li");
        li.textContent = message.content;
        messageList.appendChild(li);
      });
    } catch (error) {
      console.error("Errore nel caricamento dei messaggi:", error);
    }
  };

  // Funzione per inviare un messaggio
  const sendMessage = async (chatId, content) => {
    try {
      const response = await axios.post(`/chat/messages/${chatId}`, {
        content,
      });
      if (response.status === 200) {
        loadMessages(chatId); // Ricarica i messaggi dopo l'invio
      }
    } catch (error) {
      console.error("Errore nell'invio del messaggio:", error);
    }
  };

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
      console.log("dentro");
      loadChats();
    } else {
      console.log(success);
    }
  });

  //---------------------------------------------------------
  loadChats();
});
