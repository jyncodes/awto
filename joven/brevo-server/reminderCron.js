require('dotenv').config();
const cron = require('node-cron');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { sendEmail } = require('./brevoService');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const checkReservationsAndSendReminders = async () => {
  console.log('🔧 Running immediate reminder check (manual trigger)...');

  const now = new Date();
  const lowerBound = new Date(now.getTime() + 11.5 * 60 * 60 * 1000);
  const upperBound = new Date(now.getTime() + 12.5 * 60 * 60 * 1000);

  console.log(`🕒 Time window: ${lowerBound.toISOString()} - ${upperBound.toISOString()}`);

  try {
    const snapshot = await db.collection('reservations')
      .where('isCancelled', '==', false)
      .get();

    const matchingReservations = snapshot.docs.filter(docSnap => {
      const data = docSnap.data();
      const preferredDate = data.preferredDateTime?.toDate?.();
      return preferredDate && preferredDate >= lowerBound && preferredDate <= upperBound;
    });

    console.log(`📦 Found ${matchingReservations.length} matching reservations`);

    if (matchingReservations.length === 0) {
      console.log('⏰ No reminders needed at this time.');
      return;
    }

    for (const docSnap of matchingReservations) {
      const res = docSnap.data();
      const userSnap = await db.collection('users').doc(res.userId).get();
      const user = userSnap.data();

      const formattedDate = res.preferredDateTime.toDate().toLocaleString();
      const subject = `⏰ Reminder: Your appointment is at ${formattedDate}`;
      const htmlContent = `
        <h3>Hi ${user?.name || 'Customer'},</h3>
        <p>This is a reminder that your reservation (<strong>${docSnap.id}</strong>) is scheduled for:</p>
        <p><strong>${formattedDate}</strong></p>
        <p>📍 Service: ${res.serviceType}<br>🚘 Vehicle: ${res.vehicleBrand} ${res.vehicleModel} (${res.vehicleYear})</p>
        <p>If you need to reschedule, please contact us ASAP.</p>
        <p>Thank you for choosing Joven Tire Service!</p>
      `;

      console.log(`📧 Sending reminder to ${user?.email}`);
      await sendEmail(user?.email, user?.name || 'Customer', subject, htmlContent);
    }

  } catch (error) {
    console.error('❌ Error checking reservations:', error.message);
  }
};

// 🔁 Scheduled every 30 minutes
cron.schedule('*/30 * * * *', checkReservationsAndSendReminders);

// 🧪 Run once immediately on script start
checkReservationsAndSendReminders();
