const path = require("path");
const Chat = require("../models/chat");
const User = require("../models/user");
const Message = require("../models/message");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, UnauthenticatedError } = require("../errors");

//----------------------------------------------------------------------------
const getChatCompleted = async (req, res, val) => {
  const chatsCompleted = await Promise.all(
    val.map(async (chat) => {
      if (!chat.isGroup) {
        //to get the name and email of the other person in the single chat
        const otherMemberEmail = chat.members.find(
          (member) => !req.user._id.equals(member.userId)
        );
        const nameEmail = await User.findOne({
          _id: otherMemberEmail.userId,
        }).select("name email");

        if (!nameEmail)
          throw new BadRequestError(
            "error when finding name and email of a specific user"
          );

        return {
          ...chat.toObject(),
          nameEmail,
        };
      } else {
        return chat.toObject();
      }
    })
  );

  return chatsCompleted;
};

//----------------------------------------------------------------------------

// to get the html chat file
const chatIndex = async (req, res) => {
  const chats = await Chat.find({ members: req.user._id });

  if (!chats) throw new BadRequestError("error getting chat.html");

  res
    .status(StatusCodes.OK)
    .sendFile(path.join(__dirname, "../public/html", "chat.html"));
};

//get all personal chats
const getChats = async (req, res) => {
  const chats = await Chat.find({
    members: {
      $elemMatch: {
        userId: req.user._id,
        exitFromSingleChat: false,
      },
    },
  }).sort({
    updatedAt: -1,
  }); //to order them based on the updatedAt value (last updated first)

  if (!chats) throw new BadRequestError("error getting chats");

  const chatsCompleted = await getChatCompleted(req, res, chats);

  res.status(StatusCodes.OK).json({ chatsCompleted });
};

//create a new chat
const createChat = async (req, res) => {
  if (!req.body.isGroup) {
    const chatExists = await Chat.findOne({
      isGroup: false,
      "members.userId": {
        $all: [req.user._id, req.body.otherUserId],
      },
    });

    //if the chat exists, then execute only the res
    if (chatExists) {
      const reopenedChat = await Chat.findOneAndUpdate(
        {
          _id: chatExists._id,
          isGroup: false,
          "members.userId": req.user._id.toString(),
        },
        {
          $set: {
            "members.$.exitFromSingleChat": false,
          },
        },
        { new: true }
      );

      if (!reopenedChat)
        throw new BadRequestError("error reopening the existing chat");

      const nameUser = await User.findOne({
        _id: req.body.otherUserId,
      }).select("name");

      res
        .status(StatusCodes.OK)
        .json({
          success: true,
          exists: true,
          _id: reopenedChat._id,
          name: nameUser?.name || "",
        });
    } else {
      //only if the chat do not exist
      const chat = await Chat.create({
        createdBy: req.user._id,
        members: [
          {
            userId: req.user._id,
            numUnreadMessages: 0,
            exitFromSingleChat: false,
          },
          {
            userId: req.body.otherUserId,
            numUnreadMessages: 0,
            exitFromSingleChat: false,
          },
        ],
      });

      if (!chat) throw new BadRequestError("error during creating a chat");

      res
        .status(StatusCodes.OK)
        .json({ success: true, exists: false, _id: chat._id });
    }
  } else {
    //to create group
    const members = req.body.membersToAdd.map((newUserId) => ({
      userId: newUserId, // Usa l'email come nome, oppure potresti voler cercare il nome utente
      numUnreadMessages: 0,
      exitFromSingleChat: false,
    }));

    const chat = await Chat.create({
      createdBy: req.user._id,
      isGroup: true,
      nameChat: req.body.name,
      members: members,
    });

    if (!chat)
      throw new BadRequestError("error during the creation of a new group");

    res.status(StatusCodes.OK).json({ success: true, _id: chat._id });
  }
};

