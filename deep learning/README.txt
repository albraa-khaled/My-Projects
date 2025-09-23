student name :albara 
Supervised by: D. Mohammad Almseidin

Title: Sentiment Analysis with LSTM on IMDB Dataset

This project performs binary sentiment classification (positive or negative) using a Long Short-Term Memory (LSTM) neural network. The dataset is a CSV file containing movie reviews and corresponding sentiment labels.

Dataset
Format: CSV with two columns — review and sentiment
review: textual movie review
sentiment: either "positive" or "negative"

| review                      | sentiment |
| --------------------------- | --------- |
| "The film was amazing!"     | positive  |
| "I didn’t enjoy the movie." | negative  |

Model Architecture:
Tokenization & Padding: Max 10,000 words, padded to length 200
Embedding Layer: maps words to dense vectors
LSTM Layer: 64 units
Dense Output Layer: 1 neuron with sigmoid activation

Training Details:
Loss Function: Binary Cross entropy	
Optimizer: Adam
Epochs: 10
Batch Size: 64
Validation Split: 20%

Evaluation:
Metric: Accuracy

Additional: Loss curve, accuracy curve, and confusion matrix

accuracy on test data: 87.77%

Requirements:
tensorflow 
pandas 
scikit-learn 
matplotlib

How to Run:
1-)Ensure the CSV file and the Jupyter Notebook in the same folder
2-)Run all cells in the Jupyter Notebook

Future Work:
Try Bidirectional LSTM
Use pretrained word embeddings like GloVe
Experiment with GRU or Transformer models
Add GUI using Streamlit or deploy with Flask
