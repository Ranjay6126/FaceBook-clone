const router = require("express").Router();
const Message = require("../models/Message");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { verifyToken } = require("../middleware/auth");
const upload = require("../middleware/upload");

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
    const msg = await Message.create({
      sender: me,
      receiver,
      text,
      img: req.file && !isVideo ? "/images/" + req.file.filename : undefined,
      video: req.file && isVideo ? "/images/" + req.file.filename : undefined,
      read: false,
    });

    // Bell notification for the recipient - but only ONE unread one per
    // sender, so rapid-fire messages don't flood the notifications panel
    const existing = await Notification.findOne({
      userId: receiver,
      senderId: me,
      type: "message",
      read: false,
    });
    if (!existing) {
      await Notification.create({
        userId: receiver,
        senderId: me,
        type: "message",
        text: (text || (isVideo ? "🎬 Video" : "📷 Photo")).slice(0, 120),
      });
    }

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
