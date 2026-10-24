export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Only POST allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

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

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(500).json({
        success: false,
        message: 'Telegram credentials missing. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Vercel env.'
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

    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      })
    });

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok || !telegramData.ok) {
      return res.status(500).json({
        success: false,
        message: 'Telegram send failed',
        details: telegramData
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
