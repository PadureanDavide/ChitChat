const express = require("express");
const router = express.Router();
const {
  loginIndex,
  login,
  registerIndex,
  register,
} = require("../controllers/user");

router.route("/register").get(registerIndex).post(register);
router.route("/login").get(loginIndex).post(login);

module.exports = router;
