const User = require("../models/user");
const { UnauthenticatedError } = require("../errors");
const { createJWTAccess, verifyToken } = require("../utils/generateTokens");

const auth = async (req, res, next) => {
  const tokenAccess = req.cookies.jwtAccess;
  const tokenRefresh = req.cookies.jwtRefresh;
  let user;

  if (!tokenRefresh) res.redirect("/login");

  // Verifica access token
  try {
    var decoded = verifyToken(tokenAccess);
    user = await User.findById(decoded.userId).select(
      "-password -refreshTokens"
    );
    if (!user) throw new UnauthenticatedError("Utente non trovato");
    req.user = user;
    next();
  } catch (err) {
    // Se access token non valido, prova refresh token
    try {
      decoded = verifyToken(tokenRefresh);
      user = await User.findById(decoded.userId).select("-password");
      if (!user || !user.refreshTokens.includes(tokenRefresh))
        throw new UnauthenticatedError("Refresh token non valido");

      // Genera nuovo access token
      const newAccessToken = createJWTAccess(user._id, user.name);
      res.cookie("jwtAccess", newAccessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 60 * 60 * 1000,
      });
      req.user = user;
      next();
    } catch (err2) {
      // Se anche il refresh token non va, reindirizza a login
      // Puoi loggare l'errore se vuoi
      // console.error(err2);
      res.redirect("/login");
    }
  }
};

module.exports = auth;
