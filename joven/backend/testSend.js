require('dotenv').config();
const { sendEmail } = require('./brevoService');

sendEmail("pjanereyes14@gmail.com", "Test User", "Test Subject", "<h1>Hello from Joven!</h1>");
