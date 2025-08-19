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
        //to get the name and email of the other person in the single chat
        const otherMemberEmail = chat.members.find(
          (member) => member !== req.user.email
        );

        const nameEmail = await User.findOne({
          email: otherMemberEmail,
        }).select("name email");

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

// Save a new message to the database
const saveMessage = async (req, res) => {
  const { message, currentChatId } = req.body;

  if (!message || !currentChatId) {
    throw new BadRequestError("Message and chat ID are required");
  }

  const newMessage = await Message.create({
    message: message,
    createdBy: req.user.email,
    chatAt: currentChatId,
  });

  res.status(StatusCodes.CREATED).json({ newMessage });
};

// Get all messages for a specific chat
const getMessages = async (req, res) => {
  const { chatAt } = req.params;

  if (!chatAt) {
    throw new BadRequestError("need to provide a chat id");
  }

  const messages = await Message.find({ chatAt }).sort({ createdAt: 1 });

  if (!messages) {
    throw new BadRequestError("error during get all messages for a chat");
  }

  res.status(StatusCodes.OK).json({ messages });
};

module.exports = {
  chatIndex,
  getChats,
  createChat,
  searchUsers,
  searchChat,
  saveMessage,
  getMessages,
};
