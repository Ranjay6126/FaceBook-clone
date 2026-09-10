const router = require("express").Router();
const User = require("../models/User");
const Notification = require("../models/Notification");
const { verifyToken } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Friend suggestions for the logged-in user.
// NOTE: must be registered BEFORE "/:id" so "suggestions" isn't treated as an id.
router.get("/suggestions/me", verifyToken, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json("User not found");
    const exclude = [String(me._id), ...me.followings.map(String)];
    const users = await User.find({ _id: { $nin: exclude } })
      .select("username profilePicture city")
      .limit(20);
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json(err.message || "Failed to load suggestions");
  }
});

// Search users by username (used by the header search bar)
router.get("/search", verifyToken, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(200).json([]);
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const users = await User.find({ username: new RegExp(escaped, "i") })
      .select("username profilePicture")
      .limit(8);
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json(err.message || "Search failed");
  }
});

// Update MY profile (bio, city, from + profile/cover pictures).
// NOTE: must be registered BEFORE "/:id" so "update" isn't treated as an id.
router.put(
  "/update/me",
  verifyToken,
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "coverPicture", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const updates = {};
      for (const f of ["desc", "city", "from"]) {
        if (typeof req.body[f] === "string") updates[f] = req.body[f].slice(0, 50);
      }
      if (req.files?.profilePicture?.[0])
        updates.profilePicture = "/images/" + req.files.profilePicture[0].filename;
      if (req.files?.coverPicture?.[0])
        updates.coverPicture = "/images/" + req.files.coverPicture[0].filename;

      const user = await User.findByIdAndUpdate(req.user.id, updates, {
        new: true,
      }).select("-password");
      if (!user) return res.status(404).json("User not found");
      res.status(200).json(user);
    } catch (err) {
      res.status(500).json(err.message || "Update failed");
    }
  }
);

// Get a user by id
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json("User not found");
    const { password, ...others } = user._doc;
    res.status(200).json(others);
  } catch (err) {
    res.status(500).json(err.message || "Failed to load user");
  }
});

// Follow a user
router.put("/:id/follow", verifyToken, async (req, res) => {
  if (req.user.id === req.params.id) return res.status(400).json("Cannot follow yourself");
  try {
    const user = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);
    if (!user) return res.status(404).json("User not found");
    if (!currentUser) return res.status(404).json("Current user not found");
    if (!user.followers.includes(req.user.id)) {
      await user.updateOne({ $push: { followers: req.user.id } });
      await currentUser.updateOne({ $push: { followings: req.params.id } });
      // Friend-request style notification for the person being followed
      await Notification.create({
        userId: req.params.id,
        senderId: req.user.id,
        type: "follow",
      });
      res.status(200).json("User has been followed");
    } else {
      res.status(400).json("You already follow this user");
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

// Unfollow a user
router.put("/:id/unfollow", verifyToken, async (req, res) => {
  if (req.user.id === req.params.id) return res.status(400).json("Cannot unfollow yourself");
  try {
    const user = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);
    if (!user) return res.status(404).json("User not found");
    if (!currentUser) return res.status(404).json("Current user not found");
    if (user.followers.includes(req.user.id)) {
      await user.updateOne({ $pull: { followers: req.user.id } });
      await currentUser.updateOne({ $pull: { followings: req.params.id } });
      res.status(200).json("User has been unfollowed");
    } else {
      res.status(400).json("You do not follow this user");
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
