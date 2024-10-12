import React, { useState, useEffect } from 'react';
import { Pie, Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement, LineElement, PointElement } from 'chart.js';
import './Dashboard.css';

// Register necessary components for Chart.js
ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement, LineElement, PointElement);

const Dashboard = ({ files, results, onBack }) => {
  const [fileData, setFileData] = useState([]);
  const [classificationResults, setClassificationResults] = useState(results);

  useEffect(() => {
    // Define the function to fetch data
    const fetchData = () => {
      fetch('http://localhost:3001/files')
        .then(response => response.json())
        .then(data => {
          setFileData(data); // Set file data
          
          // Extract classification results from the fetched data
          const results = data.map(file => file.classificationResult || 'Not Classified Yet');
          setClassificationResults(results); // Set the classification results
        })
        .catch(error => console.error('Error fetching files:', error));
    };

    // Fetch data initially
    fetchData();

    // Set up polling to fetch data every 5 seconds
    const intervalId = setInterval(fetchData, 5000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  

  const handleViewFile = (fileId) => {
    if (fileId) {
      window.open(`http://localhost:3001/files/${fileId}`, '_blank');
    } else {
      console.error('File ID is undefined');
    }
  };

  // Example data for charts, replace with actual data
  const caseTypeData = {
    labels: ['Civil', 'Criminal', 'Other'],
    datasets: [{
      data: [5, 3, 2],
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
      hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
    }]
  };

  const documentStatsData = {
    labels: ['Processed', 'Classified'],
    datasets: [{
      data: [50, 30],
      backgroundColor: ['#4A00E0', '#FF007F'],
      hoverBackgroundColor: ['#3A0CA3', '#D20B72']
    }]
  };

  const lineChartData = {
    labels: ['January', 'February', 'March', 'April', 'May'],
    datasets: [{
      label: 'Uploads Over Time',
      data: [0, 10, 5, 2, 20],
      borderColor: '#4A00E0',
      backgroundColor: 'rgba(74, 0, 224, 0.2)',
      borderWidth: 1,
      fill: true
    }]
  };

  const barChartData = {
    labels: ['Civil', 'Criminal', 'Other'],
    datasets: [{
      label: 'Number of Cases',
      data: [5, 3, 2],
      backgroundColor: '#4A00E0',
      borderColor: '#3A0CA3',
      borderWidth: 1
    }]
  };

  return (
    <div className="dashboard-container">
      <button onClick={onBack} className="back-button">Back to Upload</button>
      <h1 className="dashboard-title">Dashboard</h1>
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
          <h2>Recent Activity Feed</h2>
          <ul>
            {fileData.map((file, index) => (
              <li key={index}>{file.name} - {classificationResults[index]}</li>
            ))}
          </ul>
        </div>
        <div className="dashboard-card">
          <h2>Trends Over Time</h2>
          <Line data={lineChartData} />
        </div>
        <div className="dashboard-card">
          <h2>Top Case Types</h2>
          <Bar data={barChartData} />
        </div>
      </div>
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
    </div>
  );
};

export default Dashboard;
