const router = require("express").Router();
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");

// Get a user by id
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json("User not found");
    const { password, ...others } = user._doc;
    res.status(200).json(others);
  } catch (err) {
    res.status(500).json(err);
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
