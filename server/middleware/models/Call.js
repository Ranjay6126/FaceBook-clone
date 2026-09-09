const mongoose = require("mongoose");

const CallSchema = new mongoose.Schema(
  {
    caller: { type: String, required: true, index: true },
    callee: { type: String, required: true, index: true },
    type: { type: String, enum: ["audio", "video"], required: true },
    status: {
      type: String,
      enum: ["ringing", "connected", "ended", "declined"],
      default: "ringing",
      index: true,
    },
    // WebRTC signaling relay: SDP offers/answers + ICE candidates are pushed
    // here and polled by both peers (no socket server needed).
    signals: [
      {
        from: { type: String },
        payload: { type: Object },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Call", CallSchema);
