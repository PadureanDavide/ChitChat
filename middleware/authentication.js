const User = require("../models/user");
const { StatusCodes } = require("http-status-codes");
const { createJWTAccess, verifyToken } = require("../utils/generateTokens");
const getAuthCookieOptions = require("../utils/authCookies");

const checkCookie = async (req, token, expectedType) => {
  if (!token) return false;

  let decoded;
  try {
    decoded = verifyToken(token, expectedType);
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return false;
    }
    throw error;
  }

  const user = await User.findById(decoded.userId).select("-password");
  if (
    !user ||
    !decoded.sessionId ||
    !user.activeSessions.includes(decoded.sessionId)
  ) {
    return false;
  }

  if (expectedType === "refresh" && !user.refreshTokens.includes(token)) {
    return false;
  }

  req.user = user;
  req.auth = decoded;
  return true;
};

const issueAccessCookie = (res, user, sessionId) => {
  const token = createJWTAccess(user._id, user.name, sessionId);
  res.cookie("jwtAccess", token, {
    ...getAuthCookieOptions(),
    maxAge: 60 * 60 * 1000,
  });
};

const isApiRequest = (req) => {
  const accept = req.get("accept") || "";
  return (
    req.xhr ||
    req.path.startsWith("/api/") ||
    accept.split(",").some((type) => type.trim().startsWith("application/json"))
  );
};

const auth = async (req, res, next) => {
  const tokenAccess = req.cookies.jwtAccess;
  const tokenRefresh = req.cookies.jwtRefresh;

  const publicPaths = ["/login", "/register"];

  // Redirect authenticated users away from public pages.
  if (publicPaths.includes(req.path)) {
    if (await checkCookie(req, tokenAccess, "access")) {
      return res.redirect("/chat");
    }

    if (await checkCookie(req, tokenRefresh, "refresh")) {
      issueAccessCookie(res, req.user, req.auth.sessionId);
      return res.redirect("/chat");
    }

    return next();
  }

  if (await checkCookie(req, tokenAccess, "access")) {
    return next();
  }

  if (await checkCookie(req, tokenRefresh, "refresh")) {
    issueAccessCookie(res, req.user, req.auth.sessionId);
    return next();
  }

  if (isApiRequest(req)) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({
        statusCode: StatusCodes.UNAUTHORIZED,
        msg: "Authentication required",
      });
  }

  return res.redirect("/login");
};

module.exports = auth;
