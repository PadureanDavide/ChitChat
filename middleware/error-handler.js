const { CustomAPIError } = require("../errors");
const { StatusCodes } = require("http-status-codes");

const errorhandler = (err, req, res, next) => {
  console.log(err);
  let customError = {
    statusCode: err.StatusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    msg: err.message || "something went wront, please try again",
  };

  if (err.name === "ValidationError") {
    customError.msg = Object.values(err.errors)
      .map((item) => item.message)
      .join(", ");
    customError.statusCode = 400;
  }

  if (err.code === 11000) {
    customError.msg =
      "this email is already used, please login or user another one";
  }
  return res
    .status(customError.statusCode)
    .json({ statusCode: customError.statusCode, msg: customError.msg });
};

module.exports = errorhandler;
