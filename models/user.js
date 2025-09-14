const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "please provide name"],
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "please provide email"],
      minlength: 3,
      maxlength: 50,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "please provide valid email",
      ],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "please provide password"],
      minlength: [6, "password must be at lease 6 characters long"],
    },
    refreshTokens: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

UserSchema.pre("save", async function () {
  // Questo if mancante causa re-hashing non necessario
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

//compare the password given with the one saved on the database
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
