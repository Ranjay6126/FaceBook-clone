const router = require("express").Router();
const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { verifyToken } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Attach author info (username / profilePicture) to every post
async function enrichPosts(posts) {
  const authorIds = [...new Set(posts.map((p) => String(p.userId)))];
  const authors = await User.find({ _id: { $in: authorIds } }).select(
    "username profilePicture"
  );
  const map = new Map(authors.map((u) => [String(u._id), u]));
  return posts.map((p) => {
    const obj = p.toObject();
    const author = map.get(String(obj.userId));
    return {
      ...obj,
      userInfo: author
        ? {
            _id: author._id,
            username: author.username,
            profilePicture: author.profilePicture,
          }
        : null,
    };
  });
}

// Create a post (accepts JSON, or multipart/form-data with an image OR video in field "img")
router.post("/", verifyToken, upload.single("img"), async (req, res) => {
  try {
    const desc = typeof req.body.desc === "string" ? req.body.desc.trim() : "";
    if (!desc && !req.file) {
      return res.status(400).json("Post must have text, a photo or a video");
    }
    // The upload field is "img" for both kinds - route by mimetype
    const isVideo = req.file && /^video\//.test(req.file.mimetype);
    // Only accept known fields - never trust client-sent userId / likes / comments
    const newPost = new Post({
      desc,
      img: req.file && !isVideo ? "/images/" + req.file.filename : undefined,
      video: req.file && isVideo ? "/images/" + req.file.filename : undefined,
      userId: req.user.id,
    });
    const saved = await newPost.save();
    const [enriched] = await enrichPosts([saved]);
    res.status(201).json(enriched);
  } catch (err) {
    res.status(500).json(err.message || "Failed to create post");
  }
});

// Update a post (owner only)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json("Post not found");
    if (String(post.userId) === String(req.user.id)) {
      const allowed = {};
      if (typeof req.body.desc === "string") allowed.desc = req.body.desc;
      if (typeof req.body.img === "string") allowed.img = req.body.img;
      await post.updateOne({ $set: allowed });
      res.status(200).json("The post has been updated");
    } else {
      res.status(403).json("You can update only your post");
    }
  } catch (err) {
    res.status(500).json(err.message || "Update failed");
  }
});

// Delete a post (owner or admin)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json("Post not found");
    if (
      String(post.userId) === String(req.user.id) ||
      req.user.isAdmin
    ) {
      await post.deleteOne();
      res.status(200).json("The post has been deleted");
    } else {
      res.status(403).json("You can delete only your post");
    }
  } catch (err) {
    res.status(500).json(err.message || "Delete failed");
  }
});

// Like / unlike a post
router.put("/:id/like", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json("Post not found");
    const userId = String(req.user.id);
    if (!post.likes.map(String).includes(userId)) {
      await post.updateOne({ $push: { likes: userId } });
      // Notify the author (unless they liked their own post)
      if (String(post.userId) !== userId) {
        await Notification.create({
          userId: post.userId,
          senderId: req.user.id,
          type: "like",
          postId: String(post._id),
        });
      }
      res.status(200).json("The post has been liked");
    } else {
      await post.updateOne({ $pull: { likes: userId } });
      res.status(200).json("The post has been unliked");
    }
  } catch (err) {
    res.status(500).json(err.message || "Like failed");
  }
});

// Add a comment to a post
router.post("/:id/comment", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json("Post not found");
    const text = (req.body.text || "").trim();
    if (!text) return res.status(400).json("Comment cannot be empty");
    if (text.length > 300) return res.status(400).json("Comment is too long");

    const author = await User.findById(req.user.id).select("username");
    post.comments.push({
      userId: req.user.id,
      username: author ? author.username : "Facebook User",
      text,
    });
    await post.save();
    // Notify the author (unless they commented on their own post)
    if (String(post.userId) !== String(req.user.id)) {
      await Notification.create({
        userId: post.userId,
        senderId: req.user.id,
        type: "comment",
        postId: String(post._id),
        text: text.slice(0, 120),
      });
    }
    const [enriched] = await enrichPosts([post]);
    res.status(201).json(enriched);
  } catch (err) {
    res.status(500).json(err.message || "Comment failed");
  }
});

// Get timeline posts (own posts + people you follow), newest first
router.get("/timeline/:userId", verifyToken, async (req, res) => {
  try {
    if (String(req.params.userId) !== String(req.user.id)) {
      return res.status(403).json("You can only view your own timeline");
    }
    const currentUser = await User.findById(req.params.userId);
    if (!currentUser) return res.status(404).json("User not found");

    const authorIds = [
      String(currentUser._id),
      ...currentUser.followings.map(String),
    ];
    // Optional ?media=video|image filter (the Reels feed is videos only)
    const mediaFilter = {};
    if (req.query.media === "video")
      mediaFilter.video = { $exists: true, $ne: "" };
    if (req.query.media === "image")
      mediaFilter.img = { $exists: true, $ne: "" };

    const posts = await Post.find({
      userId: { $in: authorIds },
      ...mediaFilter,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const enriched = await enrichPosts(posts);
    res.status(200).json(enriched);
  } catch (err) {
    res.status(500).json(err.message || "Failed to load timeline");
  }
});

// Get all posts by a specific user (used by Profile pages)
router.get("/user/:userId", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    const enriched = await enrichPosts(posts);
    res.status(200).json(enriched);
  } catch (err) {
    res.status(500).json(err.message || "Failed to load user posts");
  }
});

// Get a single post
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json("Post not found");
    const [enriched] = await enrichPosts([post]);
    res.status(200).json(enriched);
  } catch (err) {
    res.status(500).json(err.message || "Failed to load post");
  }
});

module.exports = router;
