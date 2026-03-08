import fs from 'fs';

const inputFile = process.argv[2];
const outputFile = process.argv[3];

let content = fs.readFileSync(inputFile, 'utf-8');
const rawLines = content.split('\n').map(l => l.replace(/\r/, ''));

// This CSV is extremely fragmented by Tabula.
// Each data row spans 2-3 lines. Lines starting with a number in col 0 are primary rows,
// lines starting with "" are continuations.
// Strategy: Group lines into logical records, then reconstruct values.

// Skip header lines (lines 1-12 are headers)
// Data rows start at line 13 (0-indexed 12)

// First, group lines into records. A record starts when col[0] is a number.
const records = [];
let currentRecord = null;

for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i].trim();
    if (!line) continue;

    let parts = line.split(',');
    let firstVal = parts[0].replace(/"/g, '').trim();

    // Check if this is a data row start (first column is a number)
    if (/^\d+$/.test(firstVal)) {
        if (currentRecord) {
            records.push(currentRecord);
        }
        currentRecord = [line];
    } else if (currentRecord) {
        // Continuation line
        currentRecord.push(line);
    }
    // else skip header lines
}
if (currentRecord) {
    records.push(currentRecord);
}

console.log(`Found ${records.length} records`);

// Now parse each record. We need to merge continuation lines.
// The approach: for each record, split all lines by comma, then merge corresponding columns.
const data = [];

const parseNum = (val) => {
    if (!val || val === '' || val === '-') return 0;
    let n = parseFloat(val);
    return isNaN(n) ? 0 : n;
};

