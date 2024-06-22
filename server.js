const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
require('dotenv').config();

const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use(bodyParser.json());

// Set various HTTP headers, including Content Security Policy (CSP)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-eval'"], // Allowing unsafe-eval for script execution
      // Add other directives as needed (e.g., styleSrc, connectSrc, etc.)
    },
  },
}));

// Enable CORS for any origin
app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow specific HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
  }));
  

// MongoDB connection
const mongoURI = process.env.MONGO_URI || 'your-mongodb-connection-string';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit process with failure
  });

// Define a Mongoose schema and model for saving email logs
const emailLogSchema = new mongoose.Schema({
  email: String,
  message: String,
  date: { type: Date, default: Date.now }
});

const EmailLog = mongoose.model('EmailLog', emailLogSchema);

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Accept self-signed certificates
  },
});

// Endpoint to send emails and log to MongoDB
app.post('/api/send-email', async (req, res) => {
  const { email, message } = req.body;

  // Save email log to MongoDB
  const newLog = new EmailLog({ email, message });
  try {
    await newLog.save();
    console.log('Email log saved to MongoDB');
  } catch (error) {
    console.error('Error saving to MongoDB:', error);
    return res.status(500).send('Failed to log email to MongoDB');
  }

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'New Message from Custom Emailing Portal',
    text: message,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).send(error.toString());
    }
    console.log('Email sent:', info.response);
    res.status(200).send('Email sent: ' + info.response);
  });
});

// Endpoint to test server status
app.get('/test', (req, res) => {
  res.status(200).send('Server OK');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
