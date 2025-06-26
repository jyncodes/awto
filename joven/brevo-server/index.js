// brevo-server/index.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// POST endpoint to send email
app.post('/send-email', async (req, res) => {
  const { to, name, subject, htmlContent } = req.body;

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: "Joven Tire Enterprise", email: "joventiresenterprise@gmail.com" },
        to: [{ email: to, name }],
        subject,
        htmlContent,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).send({ success: true, data: response.data });
  } catch (error) {
    console.error('Brevo error:', error.response?.data || error.message);
    res.status(500).send({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Brevo server running on port ${PORT}`));
