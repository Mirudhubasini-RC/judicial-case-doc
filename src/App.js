import React, { useState } from 'react';
import FileUpload from './FileUpload';
import Dashboard from './Dashboard'; // Ensure this matches the export in Dashboard.js

function App() {
  const [isClassified, setIsClassified] = useState(false);
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [importantTerms, setImportantTerms] = useState([]); // State to hold important terms

  const handleClassify = (uploadedFiles) => {
    // Simulate classification results and important terms
    const classificationResults = uploadedFiles.map(file => `Result for ${file.name}`);
    const terms = uploadedFiles.map(file => [`Important term for ${file.name}`]); // Replace with actual important terms

    setFiles(uploadedFiles);
    setResults(classificationResults);
    setImportantTerms(terms); // Store important terms
    setIsClassified(true);
  };

  const handleBack = () => {
    setIsClassified(false);
    setImportantTerms([]); // Clear important terms when going back
  };

  return (
    <>
      {isClassified ? (
        <Dashboard 
          files={files} 
          results={results} 
          importantTerms={importantTerms} // Pass important terms to Dashboard
          onBack={handleBack} 
        />
      ) : (
        <FileUpload onClassify={handleClassify} />
      )}
    </>
  );
}

export default App;
