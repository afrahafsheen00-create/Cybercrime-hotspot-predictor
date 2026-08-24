import pandas as pd
from pathlib import Path

# Find project directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Load dataset
DATA_FILE = BASE_DIR / "data" / "cybercrime_data.csv"
data = pd.read_csv(DATA_FILE)


def calculate_risk(row):
    # Normalize complaints: 0-100
    complaint_score = min(row["complaints"] / 50 * 100, 100)

    # Normalize fraud amount: 0-100
    fraud_score = min(row["fraud_amount"] / 1_000_000 * 100, 100)

    # Normalize suspicious withdrawals: 0-100
    withdrawal_score = min(
        row["suspicious_withdrawals"] / 40 * 100,
        100
    )

    # Higher risk during evening/night hours
    if row["hour"] >= 18 or row["hour"] <= 23:
        time_score = 100
    else:
        time_score = 40

    # Weighted risk score
    risk_score = (
        complaint_score * 0.30
        + fraud_score * 0.30
        + withdrawal_score * 0.30
        + time_score * 0.10
    )

    return round(risk_score, 2)


# Calculate risk score
data["risk_score"] = data.apply(calculate_risk, axis=1)


# Convert score into risk category
def risk_category(score):
    if score < 40:
        return "LOW"
    elif score < 70:
        return "MEDIUM"
    else:
        return "HIGH"


data["risk_level"] = data["risk_score"].apply(risk_category)


# Display results
print("\nCYBERCRIME RISK ANALYSIS")
print("=" * 60)

print(
    data[
        [
            "location",
            "hour",
            "complaints",
            "fraud_amount",
            "suspicious_withdrawals",
            "risk_score",
            "risk_level",
        ]
    ].to_string(index=False)
)