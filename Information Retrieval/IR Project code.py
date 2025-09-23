import tkinter as tk
from tkinter import messagebox, scrolledtext
import re
from tkinter import ttk
import os
from typing import List, Dict, Set
from nltk.tokenize import word_tokenize as tokenize

# Get the directory where the script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

class InvertedIndex:
    def __init__(self):
        self.stop_words = {'is', 'the', 'and', 'a', 'in', 'of', 'to', 'with', 
                          'on', 'for', 'at', 'by', 'an', 'as', 'from', 'into', 'that'}

    def tokenize(self, text: str) -> List[str]:
        words = ''.join(c for c in text.lower() if c.isalnum() or c.isspace())
        return [word for word in words.split() if word not in self.stop_words]

    def stem(self, word: str) -> str:
        suffixes = ['ing', 'ed', 'es', 's']
        for suffix in suffixes:
            if word.endswith(suffix):
                return word[:-len(suffix)]
        return word

    def preprocess(self, text: str) -> List[str]:
        return [self.stem(word) for word in self.tokenize(text)]

    def build_inverted_index(self, documents: List[str]) -> Dict[str, Dict[str, int]]:
        inverted_index = {}
        tokens_list = [self.preprocess(doc) for doc in documents]

        for doc_id, tokens in enumerate(tokens_list, 1):
            for token in tokens:
                if token not in inverted_index:
                    inverted_index[token] = {}
                doc_key = f"Document {doc_id}"
                inverted_index[token][doc_key] = inverted_index[token].get(doc_key, 0) + 1

        return inverted_index

def display_inverted_index(inverted_index):
    """
    Converts the inverted index into a readable string.
    """
    result = "Inverted Index:\n"
    for term, doc_dict in sorted(inverted_index.items()):
        result += f"{term} -> {', '.join([f'{doc}: {freq}' for doc, freq in doc_dict.items()])}\n"
    return result

def boolean_retrieval(query, inverted_index):
    """
    Boolean retrieval using AND, OR, and NOT operators.
    """
    query = query.lower()
    query_tokens = re.split(r'\s+', query)
    
    if 'and' in query_tokens:
        terms = [term for term in query_tokens if term != 'and']
        results = set(inverted_index.get(terms[0], {}).keys())
        for term in terms[1:]:
            results.intersection_update(inverted_index.get(term, {}).keys())
        return results
    elif 'or' in query_tokens:
        terms = [term for term in query_tokens if term != 'or']
        results = set(inverted_index.get(terms[0], {}).keys())
        for term in terms[1:]:
            results.update(inverted_index.get(term, {}).keys())
        return results
    elif 'not' in query_tokens:
        terms = [term for term in query_tokens if term not in ['not']]
        results = set(inverted_index.get(terms[0], {}).keys())
        for term in terms[1:]:
            results.difference_update(inverted_index.get(term, {}).keys())
        return results
    else:
        terms = query_tokens
        results = set(inverted_index.get(terms[0], {}).keys())
        for term in terms[1:]:
            results.intersection_update(inverted_index.get(term, {}).keys())
        return results

def ranked_retrieval(query, inverted_index, total_docs):
    """
    Ranked retrieval based on term frequency (TF).
    """
    query_tokens = tokenize(query)
    scores = {doc: 0 for doc in range(1, total_docs + 1)}  # Initialize scores
    
    # Calculate term frequency (TF) scores for each document
    for term in query_tokens:
        if term in inverted_index:
            for doc, freq in inverted_index[term].items():
                doc_id = int(doc.split()[1])  # Extract document number
                scores[doc_id] += freq  # Add the term frequency to the document's score

    # Rank documents based on their scores (in descending order of score)
    ranked_docs = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    
    # Prepare the result with document names and their corresponding scores
    ranked_result = []
    for doc_id, score in ranked_docs:
        if score > 0:  # Only include documents with a non-zero score
            ranked_result.append(f"Document {doc_id} (Score: {score})")
    
    return ranked_result

def evaluate_system(query, retrieved_documents, relevant_documents):
    """
    Evaluates the retrieval system using precision and recall.
    """
    # Get relevant documents for the query (this will work now that relevant_documents is a dictionary)
    relevant_docs = relevant_documents.get(query, set())
    
    # Calculate True Positives (TP): Documents that are relevant and retrieved
    true_positives = len(set(retrieved_documents).intersection(relevant_docs))
    
    # Calculate Precision and Recall
    precision = true_positives / len(retrieved_documents) if retrieved_documents else 0
    recall = true_positives / len(relevant_docs) if relevant_docs else 0
    
    return precision, recall



