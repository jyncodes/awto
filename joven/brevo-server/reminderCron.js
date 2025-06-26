require('dotenv').config();
const cron = require('node-cron');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { sendEmail } = require('./brevoService');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('🔍 Checking for upcoming reservations...');

  const now = new Date();
  const lowerBound = new Date(now.getTime() + 11.5 * 60 * 60 * 1000);
  const upperBound = new Date(now.getTime() + 12.5 * 60 * 60 * 1000);

  const snapshot = await db.collection('reservations')
    .where('preferredDateTime', '>=', Timestamp.fromDate(lowerBound))
    .where('preferredDateTime', '<=', Timestamp.fromDate(upperBound))
    .where('isCancelled', '==', false)
    .get();

  if (snapshot.empty) {
    console.log('⏰ No reminders needed at this time.');
    return;
  }

  snapshot.forEach(async (docSnap) => {
    const res = docSnap.data();
    const userSnap = await db.collection('users').doc(res.userId).get();
    const user = userSnap.data();

    const formattedDate = res.preferredDateTime.toDate().toLocaleString();
    const subject = `⏰ Reminder: Your appointment is at ${formattedDate}`;
    const htmlContent = `
      <h3>Hi ${user?.name || 'Customer'},</h3>
      <p>This is a reminder that your reservation (<strong>${res.id}</strong>) is scheduled for:</p>
      <p><strong>${formattedDate}</strong></p>
      <p>📍 Service: ${res.serviceType}<br>🚘 Vehicle: ${res.vehicleBrand} ${res.vehicleModel} (${res.vehicleYear})</p>
      <p>If you need to reschedule, please contact us ASAP.</p>
      <p>Thank you for choosing Joven Tire Service!</p>
    `;

    await sendEmail(user?.email, user?.name || 'Customer', subject, htmlContent);
  });
});
