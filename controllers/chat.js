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
          (member) => member.name !== req.user.email
        );

        const nameEmail = await User.findOne({
          email: otherMemberEmail.name,
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
  const chats = await Chat.find({ "members.name": req.user.email }).sort({
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
      "members.name": req.body.emailOther,
    }).select("_id");

    //if the chat exists, then execute only the res
    if (chatExists) {
      res
        .status(StatusCodes.OK)
        .json({ success: true, exists: true, _id: chatExists._id });
    } else {
      //only if the chat do not exist
      const chat = await Chat.create({
        createdBy: req.user._id,
        members: [
          { name: req.user.email, numUnreadMessages: 0 },
          { name: req.body.emailOther, numUnreadMessages: 0 },
        ],
      });

      if (!chat) throw new BadRequestError("error during creating a chat");

      res.status(StatusCodes.OK).json({ success: true, exists: false });
    }
  } else {
    //to create group IN THE NEXT EPISODE

    const members = req.body.membersToAdd.map((email) => ({
      name: email, // Usa l'email come nome, oppure potresti voler cercare il nome utente
      numUnreadMessages: 0,
    }));

    const chat = await Chat.create({
      createdBy: req.user._id,
      isGroup: true,
      nameChat: req.body.name,
      members: members,
    });

    if (!chat)
      throw new BadRequestError("error during the creation of a new group");

    res.status(StatusCodes.OK).json({ success: true });
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
      },
      {
        isGroup: false,
        "members.name": { $regex: chat },
      },
    ],
  });

  const chatsCompleted = await getChatCompleted(req, res, chats);

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

//increment unread messages cont
const incUnreadMess = async (req, res) => {
  console.log("incremento");
  const { chatId } = req.params;

  if (!chatId) throw new BadRequestError("a param must be provided");

  const chat = await Chat.findById(chatId);
  if (!chat) throw new BadRequestError("chat not found");

  chat.members.forEach((member) => {
    if (member.name !== req.user.email) {
      member.numUnreadMessages += 1;
    }
  });

  await chat.save();

  res.status(StatusCodes.OK).json({ success: true });
};

//remove the unread counter from the database
const removeUnreadMess = async (req, res) => {
  console.log("azzeramento");

  const { chatId } = req.params;

  const result = await Chat.findOneAndUpdate(
    {
      _id: chatId,
      "members.name": req.user.email,
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
};
