const express = require("express");
const router = express.Router();
const {
  loginIndex,
  login,
  registerIndex,
  register,
  getEmail,
} = require("../controllers/user");

const auth = require("../middleware/authentication");

router.use(auth);

router.route("/register").get(registerIndex).post(register);
router.route("/login").get(loginIndex).post(login);
router.route("/getEmail").get(getEmail);

module.exports = router;
