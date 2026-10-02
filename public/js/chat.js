document.addEventListener("DOMContentLoaded", async function async() {
  // Unread messages element
  let unreadMessElement = null;

  // Variables for current chat state
  let currentChatId = null;
  let currentUserId = null;
  let chatIsGroup = null;
  let messageLoadSequence = 0;

  // User selection management
  let selectedUsers = new Set();

  // DOM Elements
  let popUp = document.querySelector(".popUpNewChat");
  let popUpGroupSettings = document.querySelector(".popUpSettings");
  let usersList = document.querySelector(".users-list");
  let openPopUp = document.querySelector("#plusButton");
  let createButton = document.querySelector(".create-btn");
  let addUsersToGroupButton = document.querySelector(".addUsers-btn");

  // Chat interface elements
  let messagesContainer = document.querySelector(".messages-container");
  let messageCreator = null;
  let avatarSpan = null;
  let messageContainer = null;
  let messageText = null;

  // Chat management elements
  let userItemTarget = null;
  let groupSettings = document.getElementById("groupSettings");
  let quitChat = document.getElementById("exitGroup");

  // Chat list and search elements
  let chatList = document.getElementById("chats");
  let searchInput = document.getElementById("create-chat-input");
  let searchChat = document.getElementById("search-chat-input");
  let searchResults = document.getElementById("search-results");
  let createChatForm = document.getElementById("create-chat-form");
  let messageForm = document.getElementById("message-form");
  let messageInput = document.getElementById("message-input");

  const socket = io();

  // Fetch the current user's email via Axios
  const fetchUserIdEmail = async () => {
    const {
      data: { id, email },
    } = await axios.get("/getUserIdEmail");
    currentUserId = id;
    currentUserEmail = email;
  };

  // Call fetchUserId on page load
  await fetchUserIdEmail();

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
        if (addUsersToGroupButton.classList.contains("impossible-create-btn")) {
          addUsersToGroupButton.classList.remove("impossible-create-btn");
        } else addUsersToGroupButton.classList.remove("impossible-create-btn");
      } else {
        if (!addUsersToGroupButton.classList.contains("impossible-create-btn"))
          addUsersToGroupButton.classList.add("impossible-create-btn");
      }
    }
  };

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
        nameElement.textContent = user.name || "Name unavailable";

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
    console.log(chatsCompleted);

    chatList.innerHTML = "";
    chatsCompleted.forEach((chat) => {
      const li = document.createElement("li");

      if (num === 3 && chat._id === currentChatId) {
        li.className = "chat-item selected";
      } else li.className = "chat-item";
      li.id = chat._id;

      if (chat.isGroup) {
        const avatar = createAvatarGroup();

        //create name element
        const nameElement = document.createElement("div");
        nameElement.className = "chat-name";
        nameElement.textContent = chat.nameChat || "Untitled chat";

        li.appendChild(avatar);
        li.appendChild(nameElement);
      } else {
        const avatar = createAvatarSingle();

        const containerNameEmail = document.createElement("div");

        //create name element
        const nameElement = document.createElement("div");
        nameElement.className = "chat-name";
        nameElement.textContent = chat.nameEmail?.name || "Untitled chat";

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
        (user) => user.userId === currentUserId
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
    if (!liElement) return;

    document.querySelectorAll(".chat-list li").forEach((item) => {
      if (item.classList.contains("selected"))
        item.classList.remove("selected");
    });

    const unreadBadge = liElement.querySelector(".unread-count");

    const checkIfPopUpOpen = document.querySelector(".openPopUp");
    if (checkIfPopUpOpen) checkIfPopUpOpen.classList.remove("openPopUp");

    liElement.classList.add("selected");
    await loadMessages(id);

    if (unreadBadge) {
      await axios.patch(`/chat/removeUnreadMess/${liElement.id}`);
      unreadBadge.remove();
    }
  };

  // Send a message
  const sendMessage = async (message, typeMessage) => {
    // Save message to the database
    const {
      data: { emailUser, chatIsGroup },
    } = await axios.post("/chat/messages", {
      message,
      currentChatId,
      typeMessage,
    });

    if (typeMessage) {
      // Emit the message to the server
      socket.emit("sendMessage", {
        message,
        currentChatId,
        createdBy: currentUserId,
        typeOfChat: chatIsGroup,
        currentUserEmail: emailUser,
      });
    } else {
      // Emit the message to the server
      socket.emit("sendMessage", {
        message,
        messageCommon: true,
      });
    }
  };

  // Function to scroll to the bottom of the messages container
  const scrollToBottom = () => {
    messagesContainer = document.getElementById("messages");

    messagesContainer.scrollTo({
      top: messagesContainer.scrollHeight,
      behavior: "smooth",
    });
  };

  //create avatar to show a single person
  const createAvatarSingle = () => {
    // Aggiungi l'avatar utente
    avatarSpan = document.createElement("span");
    avatarSpan.className = "user-avatar";
    avatarSpan.innerHTML = '<i class="fas fa-user"></i>';
    return avatarSpan;
  };

  //create avatar to show a group of people
  const createAvatarGroup = () => {
    // Aggiungi l'avatar utente
    avatarSpan = document.createElement("span");
    avatarSpan.className = "user-avatar";
    avatarSpan.innerHTML = '<i class="fa-solid fa-users"></i>';
    return avatarSpan;
  };

  //function called when a chat is cliked, so all the messages for that chat will be displayed
  const loadMessages = async (chatId) => {
    const loadSequence = ++messageLoadSequence;
    currentChatId = chatId;

    //to connect to the communication channel
    socket.emit("joinChat", chatId);

    //get all the messages
    const {
      data: { messages, isGroup },
    } = await axios.get(`/chat/messages/${chatId}`);

    if (loadSequence !== messageLoadSequence) return;

    chatIsGroup = isGroup;

    messagesContainer = document.getElementById("messages");
    messagesContainer.innerHTML = "";
    avatarSpan = null;
    messageCreator = null;

    // if (
    //   (isGroup && groupSettings.classList.contains("hideSettings")) ||
    //   isGroup
    // ) {
    //   groupSettings.classList.remove("hideSettings");
    // } else {
    //   groupSettings.classList.add("hideSettings");
    // }

    groupSettings.classList.remove("hideSettings");

    //display every message
    messages.forEach(({ message, createdBy, createdByEmail }, index) => {
      messageContainer = document.createElement("div");

      // Crea il contenitore per il testo del messaggio
      messageText = document.createElement("span");
      messageText.className = "contEmailMess";

      // Crea il testo del messaggio
      const messageContent = document.createElement("span");
      messageContent.className = "message-text";
      messageContent.textContent = message;

      // Applica la classe in base all'utente
      if (createdBy === currentUserId) {
        messageContainer.className = "singleMessage message-right";
      } else {
        messageContainer.className = "singleMessage message-left";
      }

      if (isGroup) {
        if (createdBy === "SERVER NOTIFICATION") {
          messageContainer.className = "singleMessage message-center";
        } else {
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
            messageCreator.textContent = createdByEmail;
            messageCreator.className = "creatorName";
            messageText.appendChild(messageCreator);
          }

          if (
            nextMessage &&
            currentMessage.createdBy === nextMessage.createdBy
          ) {
            avatarSpan.classList.add("avatar-hide");
          }

          messageContainer.id = createdBy;
        }
      }

      // Aggiungi tutto al contenitore del messaggio
      messageText.appendChild(messageContent);

      // Aggiungi tutto al contenitore principale del messaggio
      messageContainer.appendChild(messageText);

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
  const displayUsers = (users, type, chatOwner) => {
    if (type) usersList = popUpGroupSettings.querySelector(".users-list");
    else usersList = document.querySelector(".users-list");

    usersList.innerHTML = "";

    //display all the users
    users.forEach((user) => {
      let checkbox = null;

      // Crea l'elemento principale
      const userItem = document.createElement("div");
      userItem.className = "user-item";

      // Crea il label
      const label = document.createElement("label");
      label.htmlFor = `${user._id}`;

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
      userName.textContent = user.name || "Name unavailable";

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

      if (chatOwner) {
        // Crea il checkbox
        checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "user-checkbox";
        userItem.appendChild(checkbox);
      }

      if (type) {
        if (user.isAlreadyInGroup) {
          if (chatOwner) {
            checkbox.checked = true;
            checkbox.disabled = true;
          }

          addIcon.className = "user-add-icon";
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
      userItem.appendChild(label);
      userItem.appendChild(addIcon);
      usersList.appendChild(userItem);

      const updateSelection = (typeButton) => {
        if (checkbox.checked) {
          checkbox.checked = true;
          selectedUsers.add(user._id);
        } else {
          checkbox.checked = false;
          selectedUsers.delete(user._id);
        }

        if (typeButton === "createChat") changeImpossibleButton(true);
        else changeImpossibleButton(false);
      };

      //------------------------------------------------------
      addIcon.addEventListener("click", async (event) => {
        event.stopPropagation();

        userItemTarget = event.target.closest(".user-add-icon");
        if (userItemTarget.id === "addUser") {
          popUp.classList.remove("openPopUp");

          const {
            data: { success, exists, _id, name },
          } = await axios.post("/chat/createChat", {
            otherUserId: user._id,
            isGroup: false,
          });

          if (success) {
            const chatInQuestion = document.getElementById(_id);
            //to clear what was left in it
            searchInput.value = "";

            selectedUsers.clear(); //delete all the elements
            changeImpossibleButton(true); //to restore the impoossible button

            //only if the chat wasn't already created
            if (!exists) await loadChats(0, "");
            else {
              if (!chatInQuestion) {
                let li = document.createElement("li");
                li.className = "chat-item";
                li.id = _id;

                const avatar = createAvatarSingle();

                const containerNameEmail = document.createElement("div");

                //create name element
                const nameElement = document.createElement("div");
                nameElement.className = "chat-name";
                nameElement.textContent = name || "Untitled chat";

                //create detail element (email)
                const detailsElement = document.createElement("div");
                detailsElement.className = "chat-details";
                //if the value email do not exist, then this space will be empty
                detailsElement.textContent = user.email || "";

                containerNameEmail.append(nameElement);
                containerNameEmail.append(detailsElement);

                li.appendChild(avatar);
                li.appendChild(containerNameEmail);
                li.addEventListener("click", () => {
                  handleChatSelection(_id, li);
                });
                chatList.appendChild(li);

                //change the chat selected
                handleChatSelection(_id, li);
              } else handleChatSelection(_id, chatInQuestion);
            }

            //remove unread messages
            if (unreadMessElement) {
              unreadMessElement.remove();
              await axios.patch(`/chat/removeUnreadMess/${currentChatId}`);
            }
          }
        } else {
          checkbox.checked = false;
          checkbox.disabled = false;

          const result = await axios.patch(
            `/chat/removeUser/${currentChatId}/${user._id}`
          );

          userItemTarget.remove();

          sendMessage(
            `${user.email} was removed from the group by ${currentUserEmail}`,
            false
          );
        }
      });

      //------------------------------------------------------
      if (chatOwner) {
        checkbox.addEventListener("click", (event) => {
          event.stopPropagation();
          userItemTarget = event.target.closest(".user-item");
          updateSelection(userItemTarget.id);
        });

        userItem.addEventListener("click", (event) => {
          userItemTarget = event.target.closest(".user-item");
          if (!userItemTarget.querySelector(".user-checkbox").disabled) {
            // Evita doppia esecuzione per checkbox e addIcon
            if (event.target === checkbox) {
              return;
            }

            // need to invert manually because you click on the div and not directly on the checkbox
            userItemTarget.querySelector(".user-checkbox").checked =
              !userItemTarget.querySelector(".user-checkbox").checked;

            updateSelection(userItemTarget.id);
          }
        });
      }
    });
  };

  // Receive messages
  socket.on("receiveMessage", async (data) => {
    const chatItem = document.querySelector(
      `li.chat-item[id="${data.currentChatId}"]`
    );

    //common elements
    messageContainer = document.createElement("div");
    messageText = document.createElement("div");
    messageText.className = "contEmailMess";

    const messageContent = document.createElement("span");
    messageContent.textContent = data.message;
    messageContent.className = "message-text";

    if (data.messageCommon) {
      messageContainer.className = "singleMessage message-center";

      messageText.appendChild(messageContent);
      messageContainer.append(messageText);
      document.getElementById("messages").appendChild(messageContainer);
    } else {
      if (data.currentChatId === currentChatId) {
        const { createdBy, currentUserEmail, typeOfChat } = data;

        //first position the message right or left based on who send it
        if (createdBy === currentUserId) {
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
            messageCreator.textContent = currentUserEmail;
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
    scrollToBottom();

    // to move up the chat that got a increment in the unread message counter
    moveUpChat(chatItem);
  });

  //---------------------------------------------------------------------------------------------------------------------

  // Invio messaggio dal form
  if (messageForm && messageInput) {
    messageForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (currentChatId && messageInput.value.trim()) {
        sendMessage(messageInput.value.trim(), true);
        messageInput.value = "";
      }
    });
  }

  const closePopUpListeners = () => {
    const closeButtons = document.querySelectorAll(".popup-close");
    closeButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        // Rimuovi solo la classe openPopUp dall'elemento corretto
        const popup =
          e.target.closest(".popup-container") ||
          document.querySelector(".openPopUp");
        if (popup) {
          popup.classList.remove("openPopUp");
        }

        selectedUsers.clear();
        changeImpossibleButton(true);
        changeImpossibleButton(false);
      });
    });
  };

  const buttonQuitChat = () => {
    quitChat = document.getElementById("exitGroup");
    quitChat.addEventListener("click", async (event) => {
      const {
        data: { success },
      } = await axios.patch(`/chat/deleteChat/${currentChatId}/${chatIsGroup}`);

      if (success) {
        document.getElementById(currentChatId).remove();
        popUpGroupSettings.classList.remove("openPopUp");
        groupSettings.classList.add("hideSettings");
        document.getElementById("messages").innerHTML = "";
        currentChatId = null;
        messageForm.classList.add("hide-form-sender");
      }
    });
  };

  closePopUpListeners();

  const groupSettingsHtml_1 = ` <div class="popup-header">
          <h3>Group settings</h3>
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" class="popup-close">
            <path fill="#a259c6" d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z"></path>
          </svg>
        </div>

        <div class="users-list-container">
          <h4>Select participants:</h4>
          <div class="users-list"><div class="user-item" id="settingsChat"><input type="checkbox" class="user-checkbox" disabled=""><label for="davidepadurean@gmail.com"><span class="user-avatar"><i class="fas fa-user"></i></span><span class="user-info"><span class="user-name">dave</span><span class="user-email">davidepadurean@gmail.com</span></span></label><span class="user-add-icon" id="removeUser"><i class="fa-solid fa-trash"></i></span></div><div class="user-item" id="settingsChat"><input type="checkbox" class="user-checkbox"><label for="giuliapadurean@gmail.com"><span class="user-avatar"><i class="fas fa-user"></i></span><span class="user-info"><span class="user-name">giulia</span><span class="user-email">giuliapadurean@gmail.com</span></span></label><span></span></div></div>
        </div>
        <button type="submit" id="addNewUsersToGroup" class="addUsers-btn impossible-create-btn">
          <i class="fas fa-plus"></i> Add people
        </button>

        <button type="submit" class="addUsers-btn" id="exitGroup">
          <i class="fa-solid fa-person-walking-dashed-line-arrow-right"></i>
          Leave group
        </button>`;

  const groupSettingsHtml_2 = ` <div class="popup-header">
          <h3>Group settings</h3>
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" class="popup-close">
            <path fill="#a259c6" d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z"></path>
          </svg>
        </div>

        <div class="users-list-container">
          <h4>Participants:</h4>
          <div class="users-list"><div class="user-item" id="settingsChat"><label for="davidepadurean@gmail.com"><span class="user-avatar"><i class="fas fa-user"></i></span><span class="user-info"><span class="user-name">dave</span><span class="user-email">davidepadurean@gmail.com</span></span></label><span class="user-add-icon" id="removeUser"><i class="fa-solid fa-trash"></i></span></div><div class="user-item" id="settingsChat"><input type="checkbox" class="user-checkbox"><label for="giuliapadurean@gmail.com"><span class="user-avatar"><i class="fas fa-user"></i></span><span class="user-info"><span class="user-name">giulia</span><span class="user-email">giuliapadurean@gmail.com</span></span></label><span></span></div></div>
        </div>
        

        <button type="submit" class="addUsers-btn" id="exitGroup">
          <i class="fa-solid fa-person-walking-dashed-line-arrow-right"></i>
          Leave group
        </button>`;

  const singleChatSettingsHtml = ` <div class="popup-header">
          <h3>Chat settings</h3>
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" class="popup-close">
            <path fill="#a259c6" d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z"></path>
          </svg>
        </div>

        <div class="users-list-container">
        </div>
        

        <button type="submit" class="addUsers-btn" id="exitGroup">
          <i class="fa-solid fa-person-walking-dashed-line-arrow-right"></i>
          Leave chat
        </button>`;

  // Ricollega tutti gli event listener come all'avvio
  // Listener per cercare una chat
  searchChat.addEventListener("input", async (event) => {
    const query = event.target.value.trim();
    console.log(query);

    if (query !== "") loadChats(1, query);
    else loadChats(0, "");
  });

  // listener to create a new chat
  createChatForm.addEventListener("submit", async (event) => {
    event.preventDefault(); //to prevent the default action of the form
    const nameGroup = searchInput.value; //get the name group input

    selectedUsers.add(currentUserId); //add the id of the person who wants to create the group
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
      searchInput.value = "";
    }
  });

  //event listener to open the pop up
  openPopUp.addEventListener("click", async (e) => {
    popUp.classList.add("openPopUp");

    //get all users
    const {
      data: { users },
    } = await axios.get("/getAllUsers");

    displayUsers(users, false, true);
  });

  //group settings
  groupSettings.addEventListener("click", async (e) => {
    if (chatIsGroup) {
      const {
        data: { chatOwner },
      } = await axios.get(`chat/chatOwner/${currentChatId}`);

      if (chatOwner) popUpGroupSettings.innerHTML = groupSettingsHtml_1;
      else popUpGroupSettings.innerHTML = groupSettingsHtml_2;
      addUsersToGroupButton = document.querySelector(".addUsers-btn");

      //get all users
      const {
        data: { users },
      } = await axios.get(`/getAllUsersGroup/${currentChatId}/${chatOwner}`);

      displayUsers(users, true, chatOwner);
    } else {
      popUpGroupSettings.innerHTML = singleChatSettingsHtml;
    }
    popUpGroupSettings.classList.add("openPopUp");

    closePopUpListeners();
    buttonQuitChat();

    addUsersToGroupButton.addEventListener("click", async (event) => {
      popUpGroupSettings.classList.remove("openPopUp");

      const selectedUsersArray = Array.from(selectedUsers);

      await axios.patch("/chat/addUsersToGroup", {
        chatId: currentChatId,
        newMembers: selectedUsersArray,
      });

      selectedUsersArray.forEach((user) => {
        sendMessage(
          `${currentUserEmail} was added to the group by ${currentUserEmail}`,
          false
        );
      });
      selectedUsers.clear(); //delete all the elements
      changeImpossibleButton(false); //to restore the impoossible button
    });
  });
  loadChats(0, "");
});