def process_cisi_data():
    """
    Processes the CISI dataset to load documents and relevance judgments from hardcoded paths.
    Limits to first 400 documents.
    """
    global documents, relevant_documents
    relevant_documents = {}

    try:
        # Updated paths to use absolute paths
        cisi_all_path = os.path.join(SCRIPT_DIR, "CISI.ALL")
        cisi_rel_path = os.path.join(SCRIPT_DIR, "CISI.REL")

        # Load documents (CISI.ALL)
        with open(cisi_all_path, 'r') as file:
            content = file.read()
        # Split by .I and limit to first 400 documents
        all_docs = [doc.strip() for doc in content.split('.I') if doc]
        documents = all_docs[0:400]  # Take only first 400 documents

        # Manually parse relevance judgments (CISI.REL)
        relevant_documents = {}
        with open(cisi_rel_path, 'r') as file:
            for line in file:
                parts = line.strip().split()
                if len(parts) >= 2:
                    query_id = parts[0]
                    doc_id = int(parts[1])
                    # Only include relevance data for first 400 documents
                    if doc_id <= 400:
                        query = f"query{query_id}"
                        doc = f"Document {doc_id}"
                        if query not in relevant_documents:
                            relevant_documents[query] = set()
                        relevant_documents[query].add(doc)
        
        messagebox.showinfo("Success", f"CISI dataset loaded successfully! number of documents={len(documents)}")
    except Exception as e:
        messagebox.showerror("Error", f"Failed to load CISI dataset: {e}")

def search_inverted_index(query, inverted_index, retrieval_model, total_docs):
    """
    Searches the inverted index using the specified retrieval model (Boolean or Ranked).
    """
    if retrieval_model == "boolean":
        return list(boolean_retrieval(query, inverted_index))
    elif retrieval_model == "ranked":
        return ranked_retrieval(query, inverted_index, total_docs)
    return []



def perform_query():
    """
    Performs a query search using the inverted index.
    """
    if not inverted_index:
        messagebox.showwarning("No Inverted Index", "Please build the inverted index first.")
        return

    # Get the query and normalize it (remove extra whitespace and join multiple lines)
    query_text = ' '.join(query_entry.get().strip().split())
    if not query_text:
        messagebox.showwarning("Empty Query", "Please enter a query.")
        return
    
    # Find query ID for the current query text
    query_id = None
    print(f"\nSearching for query text: '{query_text}'")  # Debug print
    
    # Normalize queries for comparison
    query_text_lower = query_text.lower()
    for qid, text in queries_dict.items():
        # Normalize stored query text
        stored_text = ' '.join(text.split()).lower()
        print(f"Comparing with Query {qid}: '{stored_text}'")  # Debug print
        
        if query_text_lower == stored_text:
            query_id = qid
            print(f"Exact match found! Query ID: {query_id}")  # Debug print
            break
    
    retrieval_model = model_var.get()
    results = search_inverted_index(query_text, inverted_index, retrieval_model, len(documents))
    
    # Convert results to a set of document IDs
    retrieved_docs = set()
    for result in results:
        if '(' in result:  # Ranked retrieval format
            doc_id = result.split('(')[0].replace("Document ", "").strip()
        else:  # Boolean retrieval format
            doc_id = result.replace("Document ", "").strip()
        retrieved_docs.add(doc_id)
    
    # Format results for display
    result_text = f"Query ID: {query_id}\n"
    result_text += f"Query: '{query_text}'\n\n"
    if results:
        result_text += "Retrieved documents:\n" + "\n".join(results)
    else:
        result_text += "No documents found."
    
    # Calculate and display precision and recall if we have relevance data
    if query_id and query_id in relevance_dict:
        relevant_set = relevance_dict[query_id]
        true_positives = len(retrieved_docs.intersection(relevant_set))
        
        precision = true_positives / len(retrieved_docs) if retrieved_docs else 0
        recall = true_positives / len(relevant_set) if relevant_set else 0
        
        result_text += f"\n\nEvaluation Metrics:"
        result_text += f"\nPrecision: {precision:.2f}"
        result_text += f"\nRecall: {recall:.2f}"
        result_text += f"\n\nRelevance Details:"
        result_text += f"\nRelevant documents: {sorted(relevant_set)}"
        result_text += f"\nRetrieved documents: {sorted(retrieved_docs)}"
        result_text += f"\nCorrectly retrieved: {sorted(retrieved_docs.intersection(relevant_set))}"
    else:
        print(f"No relevance data found for query_id: {query_id}")  # Debug print
        print(f"Available relevance query IDs: {list(relevance_dict.keys())}")  # Debug print
        result_text += "\n\nNo relevance data available for this query."

    output_text.delete(1.0, tk.END)
    output_text.insert(tk.END, result_text)

def build_index():
    """
    Builds the inverted index from loaded documents.
    """
    global inverted_index
    if not documents:
        messagebox.showwarning("No Documents", "Please load the dataset first.")
        return
    
    # Create instance of InvertedIndex and build the index
    indexer = InvertedIndex()
    inverted_index = indexer.build_inverted_index(documents)
    
    output_text.delete(1.0, tk.END)
    output_text.insert(tk.END, display_inverted_index(inverted_index))

