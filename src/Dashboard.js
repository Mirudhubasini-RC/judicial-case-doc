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
        })
        .catch(error => console.error('Error fetching files:', error));
    };

    fetchData();
    const intervalId = setInterval(fetchData, 5000);
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
      window.open(`http://localhost:3001/files/${fileId}`, '_blank');
    } else {
      console.error('File ID is undefined');
    }
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
        {/* Removed Trends Over Time */}
      </div>
    </div>
  );
};

export default Dashboard;
