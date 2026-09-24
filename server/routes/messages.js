const router = require("express").Router();
const crypto = require("crypto");
const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { verifyToken } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { saveUploadedMedia, saveUploadedMediaChunks } = require("../utils/media");

const MESSAGE_CHUNK_BYTES = 3 * 1024 * 1024;
const MAX_MESSAGE_MEDIA_BYTES = 50 * 1024 * 1024;
const UPLOAD_TTL_SECONDS = 24 * 60 * 60;

async function createMessage({ sender, receiver, text, mediaUrl = "", isVideo = false }) {
  const msg = await Message.create({
    sender,
    receiver,
    text,
    img: mediaUrl && !isVideo ? mediaUrl : undefined,
    video: mediaUrl && isVideo ? mediaUrl : undefined,
    read: false,
  });

  const existing = await Notification.findOne({
    userId: receiver,
    senderId: sender,
    type: "message",
    read: false,
  });
  if (!existing) {
    await Notification.create({
      userId: receiver,
      senderId: sender,
      type: "message",
      text: (text || (isVideo ? "🎬 Video" : "📷 Photo")).slice(0, 120),
    });
  }
  return msg;
}

function uploadCollections() {
  const db = mongoose.connection.db;
  return {
    sessions: db.collection("message_upload_sessions"),
    chunks: db.collection("message_upload_chunks"),
  };
}

// Large attachments are uploaded in small requests so they fit Vercel's body limit.
router.post("/upload/start", verifyToken, async (req, res) => {
  try {
    const receiver = String(req.body.receiver || "");
    const contentType = String(req.body.contentType || "");
    const count = Number(req.body.totalChunks);
    const size = Number(req.body.size);
    const text = String(req.body.text || "").trim();
    if (!receiver || receiver === String(req.user.id)) return res.status(400).json({ message: "Invalid receiver" });
    if (!/^(image|video)\//.test(contentType)) return res.status(400).json({ message: "Choose an image or video" });
    if (!Number.isInteger(count) || count < 1 || count > 18 || !Number.isInteger(size) || size < 1 || size > MAX_MESSAGE_MEDIA_BYTES) {
      return res.status(400).json({ message: "Attachments must be 50 MB or smaller" });
    }
    if (text.length > 2000) return res.status(400).json({ message: "Message is too long" });
    if (!(await User.exists({ _id: receiver }))) return res.status(404).json({ message: "User not found" });

    const { sessions, chunks } = uploadCollections();
    await Promise.all([
      sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: UPLOAD_TTL_SECONDS }),
      chunks.createIndex({ createdAt: 1 }, { expireAfterSeconds: UPLOAD_TTL_SECONDS }),
    ]);
    const uploadId = crypto.randomUUID();
    await sessions.insertOne({
      _id: uploadId,
      sender: String(req.user.id),
      receiver,
      text,
      filename: String(req.body.filename || "attachment").slice(0, 180),
      contentType,
      totalChunks: count,
      size,
      createdAt: new Date(),
    });
    res.status(201).json({ uploadId });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not start attachment upload" });
  }
});

router.post("/upload/:uploadId/chunk/:index", verifyToken, upload.single("chunk"), async (req, res) => {
  try {
    const { sessions, chunks } = uploadCollections();
    const session = await sessions.findOne({ _id: req.params.uploadId, sender: String(req.user.id) });
    const index = Number(req.params.index);
    if (!session) return res.status(404).json({ message: "Attachment upload expired" });
    if (!req.file?.buffer || !Number.isInteger(index) || index < 0 || index >= session.totalChunks) {
      return res.status(400).json({ message: "Invalid attachment upload chunk" });
    }
    if (req.file.size > MESSAGE_CHUNK_BYTES) return res.status(413).json({ message: "Attachment part is too large" });
    await chunks.replaceOne(
      { _id: `${session._id}:${index}` },
      { _id: `${session._id}:${index}`, uploadId: session._id, index, sender: session.sender, data: req.file.buffer, createdAt: new Date() },
      { upsert: true }
    );
    res.status(200).json({ uploaded: index + 1, total: session.totalChunks });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not save attachment part" });
  }
});