def load_queries(qry_file_path):
    """
    Load queries from the qry file.
    Format:
    .I query_id
    .W
    query_text (can be multiple lines)
    """
    queries = {}
    current_id = None
    current_text = []
    reading_query = False
    
    try:
        with open(qry_file_path, 'r', encoding='utf-8') as file:
            for line in file:
                line = line.strip()
                
                if line.startswith('.I'):
                    # If we were reading a previous query, save it
                    if current_id is not None and current_text:
                        queries[current_id] = ' '.join(current_text).strip()
                        current_text = []
                    
                    # Get new query ID
                    current_id = line.split('.I')[1].strip()
                    reading_query = False
                    
                elif line.startswith('.W'):
                    reading_query = True
                    
                elif reading_query and line:  # If we're reading query text and line is not empty
                    current_text.append(line)
            
            # Don't forget to save the last query
            if current_id is not None and current_text:
                queries[current_id] = ' '.join(current_text).strip()
        
        # Debug print to see what we loaded
        print("\nLoaded Queries:")
        for qid, text in queries.items():
            print(f"Query {qid}: {text}")
            
        return queries
    except Exception as e:
        print(f"Error reading query file: {str(e)}")
        return {}

def load_relevance_judgments(rel_file_path):
    """
    Load relevance judgments from the rel file.
    Format: query_id doc_id relevance score
    """
    relevance = {}
    try:
        with open(rel_file_path, 'r', encoding='utf-8') as file:
            for line in file:
                # Skip empty lines
                if not line.strip():
                    continue
                    
                # Split the line and remove extra whitespace
                parts = [part.strip() for part in line.split() if part.strip()]
                if len(parts) >= 2:  # We need at least query_id and doc_id
                    query_id = parts[0]
                    doc_id = parts[1]
                    
                    # Initialize set for this query if it doesn't exist
                    if query_id not in relevance:
                        relevance[query_id] = set()
                    
                    # Add the document ID to the set of relevant documents
                    relevance[query_id].add(doc_id)
        
        # Debug prints
        print(f"\nLoaded relevance judgments:")
        print(f"Total queries with relevance data: {len(relevance)}")
        for qid in sorted(relevance.keys()):
            print(f"Query {qid}: {len(relevance[qid])} relevant documents")
        
        return relevance
    except Exception as e:
        print(f"Error reading relevance file: {str(e)}")
        return {}

# File paths - update to use absolute paths
QRY_FILE = os.path.join(SCRIPT_DIR, "CISI.QRY")
REL_FILE = os.path.join(SCRIPT_DIR, "CISI.REL")

# Load both files when starting the application
queries_dict = load_queries(QRY_FILE)
relevance_dict = load_relevance_judgments(REL_FILE)

# Tkinter UI
root = tk.Tk()
root.title("CISI Dataset Retrieval System")

documents = []
relevant_documents = {}
inverted_index = {}

# UI Elements
load_button = tk.Button(root, text="Load CISI Dataset", command=process_cisi_data, font=("Arial", 14))
build_button = tk.Button(root, text="Build Inverted Index", command=build_index, font=("Arial", 14))
query_label = tk.Label(root, text="Enter Query:", font=("Arial", 12))
query_entry = tk.Entry(root, font=("Arial", 12), width=40)
query_entry.bind("<Return>", lambda event: perform_query())
query_button = tk.Button(root, text="Search", command=perform_query, font=("Arial", 14))
model_var = tk.StringVar(value="boolean")
boolean_radio = tk.Radiobutton(root, text="Boolean Retrieval", variable=model_var, value="boolean", font=("Arial", 12))
ranked_radio = tk.Radiobutton(root, text="Ranked Retrieval", variable=model_var, value="ranked", font=("Arial", 12))
output_text = scrolledtext.ScrolledText(root, wrap=tk.WORD, font=("Courier", 12), width=80, height=20)

# Add this to your GUI setup code
def setup_query_selection():
    query_frame = ttk.LabelFrame(root, text="Available Queries")
    query_frame.pack(padx=5, pady=5, fill="x")
    
    # Create a combobox with available queries
    query_var = tk.StringVar()
    query_combo = ttk.Combobox(query_frame, width=50)
    # Show both query ID and text in the dropdown
    query_combo['values'] = [f"{qid}: {text}" for qid, text in queries_dict.items()]
    query_combo.pack(padx=5, pady=5, fill="x")
    
    def on_query_selected(event):
        selected = query_combo.get()
        if selected:
            # Extract just the query text (remove the ID) and put it in the search box
            query_text = selected.split(': ', 1)[1]
            query_entry.delete(0, tk.END)
            query_entry.insert(0, query_text)
    
    query_combo.bind('<<ComboboxSelected>>', on_query_selected)

# Place UI Elements
load_button.pack(pady=10)
build_button.pack(pady=10)
query_label.pack(pady=5)
query_entry.pack(pady=5)
query_button.pack(pady=10)
boolean_radio.pack(pady=5)
ranked_radio.pack(pady=5)
output_text.pack(pady=10, padx=10)

root.mainloop()
