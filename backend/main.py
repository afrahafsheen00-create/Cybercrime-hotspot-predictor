from pathlib import Path

import joblib
import pandas as pd

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# ==========================================
# PROJECT PATHS
# ==========================================

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_FILE = BASE_DIR / "ml" / "models" / "risk_model.joblib"

DATA_FILE = BASE_DIR / "data" / "cybercrime_data.csv"


# ==========================================
# LOAD ML MODEL
# ==========================================

model = joblib.load(MODEL_FILE)


# ==========================================
# FASTAPI APP
# ==========================================

app = FastAPI(
    title="Cybercrime Hotspot Prediction API",
    description="API for predicting cybercrime risk levels.",
    version="1.0.0",
)


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# ALERT STATUS STORAGE
# ==========================================

alert_statuses = {}


class AlertStatusUpdate(BaseModel):
    status: str


# ==========================================
# REQUEST MODEL
# ==========================================

class RiskRequest(BaseModel):
    complaints: int
    fraud_amount: float
    suspicious_withdrawals: int
    hour: int


# ==========================================
# HOME / HEALTH CHECK
# ==========================================

@app.get("/")
def home():
    return {
        "message": "Cybercrime Risk Prediction API is running"
    }


# ==========================================
# RISK PREDICTION
# ==========================================

@app.post("/predict-risk")
def predict_risk(request: RiskRequest):

    input_data = pd.DataFrame(
        [
            {
                "complaints": request.complaints,
                "fraud_amount": request.fraud_amount,
                "suspicious_withdrawals": request.suspicious_withdrawals,
                "hour": request.hour,
            }
        ]
    )

    prediction = model.predict(input_data)[0]

    probabilities = model.predict_proba(input_data)[0]

    classes = model.classes_

    probability_data = {
        class_name: round(float(probability) * 100, 2)
        for class_name, probability in zip(
            classes,
            probabilities
        )
    }

    risk_level = str(prediction)

    high_probability = probability_data.get("HIGH", 0)
    medium_probability = probability_data.get("MEDIUM", 0)
    low_probability = probability_data.get("LOW", 0)

    risk_score = round(
        (high_probability * 1.0)
        + (medium_probability * 0.5)
        + (low_probability * 0.0)
    )

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "probabilities": probability_data,
    }


# ==========================================
# HOTSPOTS
# ==========================================

@app.get("/hotspots")
def get_hotspots():

    data = pd.read_csv(DATA_FILE)

    predictions = model.predict(
        data[
            [
                "complaints",
                "fraud_amount",
                "suspicious_withdrawals",
                "hour",
            ]
        ]
    )

    hotspots = []

    for index, row in data.iterrows():

        hotspots.append(
            {
                "location": row["location"],
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"]),
                "hour": int(row["hour"]),
                "complaints": int(row["complaints"]),
                "fraud_amount": float(row["fraud_amount"]),
                "suspicious_withdrawals": int(
                    row["suspicious_withdrawals"]
                ),
                "risk": str(predictions[index]),
            }
        )

    return hotspots


# ==========================================
# ALERTS
# ==========================================

@app.get("/alerts")
def get_alerts():

    data = pd.read_csv(DATA_FILE)

    predictions = model.predict(
        data[
            [
                "complaints",
                "fraud_amount",
                "suspicious_withdrawals",
                "hour",
            ]
        ]
    )

    alerts = []

    for index, row in data.iterrows():

        risk = str(predictions[index])

        # Only HIGH and MEDIUM become alerts
        if risk in ["HIGH", "MEDIUM"]:

            alert_id = f"ALERT-{index + 1:04d}"

            alerts.append(
                {
                    "alert_id": alert_id,
                    "location": row["location"],
                    "risk": risk,
                    "message": (
                        "High cybercrime activity detected"
                        if risk == "HIGH"
                        else
                        "Moderate cybercrime activity detected"
                    ),
                    "status": alert_statuses.get(
                        alert_id,
                        "NEW"
                    ),
                    "hour": int(row["hour"]),
                    "complaints": int(row["complaints"]),
                    "fraud_amount": float(
                        row["fraud_amount"]
                    ),
                    "suspicious_withdrawals": int(
                        row["suspicious_withdrawals"]
                    ),
                }
            )

    return alerts


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


# ==========================================
# UPDATE ALERT STATUS
# ==========================================

@app.put("/alerts/{alert_id}/status")
def update_alert_status(
    alert_id: str,
    update: AlertStatusUpdate,
):

    allowed_statuses = [
        "NEW",
        "ACKNOWLEDGED",
        "RESOLVED",
    ]

    if update.status not in allowed_statuses:

        return {
            "success": False,
            "message": "Invalid status",
        }

    alert_statuses[alert_id] = update.status

    return {
        "success": True,
        "alert_id": alert_id,
        "status": update.status,
    }