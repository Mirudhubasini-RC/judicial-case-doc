from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import pandas as pd
import re
import string
from io import BytesIO
import PyPDF2
from docx import Document
from nltk.corpus import stopwords
from nltk.stem.wordnet import WordNetLemmatizer
import nltk

nltk.download('stopwords')

app = Flask(__name__)
CORS(app, resources={r"/classify": {"origins": "*"}})

# Paths to CSV files
INTERVIEW_MAPPING_CSV = '/Users/mirudhubasinirc/Documents/JudicialCaseDoc/judicial-case-doc/Interview_Mapping.csv'
KEYWORDS_CSV = '/Users/mirudhubasinirc/Documents/JudicialCaseDoc/keywords.csv'

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

def check_interview_mapping(file_name):
    file_name_without_extension = os.path.splitext(file_name)[0]
    df = pd.read_csv(INTERVIEW_MAPPING_CSV)
    
    label_row = df[df['Judgements'] == file_name_without_extension]
    if not label_row.empty:
        area_of_law = label_row['Area.of.Law'].values[0]
        # Check if the area of law is "to be tested"
        if area_of_law.strip().lower() == "to be tested":
            return None  # Return None if the area is "to be tested"
        return area_of_law
    else:
        return None
    
def load_keyword_map():
    keywords_df = pd.read_csv(KEYWORDS_CSV)
    
    keyword_map = {}
    for idx, row in keywords_df.iterrows():
        category = row['Category '].strip()  # Ensure no trailing/leading spaces in 'Category'
        keywords = row['Keywords'].split(', ')  # Split by ', ' for each keyword
        keyword_map[category] = keywords

    return keyword_map

# Load the keyword map globally (you can move this to be loaded at app startup)
keyword_map = load_keyword_map()

# Classify document based on keywords
def classify_document_by_keywords(text, keyword_map):
    text = text.lower()  # Convert document text to lowercase for case-insensitive matching
    
    # Initialize a dictionary to store match counts for each category
    category_match_counts = {category: 0 for category in keyword_map.keys()}
    
    # Check each word against all categories' keywords
    for category, keywords in keyword_map.items():
        for keyword in keywords:
            if keyword.lower() in text:
                category_match_counts[category] += 1
    
    # Get the category with the highest match count
    sorted_categories = sorted(category_match_counts.items(), key=lambda x: x[1], reverse=True)

    top_category, top_count = sorted_categories[0]
    
    if len(sorted_categories) > 1:
        second_category, second_count = sorted_categories[1]
        if abs(top_count - second_count) <= 10:
            return f'{top_category}, {second_category}'
    
    return top_category

# Function to find important terms
def find_important_terms(text, keyword_map):
    text = text.lower()  # Convert document text to lowercase for case-insensitive matching
    important_terms = []
    
    # Iterate over each category and its associated keywords
    for category, keywords in keyword_map.items():
        for keyword in keywords:
            if keyword.lower() in text:
                important_terms.append(keyword)
    
    return list(set(important_terms))  # Return unique keywords

@app.route('/classify', methods=['POST'])
def classify():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    print(f'Received file: {file.filename}, Size: {file.content_length}')
    
    file_data = file.read()
    content_type = file.content_type
    
    try:
        # Convert file to text
        text = convert_to_text(file_data, content_type)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    # Check if the document is already classified in Interview_Mapping.csv
    classification = check_interview_mapping(file.filename)
    
    if classification:
        result = {
            'final_classification': classification,
            'important_terms': find_important_terms(text, keyword_map),  # Extract important terms
            'clean_text': clean_text(text)  # Return the cleaned text of the document
        }
    else:
        # Perform keyword-based classification if not found in Interview_Mapping.csv
        final_classification = classify_document_by_keywords(text, keyword_map)
        result = {
            'final_classification': final_classification,
            'important_terms': find_important_terms(text, keyword_map),  # Extract important terms
            'clean_text': clean_text(text)  # Return the cleaned text of the document
        }
    
    return jsonify(result)


if __name__ == '__main__':
    app.run(port=8000, debug=True)
