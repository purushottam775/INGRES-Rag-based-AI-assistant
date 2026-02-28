import pdfplumber
import pandas as pd

pdf_path = "Maharashtra-GWRE-2024.pdf"

all_tables = []

with pdfplumber.open(pdf_path) as pdf:
    for page_number, page in enumerate(pdf.pages):
        tables = page.extract_tables()

        for table in tables:
            if not table or len(table) < 2:
                continue

            # Clean header row
            header = table[0]
            header = [
                f"col_{i}" if h is None or h == "" else h.strip()
                for i, h in enumerate(header)
            ]

            # Make headers unique
            seen = {}
            unique_header = []
            for h in header:
                if h in seen:
                    seen[h] += 1
                    unique_header.append(f"{h}_{seen[h]}")
                else:
                    seen[h] = 0
                    unique_header.append(h)

            df = pd.DataFrame(table[1:], columns=unique_header)

            df["page"] = page_number + 1
            all_tables.append(df)

if len(all_tables) == 0:
    print("No tables found ❌")
else:
    final_df = pd.concat(all_tables, ignore_index=True)
    final_df.to_csv("clean_table.csv", index=False)
    final_df.to_json("clean_data.json", orient="records", indent=2)
    print("Extraction Complete ✅")