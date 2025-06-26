require('dotenv').config();
const SibApiV3Sdk = require('sib-api-v3-sdk');

const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const sendEmail = async (toEmail, toName, subject, htmlContent) => {
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  const email = {
    to: [{ email: toEmail, name: toName }],
    sender: { email: process.env.SENDER_EMAIL, name: 'Joven Tire Service' },
    subject,
    htmlContent,
  };

  try {
    await apiInstance.sendTransacEmail(email);
    console.log(`✅ Reminder sent to ${toEmail}`);
  } catch (error) {
    console.error(`❌ Failed to send to ${toEmail}`, error?.response?.body || error);
  }
};

module.exports = { sendEmail };