router.post("/upload/:uploadId/complete", verifyToken, async (req, res) => {
  try {
    const { sessions, chunks: chunkCollection } = uploadCollections();
    const session = await sessions.findOne({ _id: req.params.uploadId, sender: String(req.user.id) });
    if (!session) return res.status(404).json({ message: "Attachment upload expired" });
    const chunks = await chunkCollection.find({ uploadId: session._id, sender: session.sender }).sort({ index: 1 }).toArray();
    const receivedBytes = chunks.reduce((sum, chunk) => sum + (Buffer.isBuffer(chunk.data) ? chunk.data.length : chunk.data.position), 0);
    if (chunks.length !== session.totalChunks || chunks.some((chunk, i) => chunk.index !== i) || receivedBytes !== session.size) {
      return res.status(400).json({ message: "Some attachment parts are missing. Please try again." });
    }
    const partner = await User.findById(session.receiver);
    if (!partner) return res.status(404).json({ message: "User not found" });
    const isVideo = /^video\//.test(session.contentType);
    const mediaUrl = await saveUploadedMediaChunks(chunks, session.filename, session.contentType, "messages");
    const msg = await createMessage({ sender: session.sender, receiver: session.receiver, text: session.text, mediaUrl, isVideo });
    await Promise.all([sessions.deleteOne({ _id: session._id }), chunkCollection.deleteMany({ uploadId: session._id })]);
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not finish attachment upload" });
  }
});

// Send a message (JSON text, or multipart/form-data with a photo OR video
// in field "file" plus optional text)
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  try {
    const me = String(req.user.id);
    const receiver = String(req.body.receiver || "");
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";

    if (!receiver || receiver === me)
      return res.status(400).json("Invalid receiver");
    if (!text && !req.file)
      return res.status(400).json("Message cannot be empty");
    if (text.length > 2000) return res.status(400).json("Message is too long");

    const partner = await User.findById(receiver);
    if (!partner) return res.status(404).json("User not found");

    // The upload field is "file" for both kinds - route by mimetype
    const isVideo = req.file && /^video\//.test(req.file.mimetype);
    const mediaUrl = req.file ? await saveUploadedMedia(req.file, "messages") : "";
    const msg = await createMessage({ sender: me, receiver, text, mediaUrl, isVideo });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json(err.message || "Failed to send message");
  }
});

// Recent conversations (for the header dropdown + Messenger inbox page).
// Returns the partner user, the latest message and the unread count each.
router.get("/conversations", verifyToken, async (req, res) => {
  try {
    const me = String(req.user.id);
    const msgs = await Message.find({ $or: [{ sender: me }, { receiver: me }] })
      .sort({ createdAt: -1 })
      .limit(500);

    const partnerIds = [
      ...new Set(msgs.map((m) => (m.sender === me ? m.receiver : m.sender))),
    ];
    if (partnerIds.length === 0) return res.status(200).json([]);

    const users = await User.find({ _id: { $in: partnerIds } }).select(
      "username profilePicture"
    );
    const umap = new Map(users.map((u) => [String(u._id), u]));

    const convos = partnerIds
      .map((pid) => {
        // msgs are newest-first, so the first match is the latest message
        const last = msgs.find(
          (m) => (m.sender === me ? m.receiver : m.sender) === pid
        );
        const unread = msgs.filter(
          (m) => m.receiver === me && m.sender === pid && !m.read
        ).length;
        const u = umap.get(pid);
        return {
          partner: u
            ? {
                _id: u._id,
                username: u.username,
                profilePicture: u.profilePicture,
              }
            : { _id: pid, username: "Deleted User", profilePicture: "" },
          lastMessage: last
            ? {
                text:
                  last.text ||
                  (last.video ? "🎬 Video" : last.img ? "📷 Photo" : ""),
                mine: last.sender === me,
                createdAt: last.createdAt,
              }
            : null,
          unread,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.lastMessage?.createdAt || 0) -
          new Date(a.lastMessage?.createdAt || 0)
      );

    res.status(200).json(convos);
  } catch (err) {
    res.status(500).json(err.message || "Failed to load conversations");
  }
});

// Total unread count for the header badge
router.get("/unread/count", verifyToken, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: String(req.user.id),
      read: false,
    });
    res.status(200).json({ count });
  } catch (err) {
    res.status(500).json(err.message || "Failed to count unread messages");
  }
});

// Full thread with one person, oldest -> newest.
// Reading the thread also marks their messages as read.
router.get("/thread/:otherUserId", verifyToken, async (req, res) => {
  try {
    const me = String(req.user.id);
    const other = String(req.params.otherUserId);

    await Message.updateMany(
      { sender: other, receiver: me, read: false },
      { $set: { read: true } }
    );

    const msgs = await Message.find({
      $or: [
        { sender: me, receiver: other },
        { sender: other, receiver: me },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(200);

    res.status(200).json(msgs);
  } catch (err) {
    res.status(500).json(err.message || "Failed to load thread");
  }
});

module.exports = router;