//search users to create a new chat with
const searchUsers = async (req, res) => {
  const { email } = req.query;

  const users = await User.find({
    _id: { $ne: req.user._id },
    email: { $regex: email, $options: "i" },
  }).select("name email");

  if (!users) throw new BadRequestError("error getting search users");

  res.status(StatusCodes.OK).json({ users });
};

//to search a chat based on email or name of the group
const searchChat = async (req, res) => {
  const { chat } = req.query;

  const chats = await Chat.find({
    $or: [
      {
        isGroup: true,
        nameChat: { $regex: chat, $options: "i" },
        "members.userId": req.user.id,
      },
      {
        isGroup: false,
        "members.userId": { $regex: req.user.id },
        exitFromSingleChat: false,
      },
    ],
  });

  const chatsCompleted = await getChatCompleted(req, res, chats);

  res.status(StatusCodes.OK).json({ chatsCompleted });
};

const chatOwner = async (req, res) => {
  const { chatId } = req.params;

  const chat = await Chat.findOne({ _id: chatId, createdBy: req.user.id });
  if (chat) res.status(StatusCodes.OK).json({ chatOwner: true });
  else res.status(StatusCodes.OK).json({ chatOwner: false });
};

// Save a new message to the database
const saveMessage = async (req, res) => {
  const { message, currentChatId, typeMessage } = req.body;
  let newMessage = null;

  if (!message || !currentChatId) {
    throw new BadRequestError("Message and chat ID are required");
  }

  if (typeMessage) {
    newMessage = await Message.create({
      message: message,
      createdBy: req.user._id,
      chatAt: currentChatId,
    });

    const validExitFromSingleChat = await Chat.findOneAndUpdate(
      {
        _id: currentChatId,
        "members.userId": req.user._id,
      },
      {
        $set: {
          "members.$.exitFromSingleChat": false,
        },
      },
      {
        new: true,
      }
    );

    if (!validExitFromSingleChat)
      throw new BadRequestError(
        "error during the setting false of exitFromSingleChat"
      );
  } else {
    newMessage = await Message.create({
      message: message,
      createdBy: "SERVER NOTIFICATION",
      chatAt: currentChatId,
    });
  }

  if (!newMessage)
    throw new BadRequestError("error during the creation of a message");

  const chat = await Chat.findOne({ _id: currentChatId });

  res
    .status(StatusCodes.CREATED)
    .json({ emailUser: req.user.email, chatIsGroup: chat.isGroup });
};

// Get all messages for a specific chat
const getMessages = async (req, res) => {
  const { chatAt } = req.params;

  if (!chatAt) {
    throw new BadRequestError("need to provide a chat id");
  }

  const chat = await Chat.findOne({ _id: chatAt });

  if (!chat)
    throw new BadRequestError("error during finding the chat selected");

  let messages = await Message.find({ chatAt }).sort({ createdAt: 1 });

  messages = await Promise.all(
    messages.map(async (message) => {
      if (message.createdBy === "SERVER NOTIFICATION") {
        return {
          ...message.toObject(),
        };
      } else {
        let sender = await User.findOne({ _id: message.createdBy }).select(
          "email"
        );
        return {
          ...message.toObject(),
          createdByEmail: sender.email,
        };
      }
    })
  );

  if (!messages) {
    throw new BadRequestError("error during get all messages for a chat");
  }

  res
    .status(StatusCodes.OK)
    .json({ messages: messages, isGroup: chat.isGroup });
};

//increment unread messages cont
const incUnreadMess = async (req, res) => {
  const { chatId } = req.params;

  if (!chatId) throw new BadRequestError("a param must be provided");

  const chat = await Chat.findById(chatId);
  if (!chat) throw new BadRequestError("chat not found");

  chat.members.forEach((member) => {
    if (!req.user._id.equals(member.userId)) {
      //need ot use equals because req.user._id is a object and member.userId is a string
      member.numUnreadMessages += 1;
    }
  });

  await chat.save();

  res.status(StatusCodes.OK).json({ success: true });
};

