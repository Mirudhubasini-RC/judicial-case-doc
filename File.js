const mongoose = require('mongoose');
const fileSchema = new mongoose.Schema({
  name: String,
  format: String,
  size: Number,
  data: Buffer,
  classificationResult: [String], // Add this field for storing classification results
  importantTerms: [String]
});

const File = mongoose.model('File', fileSchema);

module.exports = File;