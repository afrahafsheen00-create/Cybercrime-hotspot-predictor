import joblib
import pandas as pd
from pathlib import Path

# Find project directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Load trained model
MODEL_FILE = BASE_DIR / "ml" / "models" / "risk_model.joblib"

model = joblib.load(MODEL_FILE)

print("\n========================================")
print("   CYBERCRIME RISK PREDICTION SYSTEM")
print("========================================")

# Get user input
complaints = int(input("Number of complaints: "))
fraud_amount = float(input("Fraud amount (₹): "))
suspicious_withdrawals = int(input("Suspicious withdrawals: "))
hour = int(input("Hour (0-23): "))

# Prepare input
import pandas as pd

new_data = pd.DataFrame([{
    "complaints": complaints,
    "fraud_amount": fraud_amount,
    "suspicious_withdrawals": suspicious_withdrawals,
    "hour": hour
}])

# Predict
prediction = model.predict(new_data)[0]

# Prediction probability
probabilities = model.predict_proba(new_data)[0]
classes = model.classes_

print("\n----------------------------------------")
print(f"Predicted Risk Level: {prediction}")
print("----------------------------------------")

print("\nPrediction probabilities:")

for class_name, probability in zip(classes, probabilities):
    print(f"{class_name}: {probability * 100:.2f}%")

if prediction == "HIGH":
    print("\n🔴 HIGH RISK")
    print("Immediate attention recommended.")

elif prediction == "MEDIUM":
    print("\n🟠 MEDIUM RISK")
    print("Additional monitoring recommended.")

else:
    print("\n🟢 LOW RISK")
    print("Continue monitoring.")