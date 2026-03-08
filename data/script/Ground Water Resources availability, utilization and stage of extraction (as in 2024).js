import fs from 'fs';
import path from 'path';

// This script processes the Ground Water Resources Assessment tables (e.g., table 10 and table 11)
// It extracts all the data into the correct JSON structure for all districts and totals.

const inputFile1 = process.argv[2]; // e.g., 'tabula-Maharashtra-GWRE-2024 (10).csv'
const inputFile2 = process.argv[3]; // e.g., 'tabula-Maharashtra-GWRE-2024 (11).csv'
const outputFile = "Ground Water Resources availability, utilization and stage of extraction (as in 2024).json";

const results = [];

function processFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    const text = fs.readFileSync(filePath, 'utf-8');
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // The data lines look like this:
        // "1,Ahmednagar,87414.55 13325.98..."
        // Or for totals:
        // "",Total(Ham),...

        const firstComma = line.indexOf(',');
        if (firstComma === -1) continue;

        const snoStr = line.substring(0, firstComma).replace(/"/g, '').trim();
        const isTotalRow = snoStr === ''; // checking for "",Total(Ham) 

        let sno = parseInt(snoStr);

        // Skip headers and irrelevant rows
        if (isNaN(sno) && !isTotalRow) continue;

        const parts = line.split(',');
        if (parts.length < 2) continue;

        // Extract District and normalize spaces
        let district = "";
        if (isTotalRow) {
            district = parts[1].replace(/"/g, '').trim();
            sno = district; // Assign "Total(Ham)" / "Total(bcm)" to S.No as well
        } else {
            district = parts[1].trim();
        }

        // Combine remaining parts and extract all space-separated numeric values
        const remainingStr = parts.slice(2).join(' ').replace(/,/g, ' ');
        const values = remainingStr.split(/\s+/).filter(v => v !== '').map(Number);

        // We know there are 14 data columns based on the official table structure
        if (values.length >= 14) {
            results.push({
                "S.No": sno,
                "District": district,
                "Monsoon Season Recharge from Rainfall": values[0],
                "Monsoon Season Recharge from Other Sources": values[1],
                "Non-Monsoon Season Recharge from Rainfall": values[2],
                "Non-Monsoon Season Recharge from Other Sources": values[3],
                "Total Annual Ground Water Recharge": values[4],
                "Total Natural Discharges": values[5],
                "Annual Extractable Ground Water Resource": values[6],
                "Current Annual GW Extraction for Irrigation": values[7],
                "Current Annual GW Extraction for Industrial Use": values[8],
                "Current Annual GW Extraction for Domestic Use": values[9],
                "Total Current Annual GW Extraction": values[10],
                "Annual GW Allocation for Domestic Use as on 2025": values[11],
                "Net Ground Water Availability for Future Use": values[12],
                "Stage of Ground Water Extraction (%)": values[13]
            });
        }
    }
}

// Process both CSV table files (Part 1 and Part 2)
if (inputFile1) processFile(inputFile1);
if (inputFile2) processFile(inputFile2);

if (results.length > 0) {
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`✅ Successfully extracted ${results.length} rows to ${outputFile}`);
} else {
    console.error("❌ No data was successfully parsed.");
}