//remove the unread counter from the database
const removeUnreadMess = async (req, res) => {
  const { chatId } = req.params;

  const result = await Chat.findOneAndUpdate(
    {
      _id: chatId,
      "members.userId": req.user._id.toString(),
    },
    {
      $set: {
        "members.$.numUnreadMessages": 0,
      },
    },
    {
      new: true, // Restituisce il documento aggiornato
    }
  );

  if (!result)
    throw new BadRequestError(
      "error during the down grade to 0 for the unreadmessages"
    );

  res.status(StatusCodes.OK).json({ success: true });
};

const removeUserFromGroup = async (req, res) => {
  const { chatId, userIdToRemove } = req.params;

  const result = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: {
        members: { userId: userIdToRemove },
      },
    },
    { new: true }
  );

  res.status(StatusCodes.OK).json({ success: true });
};

const addUsersToGroup = async (req, res) => {
  const { chatId, newMembers } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat || !chat.isGroup)
    throw new BadRequestError(
      "passed a id chat that is not available or is a single chat"
    );

  if (chat.createdBy === req.user.id) {
    //check if the new memebers are real persons
    const existingUsers = await User.find({
      _id: { $in: newMembers },
    }).select("-refreshTokens");

    if (!existingUsers || existingUsers.size !== newMembers.size)
      throw new BadRequestError("some users are not real");

    const newMembersCompleted = newMembers.map((newUserId) => ({
      userId: newUserId, // Usa l'email come nome, oppure potresti voler cercare il nome utente
      numUnreadMessages: 0,
      exitFromSingleChat: false,
    }));

    chat.members.push(...newMembersCompleted);
    await chat.save();

    res.status(StatusCodes.OK).json({ success: true });
  } else
    res
      .status(StatusCodes.FORBIDDEN)
      .json({ msg: "someone else is tying to access restriceted area" });
};

const confirmDeleteChat = async (chatId) => {
  await Chat.findByIdAndDelete(chatId);
  await Message.deleteMany({ chatAt: chatId });
};

const deleteChat = async (req, res) => {
  const { chatId, chatIsGroup } = req.params;
  let chat = null;

  if (chatIsGroup === "true") {
    //exit the chat
    chat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $pull: {
          members: { name: req.user.email },
        },
      },
      { new: true }
    );

    if (!chat) throw new BadRequestError("chat group not found to exit");

    if (chat.members.length !== 0) {
      if (chat.createdBy === req.user.email) {
        chat.createdBy = chat.members[0].name;
        await chat.save();
        res
          .status(StatusCodes.OK)
          .json({ success: true, noMembersLeft: false });
      }
    } else {
      await confirmDeleteChat(chatId);
      res.status(StatusCodes.OK).json({ success: true, noMembersLeft: true });
    }
  } else {
    chat = await Chat.findOneAndUpdate(
      {
        _id: chatId,
        isGroup: false,
        "members.userId": req.user._id.toString(),
      },
      {
        $set: {
          "members.$.exitFromSingleChat": true,
        },
      },
      {
        new: true,
      }
    );

    if (!chat)
      throw new BadRequestError(
        "chat not found or error during the updating of EXITFROMSINGLECHAT"
      );

    if (chat.members.every((member) => member.exitFromSingleChat)) {
      await confirmDeleteChat(chatId);
      res.status(StatusCodes.OK).json({ success: true, noMembersLeft: true });
    } else
      res.status(StatusCodes.OK).json({ success: true, noMembersLeft: false });
  }
};

module.exports = {
  chatIndex,
  getChats,
  createChat,
  searchUsers,
  searchChat,
  saveMessage,
  getMessages,
  incUnreadMess,
  removeUnreadMess,
  removeUserFromGroup,
  addUsersToGroup,
  deleteChat,
  chatOwner,
};
