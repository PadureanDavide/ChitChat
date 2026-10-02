const jwt = require("jsonwebtoken");

//create the access token
const createJWTAccess = (id, name, sessionId) => {
  return jwt.sign(
    { userId: id, name, sessionId, tokenType: "access" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_LIFETIME_ACCESS },
  );
};

//create the refresh token
const createJWTRefresh = (id, name, sessionId) => {
  return jwt.sign(
    { userId: id, name, sessionId, tokenType: "refresh" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_LIFETIME_REFRESH },
  );
};

//verify the token
const verifyToken = (token, expectedType) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (decoded.tokenType !== expectedType) {
    throw new jwt.JsonWebTokenError("Invalid token type");
  }

  return decoded;
};

module.exports = {
  createJWTAccess,
  createJWTRefresh,
  verifyToken,
};
