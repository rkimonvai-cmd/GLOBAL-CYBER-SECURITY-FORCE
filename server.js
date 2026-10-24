const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({
  dest: path.join(__dirname, 'uploads')
});

fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'server.json'), 'utf8'));
  } catch (error) {
    return {};
  }
}

app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/submit', upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'idPhoto', maxCount: 1 },
  { name: 'videoVerification', maxCount: 1 }
]), async (req, res) => {
  try {
    const body = req.body || {};
    const files = req.files || {};

    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim();
    const phone = String(body.phone || '').trim();
    const address = String(body.address || '').trim();
    const gender = String(body.gender || '').trim();
    const previousGroup = String(body.previousGroup || '').trim();
    const reason = String(body.reason || '').trim();

    if (!fullName || !email || !phone || !address || !gender || !previousGroup || !reason) {
      return res.status(400).json({ success: false, message: 'সব ফিল্ড পূরণ করুন' });
    }

    const config = readConfig();
    const botToken = process.env.TELEGRAM_BOT_TOKEN || config.telegramBotToken;
    const chatId = process.env.TELEGRAM_CHAT_ID || config.telegramChatId;

    if (!botToken || !chatId) {
      return res.status(500).json({
        success: false,
        message: 'Telegram bot token / chat id missing. Fill server.json or env variables.'
      });
    }

    const text = `
<b>New Membership Request</b>

<b>Name:</b> ${fullName}
<b>Email:</b> ${email}
<b>Phone:</b> ${phone}
<b>Gender:</b> ${gender}
<b>Address:</b> ${address}
<b>Previous Group:</b> ${previousGroup === 'yes' ? 'Yes' : 'No'}
<b>Reason:</b> ${reason}
`;

    const sendMessage = async () => {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML'
        })
      });
      return response;
    };

    const sendFiles = async () => {
      const fileEntries = ['profilePhoto', 'idPhoto', 'videoVerification'];
      for (const key of fileEntries) {
        const file = files[key]?.[0];
        if (!file) continue;

        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('document', new Blob([fs.readFileSync(file.path)], { type: file.mimetype || 'application/octet-stream' }), file.originalname);

        await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
          method: 'POST',
          body: form
        });
      }
    };

    const messageResp = await sendMessage();
    const messageData = await messageResp.json();

    if (!messageResp.ok || !messageData.ok) {
      return res.status(500).json({
        success: false,
        message: 'Telegram message failed',
        details: messageData
      });
    }

    await sendFiles();

    return res.json({
      success: true,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
