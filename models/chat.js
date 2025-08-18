const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema(
  {
    isGroup: {
      type: Boolean,
      required: true,
      default: false,
    },
    nameChat: {
      type: String,
      default: "",
    },
    createdBy: {
      type: String,
    },
    members: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Chat", ChatSchema);
