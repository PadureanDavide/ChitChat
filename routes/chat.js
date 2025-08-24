const express = require("express");
const router = express.Router();
const {
  chatIndex,
  getChats,
  createChat,
  searchUsers,
  searchChat,
  saveMessage,
  getMessages,
  incUnreadMess,
  removeUnreadMess,
} = require("../controllers/chat");

const auth = require("../middleware/authentication");

router.use(auth);

router.route("/").get(chatIndex);
router.route("/createChat").post(createChat);
router.route("/getChats").get(getChats);
router.route("/searchUsers").get(searchUsers);
router.route("/searchChats").get(searchChat);
router.route("/unreadCont/:chatId").patch(incUnreadMess);
router.route("/removeUnreadMess/:chatId").patch(removeUnreadMess);

// Salva un messaggio (REST fallback, opzionale)
router.route("/messages").post(saveMessage);
router.route("/messages/:chatAt").get(getMessages);

module.exports = router;
