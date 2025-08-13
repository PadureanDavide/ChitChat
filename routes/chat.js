const express = require("express");
const router = express.Router();
const auth = require("../middleware/authentication");
const {
  chatIndex,
  getChats,
  createChat,
  searchUsers,
  getChatMessages,
} = require("../controllers/chat");

router.use(auth);

router.route("/").get(chatIndex);
router.route("/createChat").post(createChat);
router.route("/getChats").get(getChats);
router.route("/searchUsers").get(searchUsers);
router.route("/messages/:chatId").get(getChatMessages);

module.exports = router;
