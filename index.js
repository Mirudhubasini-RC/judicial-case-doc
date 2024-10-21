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
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON bodies
app.use(express.json());

// MongoDB connection setup with proper error handling
const MONGODB_URI = "mongodb+srv://Mirudhu:Admin@bucket.uxr7nhr.mongodb.net/Classification";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Simple endpoint to verify server is running
app.get('/', (req, res) => {
  res.send('Server is running');
});

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
    console.log('Saved files:', savedFiles);

    // Function to classify files
    const classifyFile = async (file) => {
      const formData = new FormData();
      formData.append('file', file.data, {
        filename: file.name,
        contentType: file.format,
      });

      try {
        const response = await axios.post('http://localhost:8000/classify', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        let finalClassification = response.data.final_classification;
        let importantTerms = response.data.important_terms; // Assuming your API returns important terms

        // Save classification and important terms
        if (Array.isArray(finalClassification)) {
          finalClassification = finalClassification.join(', '); // Join array elements with a comma
        }

        return { finalClassification, importantTerms }; // Return both
      } catch (err) {
        console.error(`Error classifying file ${file.name}:`, err.response ? err.response.data : err.message);
        return { error: 'Classification failed' };
      }
    };

    // Update classification results in the database
    await Promise.all(savedFiles.map(async (file) => {
      const classificationResult = await classifyFile(file);
      await File.findByIdAndUpdate(file._id, {
        classificationResult: JSON.stringify(classificationResult),
        importantTerms: classificationResult.importantTerms || []
      });
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

    const importantTerms = file.importantTerms || []; // Array of terms to highlight

    // Set the appropriate headers for file download
    res.setHeader('Content-Type', file.format);
    res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);

    // Convert the binary data to a Base64 string for transmission
    const base64Data = file.data.toString('base64');

    res.json({
      data: `data:${file.format};base64,${base64Data}`, // Sending as Base64 data URL
      importantTerms: importantTerms, // Send the important terms for highlighting
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).send('Error fetching file');
  }
});

// Fetch top case types (New Feature)
app.get('/case-types', async (req, res) => {
  try {
    const results = await File.find({}, 'classificationResult');
    const caseTypeCounts = {};

    results.forEach(result => {
      if (result.classificationResult) {
        const caseTypes = JSON.parse(result.classificationResult).finalClassification.split(', ');
        caseTypes.forEach(type => {
          if (type && type !== 'Not Classified Yet') { // Ensure type is valid
            caseTypeCounts[type] = (caseTypeCounts[type] || 0) + 1;
          }
        });
      }
    });

    // Convert the counts object into an array for easier use in charts
    const caseTypesArray = Object.entries(caseTypeCounts).map(([caseType, count]) => ({
      caseType,
      count
    }));

    res.json(caseTypesArray); // Send as an array of objects
  } catch (error) {
    console.error('Error fetching case types:', error);
    res.status(500).json({ error: 'Error fetching case types' });
  }
});

// Fetch recent activity
app.get('/recent-activity', async (req, res) => {
  try {
    const recentFiles = await File.find({}, 'name classificationResult')
      .sort({ uploadTimestamp: -1 }) // Sort by most recent
      .limit(10); // Limit to 10 most recent uploads

    // Map only document name and classification type
    const recentFilesWithClassification = recentFiles.map(file => ({
      name: file.name,
      classificationResult: file.classificationResult
        ? JSON.parse(file.classificationResult).finalClassification
        : 'Not Classified Yet' // Fallback if not classified
    }));

    res.json(recentFilesWithClassification);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Error fetching recent activity' });
  }
});

// Fetch trends over time (New Feature)
app.get('/trends', async (req, res) => {
  try {
    const trends = await File.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$uploadTimestamp" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } } // Sort by date
    ]);

    res.json(trends);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Error fetching trends' });
  }
});

// Start server with proper shutdown handling
const PORT = 3001;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown on SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close();
  });
});
