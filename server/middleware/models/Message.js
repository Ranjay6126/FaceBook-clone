const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true, index: true },
    receiver: { type: String, required: true, index: true },
    text: { type: String, maxlength: 2000, default: "" },
    img: { type: String },
    video: { type: String },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Fast lookup of a two-person thread, newest first
MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

module.exports = mongoose.model("Message", MessageSchema);