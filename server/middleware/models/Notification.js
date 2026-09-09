const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true }, // who receives it
    senderId: { type: String, required: true }, // who triggered it
    type: {
      type: String,
      enum: ["follow", "like", "comment", "message"],
      required: true,
    },
    postId: { type: String },
    text: { type: String, maxlength: 200 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);