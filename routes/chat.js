const express = require("express");
const router = express.Router();
const auth = require("../middleware/authentication");
const {
  chatIndex,
  getChats,
  createChat,
  searchUsers,
  getChatMessages,
  searchChat,
  saveMessage,
} = require("../controllers/chat");

router.use(auth);

router.route("/").get(chatIndex);
router.route("/createChat").post(createChat);
router.route("/getChats").get(getChats);
router.route("/searchUsers").get(searchUsers);
router.route("/searchChats").get(searchChat);

// Salva un messaggio (REST fallback, opzionale)
router.route("/messages").post(saveMessage);
router.route("/messages").get(getChatMessages);

module.exports = router;
