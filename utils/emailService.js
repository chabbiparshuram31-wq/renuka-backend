const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send order cancellation email
const sendOrderCancellationEmail = async (userEmail, userName, orderDetails) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "Order Cancelled - Renuka DTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fdf0f3; padding: 20px; border-radius: 10px; text-align: center;">
            <h2 style="color: #9b6a2f;">Order Cancelled</h2>
          </div>
          
          <p>Dear <strong>${userName}</strong>,</p>
          
          <p>We regret to inform you that your order has been cancelled by the admin. Here are the details:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
            <p><strong>Order Date:</strong> ${orderDetails.orderDate}</p>
            <p><strong>Total Amount:</strong> ₹${orderDetails.totalAmount}</p>
            <p><strong>Cancellation Reason:</strong> ${orderDetails.cancellationReason || "Cancelled by admin"}</p>
          </div>
          
          <p>If you have any questions or concerns, please contact us.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666;">Thank you for shopping with <strong>Renuka DTP</strong></p>
            <p style="color: #888; font-size: 12px;">This is an automated email. Please do not reply to this email.</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Order cancellation email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending order cancellation email:", error.message);
    return false;
  }
};

module.exports = {
  sendOrderCancellationEmail,
};