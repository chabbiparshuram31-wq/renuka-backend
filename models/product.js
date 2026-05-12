const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  retailPrice: { type: Number, required: true },
  wholesalePrice: { type: Number, required: true },
  material: { type: String },
  size: { type: String },
  minOrder: { type: Number, default: 50 },
  tag: { type: String },
  image: { type: String, default: "" },
  stock: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);