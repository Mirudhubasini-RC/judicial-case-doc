import React, { useState } from 'react';
import './FileUpload.css';
import fileIcon from './file-icon.png'; // Ensure the path is correct
import uploadIcon from '/Users/mirudhubasinirc/Documents/JudicialCaseDoc/judicial-case-doc/src/upload-icon.png'; // Add your upload icon path
import Tesseract from 'tesseract.js';

const FileUpload = ({ onClassify }) => {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (newFiles) => {
    if (files.length + newFiles.length > 10) {
      alert('Maximum upload limit is 10 documents');
      return;
    }

    const allowedTypes = ['txt', 'pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
    const filteredFiles = newFiles.filter(file => {
      const fileType = file.name.split('.').pop().toLowerCase();
      if (!allowedTypes.includes(fileType)) {
        alert('Only text, PDF, Word, or image files (PNG, JPG) should be uploaded');
        return false;
      }
      return true;
    });

    filteredFiles.forEach(file => {
      const fileType = file.name.split('.').pop().toLowerCase();

      // Handle image files with OCR
      if (['png', 'jpg', 'jpeg'].includes(fileType)) {
        Tesseract.recognize(
          file,
          'eng',
          { logger: (m) => console.log(m) }
        ).then(({ data: { text } }) => {
          // Create a text file from the extracted text
          const blob = new Blob([text], { type: 'text/plain' });
          const txtFileName = `${file.name.split('.')[0]}.txt`; // Create a name for the txt file
          const downloadLink = document.createElement('a');
          downloadLink.href = URL.createObjectURL(blob);
          downloadLink.download = txtFileName;
          downloadLink.innerText = 'Download Extracted Text';
          downloadLink.style.display = 'block';

          // Create a new file object for the uploaded files section
          const newFile = {
            name: txtFileName,
            type: 'txt',
            progress: 100,
            status: 'Completed',
            downloadLink: downloadLink.outerHTML,
          };

          setFiles(prevFiles => [...prevFiles, newFile]);
        }).catch(error => {
          console.error('Error with OCR:', error);
          alert('Error extracting text from image');
        });
      } 
      // Handle non-image files (txt, pdf, doc, docx)
      else {
        const formData = new FormData();
        formData.append('files', file);

        fetch('http://localhost:3001/upload', {
          method: 'POST',
          body: formData,
        })
          .then(response => response.text())
          .then(data => {
            console.log(data);
            const newFile = {
              name: file.name,
              type: fileType,
              progress: 100,
              status: 'Completed',
            };
            setFiles(prevFiles => [...prevFiles, newFile]);
          })
          .catch(error => {
            console.error('Error uploading files:', error);
            alert('Error uploading files');
          });
      }
    });
  };

  const handleRemoveFile = (fileName) => {
    setFiles(files.filter(file => file.name !== fileName));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false); // Reset dragging state
    const newFiles = Array.from(e.dataTransfer.files);
    handleFileUpload(newFiles);
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDragEnter = () => {
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="upload-container">
      <h1 className="title">Judicial Case Classifier</h1>
      <div className="content">
        <div 
          className={`card upload-box ${isDragging ? 'drag-over' : ''}`} 
          onDrop={onDrop} 
          onDragOver={onDragOver} 
          onDragEnter={onDragEnter} 
          onDragLeave={onDragLeave}
        >
          <img src={uploadIcon} alt="upload icon" className="upload-icon" />
          <div className="upload-prompt">
            <p>Drag and drop files here</p>
            <p>- OR -</p>
            <input
              type="file"
              multiple
              className="browse-button"
              onChange={(e) => handleFileUpload(Array.from(e.target.files))}
              accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg"
            />
            <p className="warning">* Only text, PDF, Word, or image (PNG, JPG) files should be uploaded</p>
          </div>
        </div>

        <div className="card uploaded-files">
          <h2>Uploaded Files</h2>
          {files.length > 0 ? (
            files.map((file, index) => (
              <div key={index} className="file-item">
                <div className="file-icon">
                  <img src={fileIcon} alt="file icon" className="file-icon-image" />
                </div>
                <div className="file-details">
                  <p>{file.name}</p>
                  {file.downloadLink && (
                    <div dangerouslySetInnerHTML={{ __html: file.downloadLink }} />
                  )}
                  <div className="progress-bar">
                    <div
                      className={`progress ${file.status === 'File size is too large' ? 'error' : ''}`}
                      style={{ width: `${file.progress}%` }}
                    ></div>
                  </div>
                </div>
                <div className="file-status">
                  <p>{file.status}</p>
                </div>
                <button className="remove-button" onClick={() => handleRemoveFile(file.name)}>Remove</button>
              </div>
            ))
          ) : (
            <p>No files uploaded yet.</p>
          )}
          {files.length > 0 && (
            <button className="classify-button" onClick={() => onClassify(files)}>Classify</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
