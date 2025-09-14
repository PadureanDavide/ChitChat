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
const getUserIdEmail = async (req, res) => {
  res.status(StatusCodes.OK).json({ id: req.user._id, email: req.user.email });
};

//-------------------------------------------------------
//register
const register = async (req, res, next) => {
  try {
    const user = await User.create({ ...req.body });

    if (!user)
      throw new BadRequestError("error during the creation of a new user");

    res.status(StatusCodes.CREATED).json({ success: true });
  } catch (error) {
    next(error);
  }
};

//to load the register.html
const registerIndex = (req, res) => {
  res
    .status(StatusCodes.OK)
    .sendFile(path.join(__dirname, "../public/html", "register.html"));
};

//-------------------------------------------------------

//to load the login.html
const loginIndex = async (req, res) => {
  res
    .status(StatusCodes.OK)
    .sendFile(path.join(__dirname, "../public/html", "login.html"));
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new BadRequestError("please provide valid credentials");

  try {
    const user = await User.findOne({ email: email });

    if (!user)
      throw new UnauthenticatedError("the user do not exist, please register");

    //compare the password
    if (await user.comparePassword(password)) {
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
      res.status(StatusCodes.OK).json({ success: true });
    } else throw new UnauthenticatedError("wrong password");
  } catch (error) {
    next(error);
  }
};

//-------------------------------------------------------
//get all users
const getAllUsers = async (req, res) => {
  //select all users exept myself
  const users = await User.find({ _id: { $ne: req.user.id } }).select(
    "-refreshTokens"
  );

  if (!users) throw new BadRequestError("error during getting all the users");

  res.status(StatusCodes.OK).json({ users });
};

const getAllUsersGroup = async (req, res) => {
  const { chatId, chatOwner } = req.params;

  const users = await User.find({ _id: { $ne: req.user.id } }).select(
    "email name"
  );
  if (!users)
    throw new BadRequestError("error during get all users execept myself");

  //get all the users
  var groupUsers = await Chat.findById(chatId).select("members");
  if (!groupUsers) throw new BadRequestError("error during get group users");

  //to set the users that are already in the group
  groupUsers = await setUsersAlreadyIn(users, groupUsers.members, chatOwner);

  res.status(StatusCodes.OK).json({ success: true, users: groupUsers });
};

const setUsersAlreadyIn = async (allUsers, groupMembers, chatOwner) => {
  let usersToReturn = null;
  // Estrai tutte le email dei membri del gruppo
  const groupMemberIds = groupMembers.map((member) => member.userId); // Prende solo gli ID

  if (chatOwner === "true") {
    // Aggiungi il campo isAlreadyIn a ogni utente
    usersToReturn = allUsers.map((user) => {
      const isAlreadyInGroup = groupMemberIds.includes(user._id.toString());

      return {
        ...user.toObject(),
        isAlreadyInGroup: isAlreadyInGroup,
      };
    });
  } else {
    // Aggiungi il campo isAlreadyIn a ogni utente
    usersToReturn = allUsers
      .filter((user) => groupMemberIds.includes(user._id.toString()))
      .map((user) => user.toObject());
  }

  return usersToReturn;
};

module.exports = {
  loginIndex,
  login,
  registerIndex,
  register,
  getUserIdEmail,
  getAllUsers,
  getAllUsersGroup,
};
