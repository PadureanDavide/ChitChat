const express = require("express");
const router = express.Router();
const auth = require("../middleware/authentication");
const {
  chatIndex,
  getChats,
  createChat,
  searchUsers,
  searchChat,
  saveMessage,
  getMessages,
} = require("../controllers/chat");

router.route("/").get(chatIndex);
router.route("/createChat").post(createChat);
router.route("/getChats").get(getChats);
router.route("/searchUsers").get(searchUsers);
router.route("/searchChats").get(searchChat);

// Salva un messaggio (REST fallback, opzionale)
router.route("/messages").post(saveMessage);
router.route("/messages/:chatAt").get(getMessages);

module.exports = router;
