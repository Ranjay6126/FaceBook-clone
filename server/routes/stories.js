const router = require("express").Router();
const Story = require("../models/Story");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Attach author info (username / profilePicture) to every story
async function enrichStories(stories) {
  const authorIds = [...new Set(stories.map((s) => String(s.userId)))];
  const authors = await User.find({ _id: { $in: authorIds } }).select(
    "username profilePicture"
  );
  const map = new Map(authors.map((u) => [String(u._id), u]));
  return stories.map((s) => {
    const obj = s.toObject();
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

// Create a story (multipart/form-data with a photo OR video in field "media")
router.post("/", verifyToken, upload.single("media"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json("Pick a photo or video first");
    // The upload field is "media" for both kinds - route by mimetype
    const isVideo = req.file && /^video\//.test(req.file.mimetype);
    const caption =
      typeof req.body.caption === "string"
        ? req.body.caption.trim().slice(0, 100)
        : "";
    const newStory = new Story({
      userId: req.user.id,
      img: req.file && !isVideo ? "/images/" + req.file.filename : undefined,
      video: req.file && isVideo ? "/images/" + req.file.filename : undefined,
      caption,
    });
    const saved = await newStory.save();
    const [enriched] = await enrichStories([saved]);
    res.status(201).json(enriched);
  } catch (err) {
    res.status(500).json(err.message || "Failed to create story");
  }
});

// Get stories from you + people you follow, newest first
router.get("/", verifyToken, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json("User not found");
    const authorIds = [String(me._id), ...me.followings.map(String)];
    const stories = await Story.find({ userId: { $in: authorIds } })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(await enrichStories(stories));
  } catch (err) {
    res.status(500).json(err.message || "Failed to load stories");
  }
});

// Delete a story (owner only)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json("Story not found");
    if (String(story.userId) !== String(req.user.id)) {
      return res.status(403).json("You can delete only your story");
    }
    await story.deleteOne();
    res.status(200).json("The story has been deleted");
  } catch (err) {
    res.status(500).json(err.message || "Delete failed");
  }
});

module.exports = router;