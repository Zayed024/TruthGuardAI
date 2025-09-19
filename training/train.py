# train.py (Production Model Trainer)
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.svm import LinearSVC
from sklearn.multiclass import OneVsRestClassifier
import joblib

print("Loading the full corpus for training the production model...")
df =pd.read_csv('data/corpus.tsv', sep='\t')

labels = list(zip(df.fact.values, df.bias.values))
outlets = df.source_url_normalized.values

mlb = MultiLabelBinarizer()
y_train_mlb = mlb.fit_transform(labels)

vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=1000)
X_train_tfidf = vectorizer.fit_transform(outlets)

print("Training the classification model on all data...")
clf = OneVsRestClassifier(LinearSVC(random_state=42), n_jobs=-1)
clf.fit(X_train_tfidf, y_train_mlb)
print("Training complete.")

print("Saving the production model and vectorizer to files...")
joblib.dump(clf, 'model.joblib')
joblib.dump(vectorizer, 'vectorizer.joblib')
joblib.dump(mlb, 'mlb.joblib') # Save the fitted binarizer

print("\n✅ Successfully trained and saved production model files.")