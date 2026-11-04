const nodemailer = require("nodemailer");
const axios = require("axios");

const SENDER_NAME = "StockLab";
const senderEmail = () => process.env.EMAIL_FROM || process.env.EMAIL_USER;

let transporter;
const smtpTransport = () => {
  transporter ||= nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
};

// Render's free tier blocks outbound SMTP, so when BREVO_API_KEY is set mail
// goes out over Brevo's HTTPS API. Locally, Gmail SMTP still works.
const deliver = async ({ to, subject, html }) => {
  if (process.env.BREVO_API_KEY) {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: SENDER_NAME, email: senderEmail() },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json",
          accept: "application/json",
        },
        timeout: 10000,
      },
    );
    return;
  }
  await smtpTransport().sendMail({
    from: `"${SENDER_NAME}" <${senderEmail()}>`,
    to,
    subject,
    html,
  });
};

// User-supplied text (names) must not become HTML in our emails
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const sendOTP = async (email, otp, purpose) => {
  const isVerify = purpose === "verify";
  const subject = isVerify
    ? "Verify Your StockLab Account"
    : "Reset Your StockLab Password";
  const title = isVerify ? "Verify Your Email" : "Reset Your Password";
  const message = isVerify
    ? "Use the OTP below to verify your StockLab account. This OTP is valid for <strong>10 minutes</strong>."
    : "Use the OTP below to reset your StockLab password. This OTP is valid for <strong>10 minutes</strong>.";

  const mailOptions = {
    to: email,
    subject: subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#0f172a; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color:#1e293b; border-radius:16px; overflow:hidden; border: 1px solid #334155;">
          <tr>
            <td style="background: linear-gradient(135deg, #166534, #15803d); padding: 32px; text-align:center;">
              <h1 style="margin:0; font-size:28px; color:white; letter-spacing:1px;">
                Stock<span style="color:#4ade80;">Lab</span>
              </h1>
              <p style="margin:8px 0 0; color:#bbf7d0; font-size:14px;">Practice Trading Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin:0 0 16px; color:white; font-size:20px;">${title}</h2>
              <p style="margin:0 0 28px; color:#94a3b8; font-size:15px; line-height:1.6;">${message}</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 24px; background-color:#0f172a; border-radius:12px; border: 1px solid #334155;">
                    <p style="margin:0 0 8px; color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:2px;">Your OTP Code</p>
                    <p style="margin:0; font-size:42px; font-weight:bold; color:#4ade80; letter-spacing:12px;">${otp}</p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="padding:16px; background-color:#1a2744; border-radius:8px; border-left:4px solid #3b82f6;">
                    <p style="margin:0; color:#93c5fd; font-size:13px;">
                      ⏰ This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0; color:#64748b; font-size:13px;">
                If you did not request this, please ignore this email. Your account is safe.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px; background-color:#0f172a; border-top:1px solid #1e293b; text-align:center;">
              <p style="margin:0; color:#475569; font-size:12px;">
                Made with ❤️ by <span style="color:#4ade80; font-weight:bold;">Ashutosh</span>
              </p>
              <p style="margin:6px 0 0; color:#334155; font-size:11px;">
                © 2024 StockLab — Practice trading with real NSE prices
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
  await deliver(mailOptions);
};

const sendPriceAlert = async (
  email,
  name,
  symbol,
  companyName,
  targetPrice,
  currentPrice,
  condition,
) => {
  const subject = `🔔 Price Alert — ${symbol} has ${condition === "above" ? "crossed above" : "dropped below"} ₹${targetPrice}`;
  const mailOptions = {
    to: email,
    subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0; padding:0; background-color:#0f172a; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background-color:#1e293b; border-radius:16px; overflow:hidden; border: 1px solid #334155;">
        <tr>
          <td style="background: linear-gradient(135deg, #166534, #15803d); padding: 32px; text-align:center;">
            <h1 style="margin:0; font-size:28px; color:white;">Stock<span style="color:#4ade80;">Lab</span></h1>
            <p style="margin:8px 0 0; color:#bbf7d0; font-size:14px;">Price Alert Triggered 🔔</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 36px 32px;">
            <h2 style="margin:0 0 8px; color:white; font-size:20px;">Hi ${escapeHtml(name)},</h2>
            <p style="margin:0 0 24px; color:#94a3b8; font-size:15px;">
              Your price alert for <strong style="color:white;">${companyName} (${symbol})</strong> has been triggered.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a; border-radius:12px; border: 1px solid #334155; overflow:hidden;">
              <tr><td style="padding:20px 24px; border-bottom:1px solid #1e293b;">
                <p style="margin:0; color:#64748b; font-size:12px; text-transform:uppercase;">Stock</p>
                <p style="margin:4px 0 0; color:white; font-size:18px; font-weight:bold;">${symbol}</p>
                <p style="margin:2px 0 0; color:#94a3b8; font-size:13px;">${companyName}</p>
              </td></tr>
              <tr><td style="padding:20px 24px; border-bottom:1px solid #1e293b;">
                <p style="margin:0; color:#64748b; font-size:12px; text-transform:uppercase;">Current Price</p>
                <p style="margin:4px 0 0; color:#4ade80; font-size:28px; font-weight:bold;">₹${currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </td></tr>
              <tr><td style="padding:20px 24px;">
                <p style="margin:0; color:#64748b; font-size:12px; text-transform:uppercase;">Your Target</p>
                <p style="margin:4px 0 0; color:#f97316; font-size:20px; font-weight:bold;">
                  ₹${targetPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span style="font-size:14px; color:#94a3b8; font-weight:normal;">(${condition === "above" ? "Above" : "Below"})</span>
                </p>
              </td></tr>
            </table>
            <p style="margin:24px 0 0; color:#64748b; font-size:13px;">This alert has been removed from your active alerts.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px; background-color:#0f172a; border-top:1px solid #1e293b; text-align:center;">
            <p style="margin:0; color:#475569; font-size:12px;">Made with ❤️ by <span style="color:#4ade80; font-weight:bold;">Ashutosh</span></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
  await deliver(mailOptions);
};

// ── Circuit Breaker Alert Email ──────────────────────────────────
const sendCircuitAlert = async (
  email,
  name,
  symbol,
  companyName,
  currentPrice,
  changePercent,
  circuitType,
) => {
  const isUpper = circuitType === "upper";
  const subject = `⚡ Circuit Breaker — ${symbol} hit ${isUpper ? "Upper" : "Lower"} Circuit!`;
  const circuitColor = isUpper ? "#16a34a" : "#dc2626";
  const circuitEmoji = isUpper ? "🟢" : "🔴";
  const circuitLabel = isUpper ? "UPPER CIRCUIT" : "LOWER CIRCUIT";
  const circuitDesc = isUpper
    ? "Stock has hit the upper price limit. Trading is heavily restricted — buyers cannot find sellers."
    : "Stock has hit the lower price limit. Trading is heavily restricted — sellers cannot find buyers.";

  const mailOptions = {
    to: email,
    subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0; padding:0; background-color:#0f172a; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background-color:#1e293b; border-radius:16px; overflow:hidden; border: 1px solid #334155;">

        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, ${isUpper ? "#14532d, #15803d" : "#7f1d1d, #b91c1c"}); padding: 32px; text-align:center;">
            <h1 style="margin:0; font-size:28px; color:white;">Stock<span style="color:#4ade80;">Lab</span></h1>
            <p style="margin:8px 0 0; color:${isUpper ? "#bbf7d0" : "#fecaca"}; font-size:14px;">
              ${circuitEmoji} Circuit Breaker Alert
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding: 36px 32px;">
            <h2 style="margin:0 0 8px; color:white; font-size:20px;">Hi ${escapeHtml(name)},</h2>
            <p style="margin:0 0 24px; color:#94a3b8; font-size:15px; line-height:1.6;">
              <strong style="color:white;">${companyName} (${symbol})</strong> has hit the
              <strong style="color:${circuitColor};">${circuitLabel}</strong> today.
            </p>

            <!-- Circuit Info Box -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background-color:${isUpper ? "#052e16" : "#450a0a"}; border-radius:12px; border: 2px solid ${circuitColor}; overflow:hidden; margin-bottom:20px;">
              <tr>
                <td style="padding:20px 24px; text-align:center;">
                  <p style="margin:0; font-size:40px;">${circuitEmoji}</p>
                  <p style="margin:8px 0 0; color:${circuitColor}; font-size:20px; font-weight:bold;">${circuitLabel}</p>
                  <p style="margin:8px 0 0; color:#94a3b8; font-size:13px;">${circuitDesc}</p>
                </td>
              </tr>
            </table>

            <!-- Price Details -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background-color:#0f172a; border-radius:12px; border: 1px solid #334155; overflow:hidden;">
              <tr>
                <td style="padding:16px 24px; border-bottom:1px solid #1e293b;">
                  <p style="margin:0; color:#64748b; font-size:12px; text-transform:uppercase;">Stock</p>
                  <p style="margin:4px 0 0; color:white; font-size:18px; font-weight:bold;">${symbol}</p>
                  <p style="margin:2px 0 0; color:#94a3b8; font-size:13px;">${companyName}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px; border-bottom:1px solid #1e293b;">
                  <p style="margin:0; color:#64748b; font-size:12px; text-transform:uppercase;">Circuit Price</p>
                  <p style="margin:4px 0 0; color:${circuitColor}; font-size:28px; font-weight:bold;">
                    ₹${currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px;">
                  <p style="margin:0; color:#64748b; font-size:12px; text-transform:uppercase;">Day Change</p>
                  <p style="margin:4px 0 0; color:${circuitColor}; font-size:20px; font-weight:bold;">
                    ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%
                  </p>
                </td>
              </tr>
            </table>

            <!-- What to do -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="margin-top:20px; padding:16px; background-color:#1a2744; border-radius:8px; border-left:4px solid #3b82f6;">
              <tr>
                <td>
                  <p style="margin:0; color:#93c5fd; font-size:13px; font-weight:bold; margin-bottom:6px;">💡 What this means for you:</p>
                  ${
                    isUpper
                      ? `<p style="margin:0; color:#93c5fd; font-size:13px;">If you hold this stock, you may want to consider selling at the circuit price. If you want to buy, you may have to wait until the circuit opens.</p>`
                      : `<p style="margin:0; color:#93c5fd; font-size:13px;">If you hold this stock and have a Stop Loss set, it may have been triggered. Consider reviewing your position carefully.</p>`
                  }
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0; color:#64748b; font-size:12px;">
              ⚠️ This is a paper trading simulation. Circuit limits may differ from actual NSE limits.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px; background-color:#0f172a; border-top:1px solid #1e293b; text-align:center;">
            <p style="margin:0; color:#475569; font-size:12px;">
              Made with ❤️ by <span style="color:#4ade80; font-weight:bold;">Ashutosh</span>
            </p>
            <p style="margin:6px 0 0; color:#334155; font-size:11px;">
              © 2024 StockLab — Practice trading with real NSE prices
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };

  await deliver(mailOptions);
};

module.exports = { sendOTP, sendPriceAlert, sendCircuitAlert };
