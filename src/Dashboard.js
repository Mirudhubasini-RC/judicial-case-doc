import React, { useState, useEffect } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement } from 'chart.js';
import axios from 'axios';
import './Dashboard.css';

// Register necessary components for Chart.js
ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement);

const Dashboard = ({ onBack }) => {
  const [fileData, setFileData] = useState([]);
  const [classificationResults, setClassificationResults] = useState([]);
  const [recentUploads, setRecentUploads] = useState([]); // State for recent uploads

  useEffect(() => {
    const fetchData = () => {
        axios.get('http://localhost:3001/files')
            .then(response => {
                const data = response.data;
                setFileData(data);

                const results = data.map(file => {
                    const parsedResult = file.classificationResult ? JSON.parse(file.classificationResult) : 'Not Classified Yet';
                    return parsedResult.finalClassification || 'Not Classified Yet';
                });
                setClassificationResults(results);

                // Update recent uploads with classification results
                const recentData = data
                    .sort((a, b) => new Date(b.uploadTimestamp) - new Date(a.uploadTimestamp)) // Sort by timestamp (most recent first)
                    .slice(0, 5) // Get the first 5 documents
                    .map((file, index) => ({
                        name: file.name,
                        classification: results[index], // Use the index to get classification results
                        uploadTimestamp: new Date(file.uploadTimestamp).toLocaleString() // Convert to readable format
                    }));

                setRecentUploads(recentData);
            })
            .catch(error => console.error('Error fetching files:', error));
    };

    // Fetch recent uploads if your endpoint supports it
    const fetchRecentUploads = () => {
        axios.get('http://localhost:3001/recent-activity') // Adjusted to the correct endpoint for recent uploads
            .then(response => {
                console.log('Recent uploads data:', response.data); // Log the data
                if (Array.isArray(response.data)) {
                    const updatedRecentUploads = response.data.map(file => ({
                        name: file.name,
                        classification: file.classificationResult ? JSON.parse(file.classificationResult).finalClassification : 'Not Classified Yet',
                        uploadTimestamp: new Date(file.uploadTimestamp).toLocaleString() // Convert to readable format
                    }));
                    setRecentUploads(updatedRecentUploads); // Assuming response.data contains the recent uploads
                } else {
                    console.error('Unexpected response format for recent uploads:', response.data);
                }
            })
            .catch(error => console.error('Error fetching recent uploads:', error));
    };

    fetchData();
    fetchRecentUploads(); // Fetch recent uploads
    const intervalId = setInterval(() => {
        fetchData();
        fetchRecentUploads(); // Fetch recent uploads periodically
    }, 5000);
    
    return () => clearInterval(intervalId);
}, []);


  const handleClassify = (fileId) => {
    axios.post(`http://localhost:3001/api/classify/${fileId}`)
      .then(response => {
        const { finalClassification } = response.data;

        setClassificationResults(prevResults => {
          const updatedResults = [...prevResults];
          const fileIndex = fileData.findIndex(file => file._id === fileId);
          if (fileIndex !== -1) {
            updatedResults[fileIndex] = finalClassification;
          }
          return updatedResults;
        });
      })
      .catch(error => console.error('Error classifying document:', error));
  };

  const handleViewFile = (fileId) => {
    if (fileId) {
      axios.get(`http://localhost:3001/files/${fileId}`)
        .then(response => {
          const { name, data, importantTerms } = response.data;

          // Decode the base64 file content
          const decodedContent = atob(data.split(',')[1]);

          // Highlight the important terms
          const highlightedContent = highlightTerms(decodedContent, importantTerms);

          // Open a new window to display the content with highlighted terms
          const newWindow = window.open("", "_blank");
          newWindow.document.write(`
            <html>
              <head><title>File View</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  padding: 20px;
                  max-width: 1500px; /* Set a max-width */
                  overflow-wrap: break-word; /* Break long words */
                }
                pre {
                  white-space: pre-wrap; /* Preserve whitespace and wrap long lines */
                  word-wrap: break-word; /* Break long words to fit */
                  background: #f4f4f4;
                  padding: 10px;
                  border-radius: 5px;
                }
              </style>
              </head>
              <body>
                <h1>File Content:</h1>
                <pre>${highlightedContent}</pre>
              </body>
            </html>
          `);
          newWindow.document.close();
        })
        .catch(error => console.error('Error fetching file content:', error));
    } else {
      console.error('File ID is undefined');
    }
  };

  const highlightTerms = (content, terms) => {
    if (!terms || terms.length === 0) return content;

    let highlightedContent = content;

    terms.forEach(term => {
      const regex = new RegExp(`(\\S*\\s+)?(${term})(\\s+\\S*)?`, 'gi'); // Match the term with words before and after
      highlightedContent = highlightedContent.replace(regex, (match, before, currentTerm, after) => {
        return `<span style="background-color: yellow;">${before || ''}<strong>${currentTerm}</strong>${after || ''}</span>`;
      });
    });

    return highlightedContent;
  };

  // Count occurrences of each case type for the dynamic case type chart
  const caseTypeCounts = classificationResults.reduce((acc, result) => {
    const caseTypes = result.split(', ');
    caseTypes.forEach(type => {
      if (type !== 'Not Classified Yet') {
        acc[type] = (acc[type] || 0) + 1;
      }
    });
    return acc;
  }, {});

  const caseTypeLabels = Object.keys(caseTypeCounts);
  const caseTypeValues = Object.values(caseTypeCounts);

  const caseTypeData = {
    labels: caseTypeLabels,
    datasets: [{
      data: caseTypeValues,
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4A00E0', '#FF007F'],
      hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#3A0CA3', '#D20B72']
    }]
  };

  // Document statistics for the dynamic bar chart
  const numProcessed = fileData.length;
  const numClassified = classificationResults.filter(result => result !== 'Not Classified Yet').length;

  const documentStatsData = {
    labels: ['Processed', 'Classified'],
    datasets: [{
      data: [numProcessed, numClassified],
      backgroundColor: ['#4A00E0', '#FF007F'],
      hoverBackgroundColor: ['#3A0CA3', '#D20B72']
    }]
  };

  // Top Case Types Bar Chart Data
  const topCaseTypesData = {
    labels: caseTypeLabels.length ? caseTypeLabels : ['No Data'],
    datasets: [{
      label: 'Top Case Types',
      data: caseTypeValues.length ? caseTypeValues : [0],
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4A00E0', '#FF007F'],
      borderColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4A00E0', '#FF007F'],
      borderWidth: 1
    }]
  };

  return (
    <div className="dashboard-container">
      <button onClick={onBack} className="back-button">Back to Upload</button>
      <h1 className="dashboard-title">Dashboard</h1>

      {/* Classified Documents Table at the Top */}
      <div className="classified-documents-table">
        <h2>Results of the Classified Documents</h2>
        <table>
          <thead>
            <tr>
              <th>Name of File</th>
              <th>File Size</th>
              <th>Format</th>
              <th>Categorized Result</th>
              <th>View Documents</th>
            </tr>
          </thead>
          <tbody>
            {fileData.map((file, index) => (
              <tr key={file._id}>
                <td>{file.name}</td>
                <td>{(file.size / (1024 * 1024)).toFixed(2)} MB</td>
                <td>{file.format}</td>
                <td>{classificationResults[index]}</td>
                <td>
                  <button
                    className="view-button"
                    onClick={() => handleViewFile(file._id)}
                  >
                    VIEW
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Activity Feed */}
      <div className="recent-activity">
        <h2>Recent Activity</h2>
        <table className="recent-activity-table">
          <thead>
            <tr>
              <th>Document Name</th>
              <th>Classification</th>
              
            </tr>
          </thead>
          <tbody>
            {recentUploads.length > 0 ? (
              recentUploads.map((upload, index) => (
                <tr key={index} className={index % 2 === 0 ? "even-row" : "odd-row"}>
                  <td>{upload.name}</td>
                  <td>{upload.classification || 'Not Classified Yet'}</td>
                  
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3">No recent uploads available.</td> {/* Update colspan to match new structure */}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Other Dashboard Elements Below */}
      <div className="dashboard-content">
        <div className="dashboard-card">
          <h2>Number of Documents Uploaded</h2>
          <p>{fileData.length}</p>
        </div>
        <div className="dashboard-card">
          <h2>Case Types</h2>
          <Pie data={caseTypeData} />
        </div>
        <div className="dashboard-card">
          <h2>Document Statistics</h2>
          <Bar data={documentStatsData} />
        </div>
        <div className="dashboard-card">
          <h2>Top Case Types</h2>
          <Bar data={topCaseTypesData} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
