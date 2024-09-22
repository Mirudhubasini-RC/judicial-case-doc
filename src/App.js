import React, { useState } from 'react';
import FileUpload from './FileUpload';
import Dashboard from './Dashboard'; // Ensure this matches the export in Dashboard.js


function App() {
  const [isClassified, setIsClassified] = useState(false);
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);


  const handleClassify = (uploadedFiles) => {
    const classificationResults = uploadedFiles.map(file => `Result for ${file.name}`);
    setFiles(uploadedFiles);
    setResults(classificationResults);
    setIsClassified(true);
  };


  const handleBack = () => {
    setIsClassified(false);
  };


  return (
    <>
      {isClassified ? (
        <Dashboard files={files} results={results} onBack={handleBack} />
      ) : (
        <FileUpload onClassify={handleClassify} />
      )}
    </>
  );
}


export default App;


