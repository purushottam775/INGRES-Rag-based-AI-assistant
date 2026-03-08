import fs from "fs";
import csv from "csv-parser";
import path from "path";

const inputFile = path.join(
  process.cwd(),
  "casvdata",
  "tabula-Maharashtra-GWRE-2024 (8).csv"
);

const outputFile =
  "District_wise_annual_rainfall_and_departure_2023.json";

const results = [];

function cleanValue(value) {
  if (!value) return null;

  let v = value.trim();

  // remove line breaks
  v = v.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ");

  // remove commas in numbers (1,234 → 1234)
  if (/^[\d,]+(\.\d+)?$/.test(v)) {
    return Number(v.replace(/,/g, ""));
  }

  // convert % values (like -12% or 15%)
  if (/^-?\d+(\.\d+)?%$/.test(v)) {
    return parseFloat(v.replace("%", ""));
  }

  return v;
}

fs.createReadStream(inputFile)
  .pipe(
    csv({
      mapHeaders: ({ header }) =>
        header ? header.trim() : null, // remove empty header columns
      strict: false
    })
  )
  .on("data", (row) => {
    const cleanedRow = {};

    Object.keys(row).forEach((key) => {
      if (!key) return; // skip empty header columns

      const cleanedVal = cleanValue(row[key]);

      if (cleanedVal !== null && cleanedVal !== "") {
        cleanedRow[key.trim()] = cleanedVal;
      }
    });

    // skip fully empty rows
    if (Object.keys(cleanedRow).length > 0) {
      results.push(cleanedRow);
    }
  })
  .on("end", () => {
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log("✅ Rainfall JSON generated successfully!");
  })
  .on("error", (err) => {
    console.error("❌ Error:", err.message);
  });