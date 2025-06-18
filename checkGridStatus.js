const fs = require("fs");
const axios = require("axios");
const nodemailer = require("nodemailer");

const TELEGRAM_TOKEN = "8185101661:AAHiB8Q7ZXWLYYMTRDFfh-_kACXQ12Fy-38";
const TELEGRAM_CHAT_ID = "475041150";

// === CONFIG ===
const COOKIE = `JSESSIONID=5FE3F2E42785625E8118909B19077779; loginPage=login; lang=en; assToken=4547175852adecb6a1bcd21f8dff67e8; mapLang=com; selectedPlantId=2678376; plantSize=1; onePlantId=2678376; onePlantType=0; selPage=%2Fpanel; memoryDeviceType=%5B%7B%22key%22%3A%222678376%22%2C%22value%22%3A%22storage%22%7D%5D; memoryDeviceSn=%5B%7B%22key%22%3A%222678376%22%2C%22value%22%3A%22storage%25ZRK0CFM0AN%22%7D%5D; SERVERID=1984b691d07d4a26c58982514be957c2|1750244085|1750244049`;
const EMAIL_FROM = "karooorak3@gmail.com";
const EMAIL_TO = "karooorak3@gmail.com";
const EMAIL_PASS = "lzsg ekvc mmei iwao";
const STATUS_FILE = "./last_grid_status.txt";

// === EMAIL SETUP ===
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_FROM,
    pass: EMAIL_PASS,
  },
});

function getLastStatus() {
  if (!fs.existsSync(STATUS_FILE)) return null;
  return fs.readFileSync(STATUS_FILE, "utf8").trim();
}

function setLastStatus(status) {
  fs.writeFileSync(STATUS_FILE, status);
}

async function sendTelegram(status, gridPower) {
  const msg = `⚡ Grid is now *${status}*\nGrid Power: \`${gridPower} W\``;
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: msg,
        parse_mode: "Markdown",
      }),
    });
    console.log(`📲 Telegram sent: Grid is ${status}`);
  } catch (err) {
    console.error("❌ Telegram error:", err.message);
  }
}

async function checkGeneratorStatus() {
  try {
    const res = await axios.post(
      "https://server.growatt.com/panel/storage/getStorageStatusData?plantId=2678376",
      "storageSn=ZRK0CFM0AN",
      {
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Cookie: COOKIE,
          Origin: "https://server.growatt.com",
          Referer: "https://server.growatt.com/index",
          "User-Agent": "Mozilla/5.0",
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    if (!res.data || !res.data.obj) {
      console.error(
        "❌ Invalid Growatt response:",
        JSON.stringify(res.data, null, 2)
      );
      return;
    }

    const data = res.data.obj;
    const gridPower = parseFloat(data.gridPower);
    const newStatus = gridPower > 0 ? "ON" : "OFF";
    const lastStatus = getLastStatus();

    console.log(`Grid Power: ${gridPower} W → ${newStatus}`);

    if (newStatus !== lastStatus) {
      setLastStatus(newStatus);
      await sendEmail(newStatus, gridPower);
      await sendTelegram(newStatus, gridPower); // ✅ Add this
    } else {
      console.log(`No change (still ${newStatus}). No email sent.`);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

async function sendEmail(status, gridPower) {
  const mailOptions = {
    from: EMAIL_FROM,
    to: EMAIL_TO,
    subject: `⚠️ Generator is now ${status}`,
    text: `Status changed: Grid is now ${status}. Grid Power: ${gridPower} W`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent: Grid is ${status}`);
  } catch (err) {
    console.error("❌ Email error:", err.message);
  }
}

// === Run ===
checkGeneratorStatus();
