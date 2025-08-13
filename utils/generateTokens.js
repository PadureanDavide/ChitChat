const jwt = require("jsonwebtoken");

//create the access token
const createJWTAccess = (id, name) => {
  return jwt.sign({ userId: id, name: name }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_LIFETIME_ACCESS,
  });
};

//create the refresh token
const createJWTRefresh = (id, name) => {
  return jwt.sign({ userId: id, name: name }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_LIFETIME_REFRESH,
  });
};

//verify the token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
  createJWTAccess,
  createJWTRefresh,
  verifyToken,
};
