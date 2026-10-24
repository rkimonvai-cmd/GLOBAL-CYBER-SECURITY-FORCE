const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

fs.mkdirSync(path.join(__dirname, "uploads"), { recursive: true });

app.post("/api/submit", upload.fields([
  { name: "profilePhoto", maxCount: 1 },
  { name: "idPhoto", maxCount: 1 },
  { name: "videoVerification", maxCount: 1 }
]), async (req, res) => {
  try {
    const body = req.body || {};
    const files = req.files || {};

    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const gender = String(body.gender || "").trim();
    const address = String(body.address || "").trim();
    const previousGroup = String(body.previousGroup || "").trim();
    const reason = String(body.reason || "").trim();

    if (!fullName || !email || !phone || !gender || !address || !previousGroup || !reason) {
      return res.status(400).json({ success: false, message: "সব ফিল্ড পূরণ করুন" });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(500).json({
        success: false,
        message: "Telegram config missing"
      });
    }

    const text = `
<b>New Membership Request</b>

<b>Name:</b> ${fullName}
<b>Email:</b> ${email}
<b>Phone:</b> ${phone}
<b>Gender:</b> ${gender}
<b>Address:</b> ${address}
<b>Previous Group:</b> ${previousGroup}
<b>Reason:</b> ${reason}
`;

    const messageResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML"
      })
    });

    const messageData = await messageResponse.json();

    if (!messageResponse.ok || !messageData.ok) {
      return res.status(500).json({
        success: false,
        message: "Telegram text send failed",
        details: messageData
      });
    }

    const sendFileList = ["profilePhoto", "idPhoto", "videoVerification"];
    for (const key of sendFileList) {
      const file = files[key]?.[0];
      if (!file) continue;

      const formData = new FormData();
      formData.append("chat_id", String(chatId));
      formData.append(
        "document",
        new Blob([fs.readFileSync(file.path)], { type: file.mimetype || "application/octet-stream" }),
        file.originalname
      );

      await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
        method: "POST",
        body: formData
      });
    }

    return res.json({ success: true, message: "Application submitted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
