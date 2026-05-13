const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Order = require("../models/order");
const Product = require("../models/product");
const { sendOrderCancellationEmail } = require("../utils/emailService");

// Middleware to check admin
const isAdmin = (req, res, next) => {
  const adminKey = req.headers["admin-key"];
  if (adminKey !== "renuka-admin-2024") {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// GET dashboard stats
router.get("/stats", isAdmin, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const orders = await Order.find();
    const revenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    res.json({
      totalOrders,
      totalCustomers,
      totalProducts,
      revenue: `₹${revenue.toLocaleString("en-IN")}`,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET all orders
router.get("/orders", isAdmin, async (req, res) => {
  try {
    const orders = await Order.find().populate("userId", "name email").sort({ createdAt: -1 }).limit(20);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE order status
router.put("/orders/:id", isAdmin, async (req, res) => {
  try {
    const { status, cancellationReason } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if order is being cancelled
    const isCancelling = status === "cancelled" && order.status !== "cancelled";
    
    // Update order status
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id, 
      { status, cancellationReason }, 
      { new: true }
    ).populate("userId", "name email");

    // If cancelling, restore stock and send email
    if (isCancelling) {
      // Restore stock
      for (const item of order.items) {
        if (item.productId) {
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: item.quantity } }
          );
        }
      }

      // Send cancellation email to user
      if (order.userId && order.userId.email) {
        await sendOrderCancellationEmail(
          order.userId.email,
          order.userId.name,
          {
            orderId: order._id,
            orderDate: new Date(order.createdAt).toLocaleDateString("en-IN"),
            totalAmount: order.totalAmount,
            cancellationReason: cancellationReason || "Cancelled by admin",
          }
        );
      }
    }

    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET wholesale pending requests
router.get("/wholesale", isAdmin, async (req, res) => {
  try {
    const requests = await User.find({ role: "wholesale" });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// APPROVE or REJECT wholesale
router.put("/wholesale/:id", isAdmin, async (req, res) => {
  try {
    const { status } = req.body; // "approved" or "rejected"
    const user = await User.findByIdAndUpdate(req.params.id, { wholesaleStatus: status }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET all customers
router.get("/customers", isAdmin, async (req, res) => {
  try {
    const customers = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;