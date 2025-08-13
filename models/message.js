const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: [true, "please write a message"],
    },
    createdBy: {
      type: String,
      required: [true, "please provide who write down the message"],
    },
    chatAt: {
      type: String,
      required: [true, "please provide chat id where the message belongs"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Message", MessageSchema);
