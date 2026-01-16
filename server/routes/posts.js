const router = require("express").Router();
const Post = require("../models/Post");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");

// Create a post
router.post("/", verifyToken, async (req, res) => {
  try {
    const newPost = new Post({
      ...req.body,
      userId: req.user.id, // Use authenticated user ID
    });
    const saved = await newPost.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Update a post
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json("Post not found");
    if (String(post.userId) === String(req.user.id)) {
      await post.updateOne({ $set: req.body });
      res.status(200).json("The post has been updated");
    } else {
      res.status(403).json("You can update only your post");
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

// Delete a post
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json("Post not found");
    if (String(post.userId) === String(req.user.id)) {
      await post.deleteOne();
      res.status(200).json("The post has been deleted");
    } else {
      res.status(403).json("You can delete only your post");
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

// Like / dislike a post
router.put("/:id/like", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json("Post not found");
    const userId = String(req.user.id);
    if (!post.likes.map(String).includes(userId)) {
      await post.updateOne({ $push: { likes: userId } });
      res.status(200).json("The post has been liked");
    } else {
      await post.updateOne({ $pull: { likes: userId } });
      res.status(200).json("The post has been disliked");
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get a post
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    res.status(200).json(post);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get timeline posts
router.get("/timeline/:userId", verifyToken, async (req, res) => {
  try {
    // Convert both to strings for comparison
    const userIdParam = String(req.params.userId);
    const userIdToken = String(req.user.id);
    if (userIdParam !== userIdToken) {
      return res.status(403).json("You can only view your own timeline");
    }
    const currentUser = await User.findById(req.params.userId);
    if (!currentUser) return res.status(404).json("User not found");
    // Convert ObjectId to string for query
    const userPosts = await Post.find({ userId: String(currentUser._id) });
    const friendPosts = await Promise.all(
      currentUser.followings.map((friendId) => {
        return Post.find({ userId: String(friendId) });
      })
    );
    res.status(200).json(userPosts.concat(...friendPosts));
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
