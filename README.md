Judicial Case Classifier
Judicial Case Classifier is a web-based application that allows users to upload legal documents (PDFs, Word files, etc.) and classify them using a pre-trained deep neural network (DNN) model. The project leverages React for the front end, Flask for the classification API, and MongoDB Atlas for data storage. This tool is designed to streamline the document classification process for legal documents.

Table of Contents
Project Overview
Features
Technology Stack
Setup and Installation
Usage
Project Structure
API Endpoints
Contributing
License
Project Overview
The Judicial Case Classifier project provides an intuitive interface for uploading, classifying, and visualizing the classification of legal documents. Users can upload files, trigger classification, and view results via a user-friendly dashboard.

Features
File Upload: Supports drag-and-drop or browse-based file uploads for PDF, Word, and text documents.
Document Classification: Utilizes a pre-trained DNN model to classify legal documents into predefined categories.
Dashboard: Displays upload progress and classification results.
Database: Stores uploaded files and classification results in MongoDB Atlas.
Technology Stack
Front End: React (with React Hooks, Axios, and CSS)
Back End: Flask (Python) and Express (Node.js)
Database: MongoDB Atlas
File Upload: Multer (for handling file uploads in Node.js)
API Integration: RESTful API using Flask
Setup and Installation
Prerequisites
Node.js (version 14+)
npm (Node Package Manager)
Python (version 3.7+)
MongoDB Atlas account with database setup
Virtual Environment (Python)
MongoDB Connection String
Frontend Setup
Clone the Repository:

bash
Copy code
git clone <repository-url>
cd Judicial-Case-Classifier/Frontend/my-chat-bot
Install Dependencies:

bash
Copy code
npm install
Run the React App:

bash
Copy code
npm start
Backend Setup
Navigate to the Backend Directory:

bash
Copy code
cd Judicial-Case-Classifier/Backend
Set up Python Virtual Environment:

bash
Copy code
python3 -m venv venv
source venv/bin/activate  # For macOS/Linux
venv\Scripts\activate     # For Windows
Install Python Dependencies:

bash
Copy code
pip install -r requirements.txt
Run the Flask Server:

bash
Copy code
python app.py
Database Setup
Create a MongoDB Atlas Account at https://www.mongodb.com/atlas.

Create a Cluster and get the connection string.

Update the Connection String in your environment:

Replace <username>, <password>, and <cluster-url> in your connection string.

Example:

perl
Copy code
mongodb+srv://Mirudhu:Admin@bucket.uxr7nhr.mongodb.net/Classification
Ensure the backend has access to MongoDB Atlas by whitelisting your IP in the MongoDB Atlas Network Access settings.

Run the Server
Start the Node.js server:

bash
Copy code
node server.js
Both servers should be running:

React App (Frontend): http://localhost:3000
Flask API (Backend): http://localhost:8000
Usage
Upload Files: Use the file upload interface to drag and drop or browse for PDF, Word, or text documents.
Classify Documents: Click the "Classify" button to trigger the classification of uploaded documents.
View Results: Check the classification results displayed in the dashboard.
Database Updates: Uploaded files and classification results are automatically stored in the MongoDB Atlas database.
Project Structure
java
Copy code
Judicial-Case-Classifier/
│
├── Frontend/
│   ├── my-chat-bot/
│   │   ├── public/
│   │   ├── src/
│   │   └── package.json
│
├── Backend/
│   ├── app.py
│   ├── server.js
│   ├── requirements.txt
│   └── ...
│
├── README.md
└── ...
API Endpoints
File Upload
URL: /upload
Method: POST
Description: Uploads a document to MongoDB Atlas.
Classify Documents
URL: /classify
Method: GET
Description: Triggers classification of uploaded documents using the DNN model.
Fetch Results
URL: /results
Method: GET
Description: Retrieves classification results from the database.
Contributing
Contributions are welcome! Follow these steps to contribute:

Fork the Repository
Create a Branch: git checkout -b feature/your-feature
Commit Changes: git commit -m 'Add some feature'
Push to Branch: git push origin feature/your-feature
Create a Pull Request
License
This project is licensed under the MIT License.
