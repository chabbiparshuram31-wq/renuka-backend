const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// GET profile
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE profile
router.put("/", verifyToken, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, phone, address },
      { new: true }
    ).select("-password");
    res.json({ message: "Profile updated!", user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// CHANGE PASSWORD
router.put("/change-password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: "Current password is incorrect!" });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.userId, { password: hashedPassword });
    res.json({ message: "Password changed successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET addresses
router.get("/addresses", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("addresses");
    res.json(user?.addresses || []);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ADD address
router.post("/addresses", verifyToken, async (req, res) => {
  try {
    const { name, phone, address, city, pincode, isDefault } = req.body;
    const user = await User.findById(req.userId);
    if (!user.addresses) user.addresses = [];
    if (isDefault) user.addresses.forEach((a) => a.isDefault = false);
    user.addresses.push({ name, phone, address, city, pincode, isDefault });
    await user.save();
    res.json({ message: "Address added!", addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE address
router.delete("/addresses/:index", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    user.addresses.splice(req.params.index, 1);
    await user.save();
    res.json({ message: "Address deleted!", addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;