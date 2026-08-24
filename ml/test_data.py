import pandas as pd
from pathlib import Path

# Find the main project folder
BASE_DIR = Path(__file__).resolve().parent.parent

# Build the correct path to the dataset
DATA_FILE = BASE_DIR / "data" / "cybercrime_data.csv"

data = pd.read_csv(DATA_FILE)

print(data)

print("\nNumber of records:", len(data))
print("Columns:", list(data.columns))