import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

# Project directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Dataset
DATA_FILE = BASE_DIR / "data" / "training_data.csv"

# Load data
data = pd.read_csv(DATA_FILE)

# Features used by the model
features = [
    "complaints",
    "fraud_amount",
    "suspicious_withdrawals",
    "hour"
]

X = data[features]
y = data["risk_level"]

# Split data into training and testing
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.25,
    random_state=42,
    stratify=y
)

# Create model
model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

# Train
model.fit(X_train, y_train)

# Test
predictions = model.predict(X_test)

accuracy = accuracy_score(y_test, predictions)

print("\nMODEL TRAINING COMPLETE")
print("=" * 50)
print(f"Accuracy: {accuracy:.2f}")

print("\nClassification Report:")
print(classification_report(y_test, predictions))

# Save model
MODEL_DIR = BASE_DIR / "ml" / "models"
MODEL_DIR.mkdir(exist_ok=True)

MODEL_FILE = MODEL_DIR / "risk_model.joblib"

joblib.dump(model, MODEL_FILE)

print(f"\nModel saved to: {MODEL_FILE}")