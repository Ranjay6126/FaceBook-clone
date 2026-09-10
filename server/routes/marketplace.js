const router = require("express").Router();
const Listing = require("../models/Listing");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Mirror of the model enums, used to sanitize multipart form values
const CATEGORIES = [
  "Vehicles",
  "Property Rentals",
  "Property Sales",
  "Apparel",
  "Electronics",
  "Entertainment",
  "Family",
  "Free Stuff",
  "Garden",
  "Hobbies",
  "Home Goods",
  "Home Improvement",
  "Musical Instruments",
  "Office Supplies",
  "Pet Supplies",
  "Sporting Goods",
  "Tickets",
  "Toys & Games",
  "Video Games",
  "Miscellaneous",
];
const CONDITIONS = ["New", "Used - Like New", "Used - Good", "Used - Fair", "For parts"];

// Attach seller info (username / profilePicture / city) to every listing
async function enrichListings(listings) {
  const sellerIds = [...new Set(listings.map((l) => String(l.seller)))];
  const sellers = await User.find({ _id: { $in: sellerIds } }).select(
    "username profilePicture city"
  );
  const map = new Map(sellers.map((u) => [String(u._id), u]));
  return listings.map((l) => {
    const obj = l.toObject();
    const seller = map.get(String(obj.seller));
    return {
      ...obj,
      sellerInfo: seller
        ? {
            _id: seller._id,
            username: seller.username,
            profilePicture: seller.profilePicture,
            city: seller.city || "",
          }
        : null,
    };
  });
}

// Create a listing (multipart/form-data, optional photo OR video in field "img").
// Videos are limited to 2 minutes — enforced client-side before upload
// (browsers can't read duration on the server without extra tooling).
router.post("/", verifyToken, upload.single("img"), async (req, res) => {
  try {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const price = Number(req.body.price);

    if (!title) return res.status(400).json("Title is required");
    if (!Number.isFinite(price) || price < 0)
      return res.status(400).json("A valid price is required");

    // The upload field is "img" for both kinds - route by mimetype
    const isVideo = req.file && /^video\//.test(req.file.mimetype);

    const newListing = new Listing({
      title: title.slice(0, 100),
      desc:
        typeof req.body.desc === "string"
          ? req.body.desc.trim().slice(0, 1000)
          : "",
      price,
      category: CATEGORIES.includes(req.body.category)
        ? req.body.category
        : "Miscellaneous",
      condition: CONDITIONS.includes(req.body.condition)
        ? req.body.condition
        : "Used - Good",
      location:
        typeof req.body.location === "string"
          ? req.body.location.trim().slice(0, 60)
          : "",
      img: req.file && !isVideo ? "/images/" + req.file.filename : undefined,
      video: req.file && isVideo ? "/images/" + req.file.filename : undefined,
      seller: req.user.id,
    });

    const saved = await newListing.save();
    const [enriched] = await enrichListings([saved]);
    res.status(201).json(enriched);
  } catch (err) {
    res.status(500).json(err.message || "Failed to create listing");
  }
});

// Browse all listings, newest first. Optional filters: ?q= and ?category=
router.get("/", verifyToken, async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && CATEGORIES.includes(req.query.category)) {
      filter.category = req.query.category;
    }
    if (req.query.q) {
      const escaped = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: new RegExp(escaped, "i") },
        { desc: new RegExp(escaped, "i") },
      ];
    }
    const listings = await Listing.find(filter)
      .sort({ createdAt: -1 })
      .limit(120);
    res.status(200).json(await enrichListings(listings));
  } catch (err) {
    res.status(500).json(err.message || "Failed to load listings");
  }
});

// MY listings ("Your listings" tab). NOTE: registered before "/:id" patterns.
router.get("/mine", verifyToken, async (req, res) => {
  try {
    const listings = await Listing.find({ seller: req.user.id })
      .sort({ createdAt: -1 })
      .limit(60);
    res.status(200).json(await enrichListings(listings));
  } catch (err) {
    res.status(500).json(err.message || "Failed to load your listings");
  }
});

// Toggle sold / available (owner only)
router.put("/:id/sold", verifyToken, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json("Listing not found");
    if (String(listing.seller) !== String(req.user.id))
      return res.status(403).json("You can update only your listing");
    await listing.updateOne({ $set: { sold: !listing.sold } });
    res.status(200).json({ sold: !listing.sold });
  } catch (err) {
    res.status(500).json(err.message || "Failed to update listing");
  }
});

// Delete a listing (owner or admin)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json("Listing not found");
    if (
      String(listing.seller) !== String(req.user.id) &&
      !req.user.isAdmin
    )
      return res.status(403).json("You can delete only your listing");
    await listing.deleteOne();
    res.status(200).json("The listing has been deleted");
  } catch (err) {
    res.status(500).json(err.message || "Delete failed");
  }
});

module.exports = router;
