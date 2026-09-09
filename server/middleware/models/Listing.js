const mongoose = require("mongoose");

const ListingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    desc: {
      type: String,
      maxlength: 1000,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: [
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
      ],
      default: "Miscellaneous",
    },
    condition: {
      type: String,
      enum: ["New", "Used - Like New", "Used - Good", "Used - Fair", "For parts"],
      default: "Used - Good",
    },
    location: {
      type: String,
      maxlength: 60,
      default: "",
    },
    img: {
      type: String,
    },
    // Optional product video ("/images/<file>") — max 2 minutes, validated
    // in the create form before upload (same storage bucket as photos).
    video: {
      type: String,
    },
    seller: {
      type: String,
      required: true,
      index: true,
    },
    sold: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Browse feed is newest-first
ListingSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Listing", ListingSchema);
