const path = require("path");
const Chat = require("../models/chat");
const User = require("../models/user");
const { StatusCodes } = require("http-status-codes");
const {
  BadRequestError,
  UnauthenticatedError,
  NotFoundError,
} = require("../errors");
const getAuthCookieOptions = require("../utils/authCookies");

// to get the html chat file
const profileIndex = async (req, res) => {
  const chats = await Chat.find({ members: req.user._id });

  if (!chats) throw new BadRequestError("error getting profile.html");

  res
    .status(StatusCodes.OK)
    .sendFile(path.join(__dirname, "../public/html", "profile.html"));
};

const getEmailName = async (req, res) => {
  const user = await User.findOne({ email: req.user.email }).select(
    "email name",
  );

  if (!user)
    throw new BadRequestError("error during getting the name and email");

  res.status(StatusCodes.OK).json({ name: user.name, email: user.email });
};

const updateNameUser = async (req, res) => {
  const { newName } = req.params;
  const user = await User.findOneAndUpdate(
    { email: req.user.email },
    { name: newName.trim() },
    { new: true, runValidators: true },
  );

  res.status(StatusCodes.OK).json({ success: true });
};

const updatePasswordUser = async (req, res, next) => {
  try {
    const { currPassword, newPassword, confPassword } = req.body;

    // Validazione input
    if (!currPassword || !newPassword || !confPassword) {
      throw new BadRequestError("All password fields are required");
    }

    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Verifica password corrente
    if (!(await user.comparePassword(currPassword))) {
      throw new UnauthenticatedError("Current password is incorrect");
    }

    // Verifica match password
    if (newPassword !== confPassword) {
      throw new BadRequestError("New password and confirmation do not match");
    }

    // Verifica che la nuova password sia diversa dalla vecchia
    if (await user.comparePassword(newPassword)) {
      throw new BadRequestError(
        "New password cannot be the same as current password",
      );
    }

    // Aggiorna password - qui scatterà la validazione del modello
    user.password = newPassword;
    await user.save();

    res.status(StatusCodes.OK).json({
      success: true,
      passwordsMatch: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

const logOut = async (req, res) => {
  const sessionsToRevoke = { activeSessions: req.auth.sessionId };
  if (req.cookies.jwtRefresh) {
    sessionsToRevoke.refreshTokens = req.cookies.jwtRefresh;
  }

  await User.updateOne({ _id: req.user._id }, { $pull: sessionsToRevoke });

  res.clearCookie("jwtAccess", getAuthCookieOptions());
  res.clearCookie("jwtRefresh", getAuthCookieOptions());

  res.status(StatusCodes.OK).json({ success: true });
};

module.exports = {
  profileIndex,
  getEmailName,
  updateNameUser,
  updatePasswordUser,
  logOut,
};
