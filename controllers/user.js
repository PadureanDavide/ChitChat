const { StatusCodes } = require("http-status-codes");
const User = require("../models/user");
const { BadRequestError, UnauthenticatedError } = require("../errors");
const {
  createJWTAccess,
  createJWTRefresh,
} = require("../utils/generateTokens");
const Chat = require("../models/chat");

//required to pass from a html file to another
const path = require("path");

//-------------------------------------------------------
//get email
const getEmail = async (req, res) => {
  res.status(StatusCodes.OK).json({ email: req.user.email });
};

//-------------------------------------------------------
//register
const register = async (req, res) => {
  const user = await User.create({ ...req.body });

  if (!user)
    throw new BadRequestError("error during the creation of a new user");

  res.status(StatusCodes.CREATED).redirect("/chat");
};

const registerIndex = (req, res) => {
  res
    .status(StatusCodes.OK)
    .sendFile(path.join(__dirname, "../public/html", "register.html"));
};

//-------------------------------------------------------

//login
const loginIndex = async (req, res) => {
  res
    .status(StatusCodes.OK)
    .sendFile(path.join(__dirname, "../public/html", "login.html"));
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new BadRequestError("please provide valid credentials");

  const user = await User.findOne({ email });

  if (!user)
    throw new UnauthenticatedError("the user do not exist, please register");

  //compare the password
  if (!user.comparePassword(password))
    throw new UnauthenticatedError("the password is wrong, try again");

  //create the access token and the refresh token
  const tokenAccess = createJWTAccess(user._id, user.name);
  const tokenRefresh = createJWTRefresh(user._id, user.name);

  //add the refresh token to the user
  user.refreshTokens.push(tokenRefresh);
  //to save the changes in the database
  await user.save();

  //create cookie and save the token inside
  res.cookie("jwtAccess", tokenAccess, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 1000,
  });

  //create cookie and save the token inside
  res.cookie("jwtRefresh", tokenRefresh, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    // path: "/refresh", //update only when /refresh path is called
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  // Genera un token JWT e includi l'email nella risposta
  res.status(StatusCodes.OK).redirect("/chat");
};

//-------------------------------------------------------
//get all users
const getAllUsers = async (req, res) => {
  //select all users exept myself
  const users = await User.find({ email: { $ne: req.user.email } }).select(
    "email name"
  );

  if (!users) throw new BadRequestError("error during getting all the users");

  res.status(StatusCodes.OK).json({ users });
};

const getAllUsersGroup = async (req, res) => {
  const { chatId } = req.params;

  //get all the users
  const users = getAllUsers(req, res);

  const groupUsers = await Chat.find({ _id: chatId }).select("members");
  console.log(groupUsers);

  res.status(StatusCodes.OK).json("success");
};

//-------------------------------------------------------
//logout
const logout = async (req, res) => {};

module.exports = {
  loginIndex,
  login,
  registerIndex,
  register,
  getEmail,
  getAllUsers,
  getAllUsersGroup,
};
