const User = require("../models/user");
const { UnauthenticatedError } = require("../errors");
const { createJWTAccess, verifyToken } = require("../utils/generateTokens");

const checkCookie = async (req, token) => {
  if (!token) return false;

  //try catch used to catch a error in verfy token (means the token is invalid)
  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) return false;

    //add the user to the request
    req.user = user;
    return true;
  } catch (error) {
    return false;
  }
};

//-----------------------------------------------------------------------------------
const auth = async (req, res, next) => {
  const tokenAccess = req.cookies.jwtAccess;
  const tokenRefresh = req.cookies.jwtRefresh;

  var hasValidRefresh = null;

  const publicPaths = ["/login", "/register"];

  // check if the path is public
  if (publicPaths.includes(req.path)) {
    // check if the cookies contains something
    if (tokenAccess && tokenRefresh) {
      hasValidRefresh = await checkCookie(req, tokenRefresh);

      if ((await checkCookie(req, tokenAccess)) && hasValidRefresh) {
        return res.redirect("/chat");
      }
    }
    return next();
  }

  // for protected paths
  //need to check the access token
  hasValidRefresh = await checkCookie(req, tokenRefresh);
  if ((await checkCookie(req, tokenAccess)) && hasValidRefresh) {
    return next();
  }

  // if the access token is invalid, then check only the refresh token
  //if it is, then update the cookie access and continue with the code
  if (hasValidRefresh) {
    newAccessToken = createJWTAccess(req.user._id, req.user.name);
    res.cookie("jwtAccess", newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });
    return next();
  }

  //if any token is valid, then go back to /login
  return res.redirect("/login");
};

module.exports = auth;
