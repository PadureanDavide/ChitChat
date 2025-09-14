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
        userId: {
          type: String,
          required: true,
        },
        numUnreadMessages: {
          type: Number,
          default: 0,
        },
        exitFromSingleChat: {
          type: Boolean,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Chat", ChatSchema);
