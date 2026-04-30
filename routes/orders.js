const express = require("express");
const router = express.Router();
const Order = require("../models/order");
const Product = require("../models/product");
const jwt = require("jsonwebtoken");

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

router.post("/", verifyToken, async (req, res) => {
  try {
    const { items, totalAmount, shippingCost, priceType, paymentMethod, paymentStatus } = req.body;
    
    // Decrease stock for each item
    for (const item of items) {
      if (item.productId) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: -item.quantity } }
        );
      }
    }

    const order = new Order({
      userId: req.userId,
      items,
      totalAmount,
      shippingCost,
      priceType: priceType || "retail",
      paymentMethod: paymentMethod || "cod",
      paymentStatus: paymentStatus || "pending",
      status: "pending",
    });
    await order.save();
    res.status(201).json({ message: "Order placed successfully!", order });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

router.get("/", verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/cancel", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const hoursDiff = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 5) return res.status(400).json({ message: "Cannot cancel after 5 hours!" });
    if (order.status === "cancelled") return res.status(400).json({ message: "Already cancelled!" });
    if (order.status === "delivered") return res.status(400).json({ message: "Cannot cancel delivered order!" });
    
    // Restore stock on cancel
    for (const item of order.items) {
      if (item.productId) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: item.quantity } }
        );
      }
    }
    
    order.status = "cancelled";
    await order.save();
    res.json({ message: "Order cancelled successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

module.exports = router;
