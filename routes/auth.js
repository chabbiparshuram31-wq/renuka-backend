const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");

// Store OTPs temporarily
const otpStore = {};

// Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
// Send OTP email
const sendOtpEmail = async (email, otp, name) => {
  const mailOptions = {
    from: `"Renuka D.T.P Printers" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🔐 Your OTP for Password Reset - Renuka D.T.P Printers",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e8d5c4; border-radius: 12px;">
        <div style="text-align: center; background-color: #2a1a0e; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #9b6a2f; margin: 0;">Renuka D.T.P Printers</h2>
          <p style="color: #888; margin: 4px 0 0;">Quality Wedding Cards & Printing Services</p>
        </div>
        <h3 style="color: #2a1a0e;">Hello ${name || "User"},</h3>
        <p style="color: #666;">We received a request to reset your password. Use the OTP below:</p>
        <div style="text-align: center; background-color: #fdf0f3; padding: 24px; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #9b6a2f; font-size: 48px; letter-spacing: 12px; margin: 0;">${otp}</h1>
          <p style="color: #888; margin: 8px 0 0;">Valid for 10 minutes</p>
        </div>
        <p style="color: #666;">If you did not request a password reset, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e8d5c4; margin: 20px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">© 2024 Renuka D.T.P Printers. All rights reserved.</p>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
};

// Send verification email
const sendVerificationEmail = async (email, token, name) => {
  const verificationUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${token}`;
  const mailOptions = {
    from: '"Renuka D.T.P Printers" <renuka19135505@gmail.com>',
    to: email,
    subject: "✅ Verify Your Email - Renuka D.T.P Printers",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e8d5c4; border-radius: 12px;">
        <div style="text-align: center; background-color: #2a1a0e; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #9b6a2f; margin: 0;">Renuka D.T.P Printers</h2>
          <p style="color: #888; margin: 4px 0 0;">Quality Wedding Cards & Printing Services</p>
        </div>
        <h3 style="color: #2a1a0e;">Hello ${name},</h3>
        <p style="color: #666;">Welcome! Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #9b6a2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email</a>
        </div>
        <p style="color: #666;">Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #9b6a2f;">${verificationUrl}</p>
        <p style="color: #666;">This link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #e8d5c4; margin: 20px 0;">
        <p style="color: #aaa; font-size: 12px; text-align: center;">© 2024 Renuka D.T.P Printers. All rights reserved.</p>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
};

// REGISTER
router.post("/register", async (req, res) => {
  const { name, email, phone, password, role, businessName, gstNumber, address } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered!" });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    
    const user = new User({
      name, email, phone,
      password: hashedPassword,
      role: role || "retail",
      businessName, gstNumber, address,
      isVerified: false,
      verificationToken
    });
    await user.save();
    
    await sendVerificationEmail(email, verificationToken, name);
    res.status(201).json({ message: "Account created! Please check your email to verify your account." });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// VERIFY EMAIL
router.get("/verify-email", async (req, res) => {
  const { token } = req.query;
  try {
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).send("<h2>Invalid or expired verification link!</h2>");
    
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();
    
    res.send(`
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #9b6a2f;">✅ Email Verified Successfully!</h1>
        <p style="color: #444; font-size: 16px;">Your account is now verified.</p>
        <p style="color: #666; font-size: 14px; max-width: 480px; margin: 20px auto; line-height: 1.6;">
          You may now return to the app and sign in with your email and password.
        </p>
      </div>
    `);
  } catch (err) {
    res.status(500).send("<h2>Server error during verification!</h2>");
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (email === "admin@renuka.com" && password === "admin123") {
      const token = jwt.sign({ id: "admin", role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });
      return res.json({ token, role: "admin", name: "Admin" });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email not registered!" });
    if (!user.isVerified) return res.status(400).json({ message: "Please verify your email before logging in!" });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Incorrect password!" });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, role: user.role, name: user.name });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// RESEND VERIFICATION EMAIL
router.post("/resend-verification", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email not registered!" });
    if (user.isVerified) return res.status(400).json({ message: "Email already verified!" });
    
    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    await user.save();
    
    await sendVerificationEmail(email, verificationToken, user.name);
    res.json({ message: "Verification email sent! Please check your inbox." });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// FORGOT PASSWORD - Send OTP
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email not registered!" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expiry: Date.now() + 10 * 60 * 1000 };

    await sendOtpEmail(email, otp, user.name);
    console.log(`OTP for ${email}: ${otp}`);

    res.json({ message: "OTP sent to your email!" });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ message: "Failed to send OTP email. Try again!" });
  }
});

// VERIFY OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const stored = otpStore[email];
    if (!stored) return res.status(400).json({ message: "OTP not found! Please request again." });
    if (Date.now() > stored.expiry) {
      delete otpStore[email];
      return res.status(400).json({ message: "OTP expired! Please request again." });
    }
    if (stored.otp !== otp) return res.status(400).json({ message: "Invalid OTP!" });
    otpStore[email].verified = true;
    res.json({ message: "OTP verified successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const stored = otpStore[email];
    if (!stored || !stored.verified) return res.status(400).json({ message: "Please verify OTP first!" });
    if (Date.now() > stored.expiry) {
      delete otpStore[email];
      return res.status(400).json({ message: "Session expired! Please start again." });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });
    delete otpStore[email];
    res.json({ message: "Password reset successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

module.exports = router;