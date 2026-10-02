const express = require("express");
const router = express.Router();
const {
  loginIndex,
  login,
  registerIndex,
  register,
  getUserIdEmail,
  getAllUsers,
  getAllUsersGroup,
} = require("../controllers/user");

const { chatIndex } = require("../controllers/chat");

router.route("/").get(chatIndex);
router.route("/register").get(registerIndex).post(register);
router.route("/login").get(loginIndex).post(login);
router.route("/getUserIdEmail").get(getUserIdEmail);
router.route("/getAllUsers").get(getAllUsers);
router.route("/getAllUsersGroup/:chatId/:chatOwner").get(getAllUsersGroup);

module.exports = router;
