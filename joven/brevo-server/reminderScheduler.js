require("dotenv").config();
const cron = require("node-cron");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { sendEmail } = require("./brevoService");
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const checkReservationsAndSendReminders = async () => {
  console.log("🔧 Running reservation reminder check...");

  const now = new Date();
  const targetTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours ahead
  const lowerBound = new Date(targetTime.getTime() - 60 * 1000); // 1 min before
  const upperBound = new Date(targetTime.getTime() + 60 * 1000); // 1 min after

  try {
    const snapshot = await db.collection("reservations")
      .where("isCancelled", "==", false)
      .where("reminderSent", "==", false)
      .get();

    const matching = snapshot.docs.filter(docSnap => {
      const data = docSnap.data();
      const dt = data.preferredDateTime?.toDate?.();
      return dt && dt >= lowerBound && dt <= upperBound;
    });

    console.log(`📦 Found ${matching.length} reservations to remind.`);

    for (const docSnap of matching) {
      const res = docSnap.data();
      const userSnap = await db.collection("users").doc(res.userId).get();
      const user = userSnap.data();

      const email = user?.email;
      const name = user?.name || "Customer";
      const formattedDate = res.preferredDateTime.toDate().toLocaleString();
      const subject = `⏰ Reminder: Your appointment is at ${formattedDate}`;
      const htmlContent = `
        <h3>Hi ${name},</h3>
        <p>This is a reminder for your upcoming reservation:</p>
        <ul>
          <li><strong>Reservation ID:</strong> ${res.id}</li>
          <li><strong>Date & Time:</strong> ${formattedDate}</li>
          <li><strong>Service:</strong> ${res.serviceType}</li>
          <li><strong>Vehicle:</strong> ${res.vehicleBrand} ${res.vehicleModel} (${res.vehicleYear})</li>
        </ul>
        <p>If you need to reschedule, please contact us ASAP.</p>
        <p>Thank you for choosing Awto!</p>
      `;

      try {
        await sendEmail(email, name, subject, htmlContent);
        await db.collection("reservations").doc(docSnap.id).update({
          reminderSent: true,
        });
        console.log(`✅ Reminder sent to ${email}`);
      } catch (error) {
        console.error(`❌ Failed to send to ${email}:`, error.message);
      }
    }
  } catch (err) {
    console.error("🔥 Firestore error:", err.message);
  }
};

// Run every 5 minutes
cron.schedule("*/5 * * * *", checkReservationsAndSendReminders);

// Run immediately at startup
checkReservationsAndSendReminders();
