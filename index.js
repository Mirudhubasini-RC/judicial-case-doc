// Import the necessary libraries
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios'); 
const File = require('./File'); 
const FormData = require('form-data');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Enable CORS for frontend communication
app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));


// Parse JSON bodies
app.use(express.json());

// MongoDB connection setup with proper error handling
mongoose.connect("mongodb+srv://Mirudhu:Admin@bucket.uxr7nhr.mongodb.net/Classification", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// File upload route with async processing to prevent bottlenecks
app.post('/upload', upload.array('files'), async (req, res) => {
  console.log(req.files);
  try {
    // Step 1: Save files to the database
    const savedFiles = await Promise.all(
      req.files.map(file => {
        const newFile = new File({
          name: file.originalname,
          format: file.mimetype,
          size: file.size,
          data: file.buffer,
        });
        return newFile.save();
      })
    );

    // Step 2: Classify each file asynchronously
    const classifyFile = async (file) => {
      const formData = new FormData();
      formData.append('file', file.data, {
        filename: file.name,
        contentType: file.format,
      });

      try {
        const response = await axios.post('http://localhost:5000/classify', formData, {
          headers: {  'Content-Type': 'multipart/form-data' },
        });
        return response.data;
      } catch (err) {
        console.error(`Error classifying file ${file.name}:`, err);
        return JSON.stringify({ error: 'Classification failed' });
      }
    };

    // Update classification results in the database
    await Promise.all(savedFiles.map(async (file) => {
      const classificationResult = await classifyFile(file);
      await File.findByIdAndUpdate(file._id, { classificationResult: JSON.stringify(classificationResult) });
    }));
    

    res.status(200).send('Files uploaded and classified successfully');
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).send('Error uploading files');
  }
});

// Fetch results endpoint
app.get('/results', async (req, res) => {
  try {
    const results = await File.find({}, 'name format size classificationResult');
    res.json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Error fetching results' });
  }
});

// Fetch file metadata endpoint
app.get('/files', async (req, res) => {
  try {
    const files = await File.find({}, 'name format size _id classificationResult');
    res.status(200).json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).send('Error fetching files');
  }
});

// Fetch file content by ID
app.get('/files/:id', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).send('File not found');
    }

    res.setHeader('Content-Type', file.format);
    res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
    res.send(file.data);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).send('Error fetching file');
  }
});

// Start server with proper shutdown handling
const server = app.listen(3001, () => {
  console.log("Server is running on port 3001");
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close();
  });
});
