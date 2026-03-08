import camelot
import pandas as pd
import numpy as np
import re

PDF_PATH = "Maharashtra-GWRE-2024.pdf"
OUTPUT_CSV = "clean_groundwater_data.csv"

print("📄 Reading PDF using Camelot...")

# Try lattice first (for bordered tables)
tables = camelot.read_pdf(
    PDF_PATH,
    pages="all",
    flavor="lattice"
)

# If no tables found, fallback to stream
if tables.n == 0:
    print("⚠ No tables found in lattice mode. Switching to stream mode...")
    tables = camelot.read_pdf(
        PDF_PATH,
        pages="all",
        flavor="stream"
    )

print(f"✅ Total tables detected: {tables.n}")

all_dfs = []

for i, table in enumerate(tables):
    df = table.df

    # Remove completely empty rows
    df.replace("", np.nan, inplace=True)
    df.dropna(how="all", inplace=True)

    if df.shape[0] < 5:
        continue  # skip very small tables

    # Remove newline characters
    df = df.replace(r"\n", " ", regex=True)

    # Fix broken decimals like "423. 9"
    df = df.replace(r"(\d+)\.\s+(\d+)", r"\1.\2", regex=True)

    # Strip spaces
    df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)

    all_dfs.append(df)

if not all_dfs:
    print("❌ No usable tables found.")
    exit()

print("🧹 Cleaning and merging tables...")

# Merge all tables
final_df = pd.concat(all_dfs, ignore_index=True)

# Remove columns that are 90% empty
threshold = int(0.9 * len(final_df))
final_df = final_df.dropna(axis=1, thresh=len(final_df) - threshold)

# Remove rows that are mostly empty
final_df = final_df.dropna(thresh=5)

# Reset index
final_df.reset_index(drop=True, inplace=True)

# Save cleaned CSV
final_df.to_csv(OUTPUT_CSV, index=False)

print(f"🎉 Clean data saved to {OUTPUT_CSV}")
print("Final shape:", final_df.shape)