// Helper: merge multi-line cell values
// Each line has the same number of comma-separated columns.
// We merge by concatenating values from the same column index across lines.
function mergeRecordLines(lines) {
    let allParts = lines.map(l => l.split(','));
    // Find max columns
    let maxCols = Math.max(...allParts.map(p => p.length));
    let merged = [];
    for (let c = 0; c < maxCols; c++) {
        let vals = [];
        for (let r = 0; r < allParts.length; r++) {
            if (c < allParts[r].length) {
                let v = allParts[r][c].replace(/"/g, '').trim();
                if (v) vals.push(v);
            }
        }
        merged.push(vals.join(' '));
    }
    return merged;
}

// Helper: parse space-separated C NC PQ Total pattern
function parseCNPQTotal(str) {
    if (!str || str.trim() === '') return { C: 0, NC: 0, PQ: 0, Total: 0 };
    let nums = str.split(/\s+/).map(v => parseNum(v));
    if (nums.length >= 4) {
        return { C: nums[0], NC: nums[1], PQ: nums[2], Total: nums[3] };
    } else if (nums.length === 2) {
        // Some entries only have 2 values meaning C and NC with PQ=0
        return { C: nums[0], NC: nums[1], PQ: 0, Total: nums[0] + nums[1] };
    } else if (nums.length === 1) {
        return { C: 0, NC: 0, PQ: 0, Total: nums[0] };
    }
    return { C: 0, NC: 0, PQ: 0, Total: 0 };
}

// Parse categorization text
function parseCategory(str) {
    if (!str) return '';
    // Clean up fragmented categorization values
    str = str.replace(/semi_cri\s*tical/g, 'semi_critical')
        .replace(/semi_\s*critical/g, 'semi_critical')
        .replace(/over_ex\s*ploited/g, 'over_exploited')
        .replace(/semi_crisafe/g, 'semi_critical safe')
        .replace(/semi_cri\s*safe/g, 'semi_critical safe')
        .trim();
    return str;
}

for (let rec of records) {
    let merged = mergeRecordLines(rec);

    // Column mapping based on CSV structure:
    // 0: S.No
    // 1: Basin
    // 2: Watershed
    // 3: District (fragmented like "Osman abad" -> "Osmanabad", "Solapu r" -> "Solapur")
    // 4: Annual Ground Water Recharge (ham) - C NC PQ Total
    // 5: Annual Extractable Ground Water Resource (ham) - C NC PQ Total
    // 6: Domestic extraction - C
    // 7: Domestic extraction - NC PQ (space separated)
    // 8: Domestic Total
    // 9: Industrial
    // 10: Irrigation - C NC PQ Total (space separated) - but sometimes has extra sub-columns
    // ... remaining columns for Allocation, Net Availability, Stage, Categorization

    let sno = parseInt(merged[0]);
    let basin = merged[1] || '';
    let watershed = merged[2] || '';

    // Clean district name (remove spaces in fragmented names)
    let district = (merged[3] || '').replace(/\s+/g, ' ').trim();
    // Fix common Tabula fragmentations
    district = district
        .replace(/Mumb\s*ai\s*Sub/i, 'Mumbai Sub')
        .replace(/Osman\s*abad/i, 'Osmanabad')
        .replace(/Ahmed\s*nagar/i, 'Ahmednagar')
        .replace(/Solapu\s*r/i, 'Solapur');

    // Parse the numeric columns
    // Column 4: Annual Ground Water Recharge (ham) - "C NC PQ Total"
    let agwRecharge = parseCNPQTotal(merged[4]);

    // Column 5: Annual Extractable Ground Water Resource (ham) - "C NC PQ Total"
    let extractable = parseCNPQTotal(merged[5]);

    // Ground Water Extraction:
    // Column 6: Domestic C
    let domesticC = parseNum(merged[6]);
    // Column 7: Domestic NC PQ -> parse
    let domesticNCPQ = (merged[7] || '').split(/\s+/).map(v => parseNum(v));
    let domesticNC = domesticNCPQ[0] || 0;
    let domesticPQ = domesticNCPQ.length > 1 ? domesticNCPQ[1] : 0;
    // Column 8: Domestic Total
    let domesticTotal = parseNum(merged[8]);

    // Column 9: Industrial
    let industrial = parseNum(merged[9]);

    // Column 10: Irrigation - "C NC PQ Total"
    // This column often has space-separated values that may include the irrigation total embedded
    let irrigationStr = merged[10] || '';
    // Sometimes the format is like "377.6 0 0 1552.5 1930.1" where first 3 are C NC PQ, then irr total, then grand total
    // Or "23.3 23.3" for simple cases
    let irrigNums = irrigationStr.split(/\s+/).map(v => parseNum(v));

    let irrigC = 0, irrigNC = 0, irrigPQ = 0, irrigTotal = 0;
    if (irrigNums.length >= 5) {
        // C NC PQ IrrigTotal GrandTotal
        irrigC = irrigNums[0];
        irrigNC = irrigNums[1];
        irrigPQ = irrigNums[2];
        irrigTotal = irrigNums[3];
        // irrigNums[4] would be a grand total of irrigation
    } else if (irrigNums.length >= 4) {
        irrigC = irrigNums[0];
        irrigNC = irrigNums[1];
        irrigPQ = irrigNums[2];
        irrigTotal = irrigNums[3];
    } else if (irrigNums.length >= 2) {
        irrigC = irrigNums[0];
        irrigTotal = irrigNums[1];
    } else if (irrigNums.length === 1) {
        irrigTotal = irrigNums[0];
    }

    // Column 11: Total Extraction C (part of merged irrigation sometimes)
    // Column 12: Total Extraction NC
    // Actually from the CSV header analysis, columns after irrigation are:
    // Total Ground Water Extraction: C NC PQ Total
    // But in the fragmented CSV they appear in columns 11-14 area

    // Let's parse remaining columns
    let totalExtrC = parseNum(merged[11]);
    let totalExtrNC = parseNum(merged[12]);

    // Column 13-14 area
    let allocationStr = merged[13] || '';

    // Given the extreme fragmentation, let me take a different approach:
    // Collect ALL numeric tokens from merged columns 6 onwards
    let allNumTokens = [];
    for (let c = 6; c < merged.length; c++) {
        let tokens = (merged[c] || '').split(/\s+/);
        tokens.forEach(t => {
            if (t.trim() !== '') allNumTokens.push(t.trim());
        });
    }

    // Expected pattern of numeric columns after col 5:
    // Domestic: C, NC, PQ, Total (but PQ is sometimes merged with NC)
    // Industrial: 1 value
    // Irrigation: C, NC, PQ, Total (4 values in "C NC PQ Total" format)
    // Total Extraction: implied (sum)
    // Allocation for Domestic 2025: C, NC, PQ, Total  
    // Net Availability: C, NC, PQ, Total
    // Stage of Extraction: C, NC, PQ (or Total)
    // Categorization: text values

    // Let me re-examine the structure from the screenshot more carefully.
    // Based on the screenshot header:
    //  Domestic: C | NC PQ | Total
    //  Industrial: single value
    //  Irrigation: C NC PQ Total (single merged cell)
    //  [implied total extraction]
    //  Allocation: C NC PQ Total  
    //  Net Availability: C NC PQ Total
    //  Stage: C NC PQ To(tal)
    //  Categorization: C NC PQ Total

    // From CSV columns analysis:
    // col 6: Domestic C
    // col 7: Domestic NC PQ (space merged)
    // col 8: Domestic Total
    // col 9: Industrial (single)
    // col 10: Irrigation C NC PQ Total + sometimes total extraction merged
    // col 11-14: remaining allocation/availability
    // col 15+: stage, categorization

    // Let me parse from column indices directly
    // After the irrigation col (10), we often see pattern like:
    // col 11/12: TotalExtraction components
    // col 13: more values

    // Actually, let me just create the output object from what we DO know for sure
    // and use a simpler mapping approach

    // Re-parse from raw merged fields
    let gwExtraction = {
        "Domestic": {
            "C": domesticC,
            "NC": domesticNC,
            "PQ": domesticPQ,
            "Total": domesticTotal
        },
        "Industrial": industrial,
        "Irrigation": {
            "C": irrigC,
            "NC": irrigNC,
            "PQ": irrigPQ,
            "Total": irrigTotal
        }
    };

    // Columns 11+ contain: allocation, net availability, stage, categorization
    // Parse from remaining merged columns
    let allocation = parseCNPQTotal(merged[16] || '');
    let netAvailability = parseCNPQTotal(merged[17] || '');

    // Stage values
    let stageStr = merged[18] || '';
    let stageNums = stageStr.split(/\s+/).map(v => parseNum(v));

    // Categorization
    let categStr = parseCategory(merged[19] || '');
    let categParts = categStr.split(/\s+/).filter(s => s);

    // Build record
    let record = {
        "S.No.": sno,
        "Basin": basin,
        "Watershed": watershed,
        "District": district,
        "Annual Ground Water Recharge (ham)": agwRecharge,
        "Annual Extractable Ground Water Resource (ham)": extractable,
        "Ground Water Extraction for all uses (ham)": gwExtraction,
        "Allocation of Ground Water Resource for Domestic Utilization for projected year 2025 (ham)": allocation,
        "Net Annual Ground Water Availability for Future Use (ham)": netAvailability,
        "Stage of Ground Water Extraction (%)": stageStr.trim(),
        "Categorization of Assessment Unit": categStr
    };

    data.push(record);
}

fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
console.log(`✅ Extracted ${data.length} watershed records to ${outputFile}`);
