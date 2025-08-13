const path = require("path");
const Chat = require("../models/chat");
const User = require("../models/user"); // Assicurati di avere il modello User importato
const Message = require("../models/message"); // Assicurati di avere il modello Message importato
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, UnauthenticatedError } = require("../errors");
const { read } = require("fs");

// to get the html chat file
const chatIndex = async (req, res) => {
  const chats = await Chat.find({ members: req.user._id }); // Filtra le chat dell'utente

  if (!chats) throw new BadRequestError("error getting chat.html");

  res
    .status(StatusCodes.OK)
    .sendFile(path.join(__dirname, "../public/html", "chat.html"));
};

//get all personal chats
const getChats = async (req, res) => {
  const chats = await Chat.find({ members: req.user.email }); // Filtra le chat dell'utente

  if (!chats) throw new BadRequestError("error getting chats");

  const chatsCompleted = await Promise.all(
    chats.map(async (chat) => {
      if (!chat.isGroup) {
        const nameEmail = await User.findOne({ email: chat.members[1] }).select(
          "name email"
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
  console.log(req.body.emailOther);

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

// Cerca utenti per email
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

  if (chat)

  const allChats = getChats();

  allChats = await Promise.all(
    allChats.map(async (chat) => {
      console.log(chat)
    })
  );


  const chats = await Chat.find({
    _id: { $ne: req.user._id },
    email: { $regex: email, $options: "i" },
  }).select("name email");
};

//get all the messages of a specific chat
const getChatMessages = async (req, res) => {
  const { chatId } = req.params;
  console.log(chatId);
  if (!chatId) throw new BadRequestError("Chat ID is required");

  const chat = await Chat.findById(chatId);

  if (!chat) throw new BadRequestError("Chat not found");

  const messages = await Message.find({ chatId }).sort({ createdAt: 1 });

  res.status(StatusCodes.OK).json({ messages });
};

module.exports = {
  chatIndex,
  getChats,
  createChat,
  searchUsers,
  getChatMessages,
  searchChat,
};
