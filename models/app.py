from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import tensorflow as tf
from sklearn.feature_extraction.text import TfidfVectorizer
from gensim.models import Word2Vec
from io import BytesIO
import PyPDF2
from docx import Document
import re
import string
import os
import pandas as pd
import nltk
nltk.download('stopwords')
from nltk.corpus import stopwords
from nltk.stem.wordnet import WordNetLemmatizer

app = Flask(__name__)
CORS(app, resources={r"/classify": {"origins": "*"}})

# Load models
dnn_model = tf.keras.models.load_model('/Users/mirudhubasinirc/Documents/JudicialCaseDoc/judicial-case-doc/models/dnn_model.h5')
mlp_model = joblib.load('/Users/mirudhubasinirc/Documents/JudicialCaseDoc/judicial-case-doc/models/mlp_model.pkl')
vectorizer = joblib.load('/Users/mirudhubasinirc/Documents/JudicialCaseDoc/judicial-case-doc/models/tfidf_vectorizer.pkl')
word2vec_model = Word2Vec.load('/Users/mirudhubasinirc/Documents/JudicialCaseDoc/judicial-case-doc/models/word2vec_model.model')

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

# Convert document to text
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

# Text preprocessing
def clean_text(text: str) -> str:
    stop = set(stopwords.words('english'))
    punct = string.punctuation
    lemmatizer = WordNetLemmatizer()

    # Remove links
    text = re.sub(r'http(s)?:\/\/\S*', '', text)
    # Remove newlines and normalize
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
    print("Request received")
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        print('No selected file')
        return jsonify({'error': 'No selected file'}), 400
    
    print(f'Received file: {file.filename}, Size: {file.content_length}')
    content_type = file.content_type
    file_data = file.read()
    
    try:
        # Preprocess the file
        text = convert_to_text(file_data, content_type)
        processed_data = preprocess_file(file_data, content_type)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    # Ensure processed_data is 2D
    processed_data = processed_data.reshape(1, -1)

    # Get probabilities from DNN and MLP
    try:
        dnn_probs = dnn_model.predict(processed_data)[0]
        mlp_probs = mlp_model.predict_proba(processed_data)[0]

        # Combine the probabilities from both models (average)
        avg_probs = (dnn_probs + mlp_probs) / 2
        
        # Set a threshold for multi-class classification
        threshold = 0.3
        
        # Identify classes that exceed the threshold
        multi_class_labels = [class_names[i] for i, prob in enumerate(avg_probs) if prob >= threshold]
        
        if not multi_class_labels:
            # If no class exceeds the threshold, return the class with the highest probability
            final_classification = class_names[np.argmax(avg_probs)]
        else:
            final_classification = ', '.join(multi_class_labels)

        # Get important words based on classification
        highlighted_words = identify_important_words(text, avg_probs)

    except Exception as e:
        print(f"Error in prediction: {e}")
        return jsonify({'error': 'Prediction failed'}), 500
    
    # Return the final classification and highlighted words in the response
    result = {
        'final_classification': final_classification,
        'highlighted_words': highlighted_words
    }
    
    return jsonify(result)

def identify_important_words(text: str, avg_probs: np.ndarray) -> dict:
    """
    Identify and return words to highlight based on classification probabilities.
    This function can be customized based on your classification logic.
    """
    # Example logic for identifying important words (modify as needed)
    words = text.split()
    important_words = {}

    # For simplicity, consider the top words in the input text
    # (You can also use your model's features or gradients for better accuracy)
    for i, word in enumerate(words):
        # Highlight words that contribute to the classification (e.g., based on some logic)
        if avg_probs[i] >= 0.3:  # Adjust logic as necessary
            important_words[word] = i
    
    return important_words



if __name__ == '__main__':
    app.run(port=9000, debug=True)
