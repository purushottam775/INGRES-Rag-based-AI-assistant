import fs from 'fs';

const inputFile = process.argv[2];
const outputFile = inputFile.replace('.csv', '.json');

const text = fs.readFileSync(inputFile, 'utf-8');
const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

const results = [];

// This file has two different formatting styles:
// Part 1 (Rows 1-24):
// "1,Ahmednagar,14 4 28.57 5 35.71 4 28.57 1 7.14,"
// "18,Mumbai,Sub urban 3 3 100," (District name split)
// Part 2 (Rows 25-36, Total):
// "25,Parbhani,9,9,100,,,,,,,,"

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const firstComma = line.indexOf(',');
    if (firstComma === -1) continue;

    const snoStr = line.substring(0, firstComma).replace(/"/g, '').trim();
    const isTotalRow = snoStr === '' && line.includes('Total'); // "",Total,359,302...

    let sno = parseInt(snoStr);

    if (isNaN(sno) && !isTotalRow) continue;

    const parts = line.split(',');
    if (parts.length < 2) continue;

    let district = "";
    let dataValues = [];

    if (isTotalRow) {
        district = "Total";
        sno = "Total";
        // e.g "",Total,359,302,84.12,41,11.42,7,1.95,8,2.23,1,0.28
        dataValues = parts.slice(2).filter(v => v.trim() !== '').map(Number);
    }
    // Format 2: Values are comma separated (e.g., 25,Parbhani,9,9,100,,,,,,,,)
    else if (parts.length > 3 && parts[2].trim() !== '' && !parts[2].includes(' ')) {
        district = parts[1].trim();
        dataValues = parts.slice(2).filter(v => v.trim() !== '').map(Number);
    }
    // Format 1: Values are space separated in parts[2]
    else {
        // Handle "Mumbai,Sub urban 3 3 100," anomaly
        if (parts[1].trim() === 'Mumbai' && parts[2] && parts[2].startsWith('Sub urban')) {
            district = 'Mumbai Sub urban';
            const remainingStr = parts[2].replace('Sub urban', '').trim();
            dataValues = remainingStr.split(/\s+/).map(Number);
        } else {
            district = parts[1].trim();
            // The values might be in parts[2] and parts[3] depending on trailing commas
            const remainingStr = parts.slice(2).join(' ').replace(/,/g, ' ');
            dataValues = remainingStr.split(/\s+/).filter(v => v !== '').map(Number);
        }
    }

    // Default values if they are missing (e.g., "11 11 100" means 11 total, 11 safe (100%), 0 for others)
    // Structure: 
    // [0] Total Units
    // [1] Safe Nos, [2] Safe %
    // [3] Semi-Critical Nos, [4] Semi-Critical %
    // [5] Critical Nos, [6] Critical %
    // [7] Over-Exploited Nos, [8] Over-Exploited %
    // [9] Saline Nos, [10] Saline %

    // We parse the exact values present. Often 0s are completely omitted.

    // Total Assessed Units
    const totalUnits = dataValues[0] || 0;

    // Since 0s are omitted, we calculate the counts by finding pieces that add up to total units, 
    // but looking at the CSV, they are strictly ordered. If a category is missing, its numbers and % are just not there.
    // Example: "7 7 100" -> Total 7, Safe 7 (100%).
    // Example: "14 8 57.14 3 21.43 2 14.29 1 7.14" -> Total 14, Safe 8, Semi 3, Crit 2, Over 1

    // It's much safer to parse this by reading pairs until we exhaust the array
    let safeNos = 0, safePct = 0;
    let semiNos = 0, semiPct = 0;
    let critNos = 0, critPct = 0;
    let overNos = 0, overPct = 0;
    let salineNos = 0, salinePct = 0;

    let currentIndex = 1; // start after totalUnits

    // The columns are strictly ordered: Safe, Semi-Critical, Critical, Over-Exploited, Saline.
    // But since empty ones are skipped in Format 1, we can't reliably map them purely by index if some are missing in the middle.
    // However, looking at the dataset, it seems they only omit them if they are zero.
    // Actually, in the CSV snippet:
    // Kolhapur: "12 12 100"
    // Solapur (Format 2): 32,Solapur,11,3,27.27,7,63.64,,,1,0.09,,

    // For format 2, they ARE positionally mapped by commas!
    // Let's re-parse Format 2 strictly by index.
    if (parts.length > 5 && parts[2].trim() !== '' && !parts[2].includes(' ')) {
        // Commas were preserved in line split
        safeNos = Number(parts[3]) || 0;
        safePct = Number(parts[4]) || 0;
        semiNos = Number(parts[5]) || 0;
        semiPct = Number(parts[6]) || 0;
        critNos = Number(parts[7]) || 0;
        critPct = Number(parts[8]) || 0;
        overNos = Number(parts[9]) || 0;
        overPct = Number(parts[10]) || 0;
        salineNos = Number(parts[11]) || 0;
        salinePct = Number(parts[12]) || 0;
    }
    else if (isTotalRow) {
        // Total row is perfectly comma separated
        safeNos = Number(parts[3]) || 0;
        safePct = Number(parts[4]) || 0;
        semiNos = Number(parts[5]) || 0;
        semiPct = Number(parts[6]) || 0;
        critNos = Number(parts[7]) || 0;
        critPct = Number(parts[8]) || 0;
        overNos = Number(parts[9]) || 0;
        overPct = Number(parts[10]) || 0;
        salineNos = Number(parts[11]) || 0;
        salinePct = Number(parts[12]) || 0;
    }
    else {
        // Format 1 (Space separated, missing zeros are omitted)
        // Let's assign them sequentially. If they don't add up we might have an issue, but usually missing ones are at the end, 
        // OR we can assume any given pair is Safe, then Semi, etc.
        // Wait, "15 3 20 10 66.67 2 13.33," (Jalgaon) = 3+10+2 = 15.
        // Are they always Safe -> Semi -> Crit -> Over?
        // Let's look at Jalgaon: 3 Safe, 10 Semi, 2 Crit. Total 15.
        // If they omit 0s, this is tricky. Jalgaon has 2 Crit and 0 Over.
        // Akola: 7 6 85.71 1 14.29 -> 6 Safe, 1 Semi? Or 1 Over?

        // Given the ambiguity of spaced format, let's map pairs directly Safe -> Semi -> Crit -> OE -> Saline
        if (currentIndex < dataValues.length) { safeNos = dataValues[currentIndex++]; safePct = dataValues[currentIndex++]; }
        if (currentIndex < dataValues.length) { semiNos = dataValues[currentIndex++]; semiPct = dataValues[currentIndex++]; }
        if (currentIndex < dataValues.length) { critNos = dataValues[currentIndex++]; critPct = dataValues[currentIndex++]; }
        if (currentIndex < dataValues.length) { overNos = dataValues[currentIndex++]; overPct = dataValues[currentIndex++]; }
        if (currentIndex < dataValues.length) { salineNos = dataValues[currentIndex++]; salinePct = dataValues[currentIndex++]; }
    }

    results.push({
        "S.No": snoStr,
        "District": district,
        "No. of Assessed Units": totalUnits,
        "Safe (Nos)": safeNos,
        "Safe (%)": safePct,
        "Semi-Critical (Nos)": semiNos,
        "Semi-Critical (%)": semiPct,
        "Critical (Nos)": critNos,
        "Critical (%)": critPct,
        "Over-Exploited (Nos)": overNos,
        "Over-Exploited (%)": overPct,
        "Saline (Nos)": salineNos,
        "Saline (%)": salinePct
    });
}

fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
console.log(`✅ Saved to ${outputFile}`);
