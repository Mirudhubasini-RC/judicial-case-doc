from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import gridfs
import joblib
import numpy as np
import tensorflow as tf
from gensim.models import Word2Vec
from io import BytesIO
import PyPDF2
from docx import Document
import re
import string

from nltk.corpus import stopwords
from nltk.stem.wordnet import WordNetLemmatizer

app = Flask(__name__)
CORS(app, resources={r"/classify": {"origins": "*"}})


# MongoDB setup
client = MongoClient("mongodb+srv://Mirudhu:Admin@bucket.uxr7nhr.mongodb.net/Classification")
db = client['Classification']
fs = gridfs.GridFS(db)

# Load the models
dnn_model = tf.keras.models.load_model('/Users/mirudhubasinirc/Documents/JudicialCaseDoc/judicial-case-doc/model.py/dnn_model.h5')
mlp_model = joblib.load('/Users/mirudhubasinirc/Documents/JudicialCaseDoc/judicial-case-doc/model.py/mlp_model.pkl')
vectorizer = joblib.load('/Users/mirudhubasinirc/Documents/JudicialCaseDoc/judicial-case-doc/model.py/tfidf_vectorizer.pkl')
word2vec_model = Word2Vec.load('/Users/mirudhubasinirc/Documents/JudicialCaseDoc/judicial-case-doc/model.py/word2vec_model.bin')

# Define class names
class_names = {
    0: 'Administrative Law', 1: 'Alternative Dispute Resolution', 2: 'Arbitration', 
    3: 'Armed Forces', 4: 'Banking And Finance', 5: 'Civil Laws', 
    6: 'Civil Procedure', 7: 'Company Law', 8: 'Constitution', 
    9: 'Consumer Law', 10: 'Contempt Of Court', 11: 'Contract', 
    12: 'Cooperative Societies', 13: 'Criminal Laws', 14: 'Criminal Procedure', 
    15: 'Customs', 16: 'Education', 17: 'Election Laws', 
    18: 'Employment And Labour Law', 19: 'Evidence', 20: 'Excise', 
    21: 'Family Law', 22: 'Government Contracts', 23: 'Income Tax', 
    24: 'Insurance Law', 25: 'Intellectual Property Laws', 26: 'Legal Profession', 
    27: 'Limitation', 28: 'Local Government', 29: 'Media And Telecommunication Laws', 
    30: 'Motor Vehicles', 31: 'Natural Resources And Energy', 32: 'Negotiable Instruments', 
    33: 'Partnership And Joint Ventures', 34: 'Property Laws', 35: 'Registration', 
    36: 'Sales Tax And Vat', 37: 'Service Law', 38: 'Succession Laws', 
    39: 'Tenancy Laws', 40: 'Transport Law'
}

# Text conversion functions
def convert_to_text(file_data: bytes, content_type: str) -> str:
    if 'pdf' in content_type:
        return convert_pdf_to_text(file_data)
    elif 'doc' in content_type:
        return convert_doc_to_text(file_data)
    elif 'text' in content_type:
        return file_data.decode('utf-8')
    else:
        raise ValueError('Unsupported file type')

def convert_pdf_to_text(file_data: bytes) -> str:
    text = ''
    with BytesIO(file_data) as pdf_file:
        reader = PyPDF2.PdfFileReader(pdf_file)
        for page_num in range(reader.numPages):
            text += reader.getPage(page_num).extract_text()
    return text

def convert_doc_to_text(file_data: bytes) -> str:
    text = ''
    with BytesIO(file_data) as doc_file:
        doc = Document(doc_file)
        for paragraph in doc.paragraphs:
            text += paragraph.text + '\n'
    return text

# Text preprocessing function
def clean_text(text: str) -> str:
    stop = set(stopwords.words('english'))
    punct = string.punctuation
    lemmatizer = WordNetLemmatizer()

    # Remove links
    text = re.sub(r'http(s)?:\/\/\S*', '', text)
    # Remove newlines and normalization
    text = ' '.join([elem.replace('\n', ' ') for elem in text])
    text = ' '.join([elem for elem in text.lower().split() if elem not in stop])
    # Remove punctuation and digits
    text = ''.join([char for char in text if char not in punct and not char.isdigit()])
    # Lemmatization
    text = ' '.join(lemmatizer.lemmatize(word) for word in text.split())
    return text

def get_word2vec_vector(tokens: list, model: Word2Vec) -> np.ndarray:
    vectorized_text = np.zeros((model.vector_size,))
    word_count = 0

    for word in tokens:
        if word in model.wv:
            vectorized_text += model.wv[word]
            word_count += 1

    if word_count > 0:
        vectorized_text /= word_count
    return vectorized_text

def preprocess_file(file_data: bytes, content_type: str) -> np.ndarray:
    text = convert_to_text(file_data, content_type)
    text_cleaned = clean_text(text)
    tokens = text_cleaned.split()

    # Convert using TF-IDF
    tfidf_vector = vectorizer.transform([text_cleaned]).toarray()

    # Convert using Word2Vec
    word2vec_vector = get_word2vec_vector(tokens, word2vec_model)
    
    # Reshape word2vec_vector to 2D
    word2vec_vector = word2vec_vector.reshape(1, -1)
    
    # Combine both vectors
    combined_vector = np.hstack((tfidf_vector, word2vec_vector))
    
    # Ensure combined_vector is 2D
    combined_vector = combined_vector.reshape(1, -1)
    return combined_vector

@app.route('/')
def home():
    return jsonify({'message': 'Server is running successfully!'}), 200


@app.route('/classify', methods=['POST'])
def classify():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    content_type = file.content_type
    file_data = file.read()
    
    try:
        processed_data = preprocess_file(file_data, content_type)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    # Ensure processed_data is 2D
    processed_data = processed_data.reshape(1, -1)

    # Use the DNN model for classification
    dnn_prediction = dnn_model.predict(processed_data)
    dnn_class = np.argmax(dnn_prediction, axis=1)[0]

    # Use the MLP model for classification
    mlp_prediction = mlp_model.predict(processed_data)
    
    # Check the shape of mlp_prediction
    if mlp_prediction.ndim == 1:
        mlp_class = np.argmax(mlp_prediction)  # 1D array
    else:
        mlp_class = np.argmax(mlp_prediction, axis=1)[0]  # 2D array

    # Ensemble logic: Majority Voting
    predicted_classes = [dnn_class, mlp_class]
    final_class = max(set(predicted_classes), key=predicted_classes.count)

    

    
    result = {
        'final_classification': class_names.get(final_class, 'Unknown Class')
    }
    return jsonify(result)

if __name__ == '__main__':
    app.run(port=8000, debug=True)

