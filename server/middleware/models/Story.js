const mongoose = require("mongoose");

const StorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    // A story carries either a photo (img) or a video - at least one of the
    // two is enforced by the validator below so the tray can render either kind.
    img: { type: String, default: "" },
    video: { type: String, default: "" },
    caption: { type: String, maxlength: 100, default: "" },
  },
  { timestamps: true }
);

// A story must have at least one media attachment (photo OR video)
StorySchema.path("img").validate(function () {
  return Boolean(this.img || this.video);
}, "A story needs a photo or a video");

// Stories automatically disappear 24 hours after creation
StorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

module.exports = mongoose.model("Story", StorySchema);