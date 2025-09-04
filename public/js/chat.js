document.addEventListener("DOMContentLoaded", () => {
  let currentChatId = null;
  let currentUserEmail = null;

  let unreadMessElement = null;

  //instead of an array, we use Set, because we can store only elements that have differences amongs them
  //and it has also the delete AND has functions
  let selectedUsers = new Set();

  const popUp = document.querySelector(".popUpNewChat");
  const popUpGroupSettings = document.querySelector(".popUpSettings");
  let usersList = document.querySelector(".users-list");
  const openPopUp = document.querySelector("#plusButton");
  const closePopUp = document.querySelectorAll(".popup-close");
  const createButton = document.querySelector(".create-btn");
  const addUsersToGroupButton = document.querySelector(".addUsers-btn");

  let userItemTarget = null;
  const groupSettings = document.getElementById("groupSettings");

  const chatList = document.getElementById("chats");
  const searchInput = document.getElementById("create-chat-input");
  const searchChat = document.getElementById("search-chat-input");
  const searchResults = document.getElementById("search-results");
  const createChatForm = document.getElementById("create-chat-form");
  const messageForm = document.getElementById("message-form");
  const messageInput = document.getElementById("message-input");

  const socket = io();

  //-----------------------------------------------------------
  //update the local array and the UI

  //-----------------------------------------------------------
  //set the impossible button based on how many elements the selectedUsers has
  const changeImpossibleButton = (typeButton) => {
    if (typeButton) {
      if (selectedUsers.size !== 0) {
        if (createButton.classList.contains("impossible-create-btn"))
          createButton.classList.remove("impossible-create-btn");
      } else {
        if (!createButton.classList.contains("impossible-create-btn"))
          createButton.classList.add("impossible-create-btn");
      }
    } else {
      if (selectedUsers.size !== 0) {
        if (addUsersToGroupButton.classList.contains("impossible-create-btn"))
          addUsersToGroupButton.classList.remove("impossible-create-btn");
      } else {
        if (!addUsersToGroupButton.classList.contains("impossible-create-btn"))
          addUsersToGroupButton.classList.add("impossible-create-btn");
      }
    }
  };

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
      li.id = chat._id;

      if (chat.isGroup) {
        const avatar = createAvatarGroup();

        //create name element
        const nameElement = document.createElement("div");
        nameElement.className = "chat-name";
        nameElement.textContent = chat.nameChat || "Chat senza nome";

        li.appendChild(avatar);
        li.appendChild(nameElement);
      } else {
        const avatar = createAvatarSingle();

        const containerNameEmail = document.createElement("div");

        //create name element
        const nameElement = document.createElement("div");
        nameElement.className = "chat-name";
        nameElement.textContent = chat.nameEmail?.name || "Chat senza nome";

        //create detail element (email)
        const detailsElement = document.createElement("div");
        detailsElement.className = "chat-details";
        //if the value email do not exist, then this space will be empty
        detailsElement.textContent = chat.nameEmail?.email || "";

        containerNameEmail.append(nameElement);
        containerNameEmail.append(detailsElement);

        li.appendChild(avatar);
        li.appendChild(containerNameEmail);
      }

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
        handleChatSelection(chat._id, li);
      });

      chatList.appendChild(li);
    });
  };

  //handle the change of the selected chat
  const handleChatSelection = async (id, liElement) => {
    document.querySelectorAll(".chat-list li").forEach((item) => {
      item.classList.remove("selected");
    });

    if (liElement) {
      unreadMessElement = liElement.querySelector(".unread-count");
      if (unreadMessElement) {
        unreadMessElement.remove();
        await axios.patch(`/chat/removeUnreadMess/${liElement.id}`);
      }

      const checkIfPopUpOpen = document.querySelector(".openPopUp");
      if (checkIfPopUpOpen) checkIfPopUpOpen.classList.remove("openPopUp");

      loadMessages(id);
    }

    liElement.classList.add("selected");
  };

  // Send a message
  const sendMessage = async (message) => {
    // Save message to the database
    const {
      data: { typeChat },
    } = await axios.post("/chat/messages", {
      message,
      currentChatId,
    });

    // Emit the message to the server
    socket.emit("sendMessage", {
      message,
      currentChatId,
      createdBy: currentUserEmail,
      typeOfChat: typeChat,
    });
  };

  // Function to scroll to the bottom of the messages container
  const scrollToBottom = () => {
    const messagesContainer = document.getElementById("messages");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  //create avatar to show a single person
  const createAvatarSingle = () => {
    // Aggiungi l'avatar utente
    const avatarSpan = document.createElement("span");
    avatarSpan.className = "user-avatar";
    avatarSpan.innerHTML = '<i class="fas fa-user"></i>';
    return avatarSpan;
  };

  //create avatar to show a group of people
  const createAvatarGroup = () => {
    // Aggiungi l'avatar utente
    const avatarSpan = document.createElement("span");
    avatarSpan.className = "user-avatar";
    avatarSpan.innerHTML = '<i class="fa-solid fa-users"></i>';
    return avatarSpan;
  };

  //function called when a chat is cliked, so all the messages for that chat will be displayed
  const loadMessages = async (chatId) => {
    currentChatId = chatId;

    //to connect to the communication channel
    socket.emit("joinChat", chatId);

    //get all the messages
    const {
      data: { messages, isGroup },
    } = await axios.get(`/chat/messages/${chatId}`);

    const messagesContainer = document.getElementById("messages");
    messagesContainer.innerHTML = "";
    var avatarSpan = null;
    var messageCreator = null;

    if (
      (isGroup && groupSettings.classList.contains("hideSettings")) ||
      isGroup
    ) {
      groupSettings.classList.remove("hideSettings");
    } else {
      groupSettings.classList.add("hideSettings");
    }

    //display every message
    messages.forEach(({ message, createdBy }, index) => {
      const messageContainer = document.createElement("div");

      // Crea il contenitore per il testo del messaggio
      const messageText = document.createElement("span");
      messageText.className = "contEmailMess";

      // Crea il testo del messaggio
      const messageContent = document.createElement("span");
      messageContent.className = "message-text";
      messageContent.textContent = message;

      if (isGroup) {
        var currentMessage = messages[index];
        var previusMessage = messages[index - 1];
        var nextMessage = messages[index + 1];

        avatarSpan = createAvatarSingle();
        messageContainer.appendChild(avatarSpan);

        //add the email of the message creator
        if (
          !previusMessage ||
          previusMessage.createdBy !== currentMessage.createdBy
        ) {
          // Crea il creatore del messaggio
          messageCreator = document.createElement("div");
          messageCreator.textContent = createdBy;
          messageCreator.className = "creatorName";
          messageText.appendChild(messageCreator);
        }

        if (nextMessage && currentMessage.createdBy === nextMessage.createdBy) {
          avatarSpan.classList.add("avatar-hide");
        }

        messageContainer.id = createdBy;
      }

      // Aggiungi tutto al contenitore del messaggio
      messageText.appendChild(messageContent);

      // Aggiungi tutto al contenitore principale del messaggio
      messageContainer.appendChild(messageText);

      // Applica la classe in base all'utente
      if (createdBy === currentUserEmail) {
        messageContainer.className = "singleMessage message-right";
      } else {
        messageContainer.className = "singleMessage message-left";
      }

      // Aggiungi il messaggio al contenitore
      messagesContainer.appendChild(messageContainer);
    });

    if (messageForm.classList.contains("hide-form-sender"))
      messageForm.classList.remove("hide-form-sender");

    //to position the view on the last message of the chat
    scrollToBottom();
  };

  //to move up the chat
  const moveUpChat = (chatItem) => {
    const chatList = document.getElementById("chats");
    if (chatList && chatItem) {
      chatList.insertBefore(chatItem, chatList.firstChild);
    }
  };

  //dispay all the users available
  const displayUsers = (users, type) => {
    if (type) usersList = popUpGroupSettings.querySelector(".users-list");
    else usersList = document.querySelector(".users-list");

    usersList.innerHTML = "";

    //display all the users
    users.forEach((user) => {
      // Crea l'elemento principale
      const userItem = document.createElement("div");
      userItem.className = "user-item";

      // Crea il checkbox
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "user-checkbox";

      // Crea il label
      const label = document.createElement("label");
      label.htmlFor = `${user.email}`;

      // Crea l'avatar
      const avatar = document.createElement("span");
      avatar.className = "user-avatar";
      avatar.innerHTML = '<i class="fas fa-user"></i>';

      // Crea il container delle info
      const userInfo = document.createElement("span");
      userInfo.className = "user-info";

      // Crea il nome utente
      const userName = document.createElement("span");
      userName.className = "user-name";
      userName.textContent = user.name || "Nome non disponibile";

      // Crea l'email utente
      const userEmail = document.createElement("span");
      userEmail.className = "user-email";
      userEmail.textContent = user.email;

      // Assembla le info
      userInfo.appendChild(userName);
      userInfo.appendChild(userEmail);

      // Assembla il label
      label.appendChild(avatar);
      label.appendChild(userInfo);

      // Crea l'icona aggiungi
      const addIcon = document.createElement("span");

      if (type) {
        if (user.isAlreadyInGroup) {
          checkbox.checked = true;
          checkbox.disabled = true;
          addIcon.className = "user-add-icon ";
          addIcon.id = "removeUser";
          addIcon.innerHTML = '<i class="fa-solid fa-trash"></i>';
        }
        userItem.id = "settingsChat";
      } else {
        addIcon.className = "user-add-icon";
        addIcon.id = "addUser";
        addIcon.innerHTML = '<i class="fas fa-plus-circle"></i>';

        userItem.id = "createChat";
      }

      // Assembla tutto nell'elemento principale
      userItem.appendChild(checkbox);
      userItem.appendChild(label);
      userItem.appendChild(addIcon);
      usersList.appendChild(userItem);

      const updateSelection = (typeButton) => {
        if (checkbox.checked) {
          checkbox.checked = true;
          selectedUsers.add(user.email);
        } else {
          checkbox.checked = false;
          selectedUsers.delete(user.email);
        }

        if (typeButton === "createChat") changeImpossibleButton(true);
        else changeImpossibleButton(false);
      };

      //------------------------------------------------------
      addIcon.addEventListener("click", async (event) => {
        if (event.target.closest(".user-add-icon").id === "addUser") {
          popUp.classList.remove("openPopUp");
          console.log(user.email);

          const {
            data: { success, exists, _id },
          } = await axios.post("/chat/createChat", {
            emailOther: user.email,
            isGroup: false,
          });

          if (success) {
            //to clear what was left in it
            searchInput.value = "";

            selectedUsers.clear(); //delete all the elements
            changeImpossibleButton(true); //to restore the impoossible button

            //only if the chat wasn't already created
            if (!exists) await loadChats(0, "");

            //change the chat selected
            handleChatSelection(_id, document.getElementById(_id));

            //remove unread messages
            if (unreadMessElement) {
              unreadMessElement.remove();
              await axios.patch(`/chat/removeUnreadMess/${currentChatId}`);
            }
          }
        } else {
          checkbox.checked = false;
          checkbox.disabled = false;

          await axios.patch(`/chat/removeUser/${currentChatId}/${user.email}`);

          // Emit the message to the server
          socket.emit("sendMessage", {
            message: `${user.email} has been kiked off the group by ${currentUserEmail}`,
            messageCommon: true,
          });
        }

        event.stopPropagation();
      });

      //------------------------------------------------------
      checkbox.addEventListener("click", (event) => {
        userItemTarget = event.target.closest(".user-item");
        updateSelection(userItemTarget.id);
        event.stopPropagation();
      });

      userItem.addEventListener("click", (event) => {
        userItemTarget = event.target.closest(".user-item");
        if (!userItemTarget.querySelector(".user-checkbox").disabled) {
          // Evita doppia esecuzione per checkbox e addIcon
          if (event.target === checkbox) {
            return;
          }

          if (userItemTarget.querySelector("#removeUser")) {
            userItemTarget.querySelector(".user-checkbox").disabled = false;
            userItemTarget.querySelector(".user-checkbox").checked = true;

            userItemTarget.querySelector("#removeUser").remove();
          }
          // need to invert manually because you click on the div and not directly on the checkbox
          checkbox.checked = !checkbox.checked;
          updateSelection(userItemTarget.id);
        }
      });
    });
  };

  // Receive messages
  socket.on("receiveMessage", async (data) => {
    const chatItem = document.querySelector(
      `li.chat-item[id="${data.currentChatId}"]`
    );

    //common elements
    const messageContainer = document.createElement("div");
    const messageText = document.createElement("div");
    messageText.className = "contEmailMess";

    const messageContent = document.createElement("span");
    messageContent.textContent = data.message;
    messageContent.className = "message-text";

    if (data.messageCommon) {
      messageContainer.className = "message-center";
    } else {
      if (data.currentChatId === currentChatId) {
        const { createdBy, typeOfChat } = data;

        //first position the message right or left based on who send it
        if (createdBy === currentUserEmail) {
          await axios.patch(`/chat/unreadCont/${data.currentChatId}`);
          messageContainer.className = "singleMessage message-right";
        } else {
          await axios.patch(`/chat/removeUnreadMess/${data.currentChatId}`);
          messageContainer.className = "singleMessage message-left";
        }
        messageContainer.id = createdBy;

        //if it is a group chat
        if (typeOfChat) {
          //get the last meessage sent
          var supp = document.querySelectorAll(".singleMessage");
          supp = supp[supp.length - 1];

          if (!supp || supp.id !== createdBy) {
            messageCreator = document.createElement("div");
            messageCreator.textContent = createdBy;
            messageCreator.className = "creatorName";
            messageText.appendChild(messageCreator);
          } else {
            supp = supp.querySelector(".user-avatar");
            supp.classList.add("avatar-hide");
          }

          const avatarSpan = createAvatarSingle();
          messageContainer.appendChild(avatarSpan);
        }

        messageText.appendChild(messageContent);
        messageContainer.append(messageText);

        document.getElementById("messages").appendChild(messageContainer);

        scrollToBottom();
      } else {
        //ONLY IF THE USER IS ONLINE BUT HAS ANOTHER CHAT OPEN
        // Increment unread message count for the chat

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
      }
    }

    // to move up the chat that got a increment in the unread message counter
    moveUpChat(chatItem);
  });

  //---------------------------------------------------------------------------------------------------------------------

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

  // Listener per creare una nuova chat
  createChatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nameGroup = searchInput.value;

    selectedUsers.add(currentUserEmail);

    const {
      data: { success, _id },
    } = await axios.post("/chat/createChat", {
      name: nameGroup,
      isGroup: true,
      membersToAdd: Array.from(selectedUsers),
    });

    if (success) {
      popUp.classList.remove("openPopUp");
      selectedUsers.clear(); //delete all the elements
      changeImpossibleButton(true); //to restore the impoossible button

      //load the chats
      await loadChats(0, "");

      //change the chat selected
      handleChatSelection(_id, document.getElementById(_id));
    }
  });

  addUsersToGroupButton.addEventListener("click", (event) => {
    selectedUsers.clear(); //delete all the elements
    changeImpossibleButton(false); //to restore the impoossible button
    popUp.classList.remove("openPopUp");

    await axios.patch("/chat/addUsersToGroup/:");
  });

  //event listener to open the pop up
  openPopUp.addEventListener("click", async (e) => {
    popUp.classList.add("openPopUp");

    //get all users
    const {
      data: { users },
    } = await axios.get("/getAllUsers");

    displayUsers(users, false);
  });

  //event listener to close the popup

  closePopUp.forEach((pop) => {
    pop.addEventListener("click", (e) => {
      //close the popup open
      document.querySelector(".openPopUp").classList.remove("openPopUp");
      selectedUsers.clear(); //delete all the elements
      changeImpossibleButton(true); //to restore the impoossible button
      changeImpossibleButton(false); //to restore the impoossible button
    });
  });

  //group settings
  groupSettings.addEventListener("click", async (e) => {
    popUpGroupSettings.classList.add("openPopUp");

    //get all users
    const {
      data: { users },
    } = await axios.get(`/getAllUsersGroup/${currentChatId}`);

    displayUsers(users, true);
  });

  // load the chats at every refresh page
  loadChats(0, "");
});
