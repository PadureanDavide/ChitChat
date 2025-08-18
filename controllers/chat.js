const path = require("path");
const Chat = require("../models/chat");
const User = require("../models/user");
const Message = require("../models/message");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, UnauthenticatedError } = require("../errors");

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
  const chats = await Chat.find({ members: req.user.email });

  if (!chats) throw new BadRequestError("error getting chats");

  const chatsCompleted = await Promise.all(
    chats.map(async (chat) => {
      if (!chat.isGroup) {
        const nameEmail = await User.findOne({ email: chat.members[1] }).select(
          "name email"
        );

        if (!nameEmail)
          throw new BadRequestError(
            "error when finding name and email of a specific user"
          );

        return {
          ...chat.toObject(),
          nameEmail,
        };
      }
    })
  );

  res.status(StatusCodes.OK).json({ chatsCompleted });
};

//create a new chat
const createChat = async (req, res) => {
  if (req.body.emailOther !== req.user.email) {
    const chat = await Chat.create({
      createdBy: req.user._id,
      members: [req.user.email, req.body.emailOther],
    });

    if (!chat) throw new BadRequestError("error during creating a chat");
    res.status(StatusCodes.OK).json({ success: true });
  }
  res.status(StatusCodes.OK).json({ success: false });
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

  const suppChat = await Chat.find({
    $or: [
      {
        isGroup: true,
        nameChat: { $regex: chat, $options: "i" },
      },
      {
        isGroup: false,
        members: { $regex: chat },
      },
    ],
  });

  const chatsCompleted = await Promise.all(
    suppChat.map(async (chat) => {
      if (!chat.isGroup) {
        const nameEmail = await User.findOne({ email: chat.members[1] }).select(
          "name email"
        );

        if (!nameEmail)
          throw new BadRequestError(
            "error when finding name and email of a specific user"
          );

        return {
          ...chat.toObject(),
          nameEmail,
        };
      }
    })
  );

  if (!chatsCompleted)
    throw new BadRequestError("error during the search of chats");

  res.status(StatusCodes.OK).json({ chatsCompleted });
};

//get all the messages of a specific chat
const getChatMessages = async (req, res) => {
  const { chat } = req.query;
  if (!chat) throw new BadRequestError("Chat ID is required");

  const chatFound = await Chat.findById(chat);

  if (!chatFound) throw new BadRequestError("Chat not found");

  const messages = await Message.find({ chat }).sort({ createdAt: 1 });

  res.status(StatusCodes.OK).json({ messages });
};

// Salva un messaggio (usato per fallback REST, opzionale)
const saveMessage = async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "Content required" });
  const message = await Message.create({
    chatAt: chatId,
    createdBy: req.user.email,
    message: content,
  });
  res.status(200).json({ message });
};

module.exports = {
  chatIndex,
  getChats,
  createChat,
  searchUsers,
  getChatMessages,
  searchChat,
  saveMessage,
};
