const router = require("express").Router();
const Notification = require("../models/Notification");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");

// Attach sender info (username / profilePicture) to every notification
async function enrichNotifications(notifs) {
  const senderIds = [...new Set(notifs.map((n) => String(n.senderId)))];
  const senders = await User.find({ _id: { $in: senderIds } }).select(
    "username profilePicture"
  );
  const map = new Map(senders.map((u) => [String(u._id), u]));
  return notifs.map((n) => {
    const obj = n.toObject();
    const sender = map.get(String(obj.senderId));
    return {
      ...obj,
      senderInfo: sender
        ? {
            _id: sender._id,
            username: sender.username,
            profilePicture: sender.profilePicture,
          }
        : null,
    };
  });
}

// Only friend requests (follows) and post activity (likes / comments)
// belong in the bell - messages have their own Messenger badge.
const BELL_TYPES = { type: { $in: ["follow", "like", "comment"] } };

// MY notifications, newest first
router.get("/", verifyToken, async (req, res) => {
  try {
    const notifs = await Notification.find({
      userId: req.user.id,
      ...BELL_TYPES,
    })
      .sort({ createdAt: -1 })
      .limit(30);
    res.status(200).json(await enrichNotifications(notifs));
  } catch (err) {
    res.status(500).json(err.message || "Failed to load notifications");
  }
});

// Unread count for the bell badge (same filter as the panel)
router.get("/unread/count", verifyToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      read: false,
      ...BELL_TYPES,
    });
    res.status(200).json({ count });
  } catch (err) {
    res.status(500).json(err.message || "Failed to count notifications");
  }
});

// Mark every notification as read
router.put("/read-all", verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.status(200).json("All notifications marked as read");
  } catch (err) {
    res.status(500).json(err.message || "Failed to update notifications");
  }
});

module.exports = router;
