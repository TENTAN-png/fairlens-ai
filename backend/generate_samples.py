import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

# Set random seed for reproducibility
np.random.seed(42)

# Generate synthetic dataset
n_samples = 1000

# Features
# Income: Higher is better for approval
income = np.random.normal(50000, 15000, n_samples)
# Credit Score: Higher is better
credit_score = np.random.normal(650, 50, n_samples)
# Years at job
years_at_job = np.random.poisson(5, n_samples)

# Sensitive Feature: Gender (Male / Female)
gender = np.random.choice(['Male', 'Female'], n_samples, p=[0.5, 0.5])

# Introduce bias: Males artificially get a bump in their underlying "score"
# to make the model biased against Females
base_score = (income / 10000) + (credit_score / 100) + years_at_job
bias_effect = np.where(gender == 'Male', 3.0, 0.0)
final_score = base_score + bias_effect

# Threshold for approval
threshold = np.percentile(final_score, 50)
approved = (final_score >= threshold).astype(int)

# Create DataFrame
df = pd.DataFrame({
    'Income': income.round(2),
    'Credit_Score': credit_score.round(0).astype(int),
    'Years_at_Job': years_at_job,
    'Gender': gender,
    'Approved': approved
})

# Save dataset
dataset_path = 'sample_credit_dataset.csv'
df.to_csv(dataset_path, index=False)
print(f"Dataset saved to {dataset_path}")

# Train a Model
# Encode Gender for the model (Male=1, Female=0)
X = df.drop('Approved', axis=1)
X['Gender'] = (X['Gender'] == 'Male').astype(int)
y = df['Approved']

model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
model.fit(X, y)

# Save model
model_path = 'sample_credit_model.pkl'
joblib.dump(model, model_path)
print(f"Model saved to {model_path}")
