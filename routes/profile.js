const express = require("express");
const router = express.Router();

const {
  profileIndex,
  getEmailName,
  updateNameUser,
  updatePasswordUser,
  logOut,
} = require("../controllers/profile");

router.route("/").get(profileIndex);
router.route("/getEmailName").get(getEmailName);
router.route("/updateNameUser/:newName").patch(updateNameUser);
router.route("/updatePasswordUser").patch(updatePasswordUser);
router.route("/logout").delete(logOut);

module.exports = router;
