const express = require("express");
const router = express.Router();
const {
  loginIndex,
  login,
  registerIndex,
  register,
  getEmail,
  getAllUsers,
} = require("../controllers/user");

router.route("/register").get(registerIndex).post(register);
router.route("/login").get(loginIndex).post(login);
router.route("/getEmail").get(getEmail);
router.route("/getAllUsers").get(getAllUsers);

module.exports = router;
