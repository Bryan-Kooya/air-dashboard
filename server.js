const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require("openai");
require('dotenv').config();

const openaiApiKey = process.env.OPENAI_API_KEY;

const app = express();
const port = 5000;

// Middleware
app.use(express.json());

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// OpenAI Initialization
const openai = new OpenAI({
  apiKey: openaiApiKey,
});

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'];

// Helper function to validate file type
const allowedFile = (filename) => {
  const ext = path.extname(filename).toLowerCase().slice(1);
  return ALLOWED_EXTENSIONS.includes(ext);
};

// Resume parsing endpoint
app.post('/api/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { jobDescription } = req.body;

    if (!allowedFile(req.file.originalname)) {
      fs.unlinkSync(req.file.path); // Remove invalid file
      return res.status(400).json({ error: 'Invalid file type' });
    }

    // Read and process the uploaded file
    const fileContent = fs.readFileSync(req.file.path, 'utf-8'); // Example: replace with actual resume parsing logic

    const systemMessage = `Your system message content goes here...`;

    const messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: fileContent },
    ];
    if (jobDescription) {
      messages.push({ role: 'user', content: `Job Description:\n${jobDescription}` });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
    });

    const result = JSON.parse(response.data.choices[0].message.content);

    // Send parsed data back
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred', details: error.message });
  } finally {
    if (req.file) fs.unlinkSync(req.file.path); // Clean up uploaded file
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});