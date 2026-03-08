import fs from 'fs';

const inputFile = process.argv[2];
const outputFile = process.argv[3];

let content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n');

const data = [];

const parseNum = (val) => {
    let n = parseFloat(val);
    return isNaN(n) ? 0 : n;
};

for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    let parts = line.split(',');

    // Correct Tabula page border artifacts
    if (parts[0] === '""' && parts.length >= 24) {
        parts.shift();
    }

    if (parts[parts.length - 1] === '') {
        parts.pop();
    }

    // Skip headers and invalid lines
    if (parts.length < 23) continue;
    if (isNaN(parseInt(parts[0]))) continue;

    data.push({
        "S.No.": parseInt(parts[0]),
        "State code": parts[1].trim(),
        "State District Code": parts[2].trim(),
        "State District Block Code": parts[3].trim(),
        "District": parts[4].trim(),
        "Assessment Unit Name": parts[5].trim(),
        "Total Geographical Area": parseNum(parts[6]),
        "Recharge Worthy Area": parseNum(parts[7]),
        "Recharge from Rainfall-Monsoon": parseNum(parts[8]),
        "Recharge from Other Sources-Monsoon": parseNum(parts[9]),
        "Recharge from Rainfall-Non-Monsoon": parseNum(parts[10]),
        "Recharge from Other Sources-Non-Monsoon": parseNum(parts[11]),
        "Total Annual Ground Water Recharge (Ham)": parseNum(parts[12]),
        "Total Natural Discharges (Ham)": parseNum(parts[13]),
        "Annual Extractable Ground Water Resource (Ham)": parseNum(parts[14]),
        "Irrigation Use (Ham)": parseNum(parts[15]),
        "Industrial Use (Ham)": parseNum(parts[16]),
        "Domestic Use (Ham)": parseNum(parts[17]),
        "Total Extraction (Ham)": parseNum(parts[18]),
        "Annual GW Allocation for Domestic Use as on 2025 (Ham)": parseNum(parts[19]),
        "Net Ground Water Availability for future use (Ham)": parseNum(parts[20]),
        "Stage of Ground Water Extraction (%)": parseNum(parts[21]),
        "Categorization (OE/Critical/Semi critical/Safe)": parts[22].replace(/"/g, '').trim()
    });
}

fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
console.log(`✅ Extracted structured JSON data successfully to ${outputFile}`);
