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

// Helper function to extract a range of space-separated or comma separated values
const extractValues = (str) => {
    return str.split(/[\s,]+/).map(v => v.trim()).filter(v => v !== '');
};

let currentBasin = '';

for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    // Skip header lines
    if (line.includes('Watershed') || line.includes('Recharge Worthy Area') || line.includes('Rainfall Recharge') || line.includes('PQ,Total')) continue;

    let parts = line.split(',');

    // Clean Tabula page border quotes
    if (parts[0] && parts[0].replace(/"/g, '') === '') {
        parts.shift();
    }

    if (parts[parts.length - 1] === '') {
        parts.pop();
    }

    let snoRaw = parts[0] ? parseInt(parts[0].replace(/"/g, '')) : NaN;
    if (isNaN(snoRaw)) continue; // Not a data row

    // Sometimes Tabula squashes values with space. We've seen this in earlier columns.
    // Instead of trusting splitting by comma purely, we will reconstruct flattened array of all values
    let flatVals = [];
    parts.forEach(p => {
        if (p.replace(/"/g, '').trim() !== '') {
            let subVals = p.split(/[\s]+/);
            subVals.forEach(sv => {
                if (sv.trim() !== '') flatVals.push(sv.trim());
            });
        } else {
            flatVals.push(''); // Keep empty if it was literally empty comma
        }
    });

    // Remove leading completely empty strings that might be artifacts
    while (flatVals.length > 0 && flatVals[0] === '') flatVals.shift();

    // Sometimes Basin gets inherited if blank, but this CSV looks like it has it on every row.
    // Let's standardly extract. Looking at the data, the first text columns are S.No, Basin, Watershed, District

    let sno = parseInt(flatVals[0]);
    let basin = flatVals[1];
    if (basin) currentBasin = basin;

    let watershed = flatVals[2];

    // District could be split with 'Sub' etc (Mumbai Sub).
    let district = flatVals[3];
    let numStartIndex = 4;

    // If district is "Mumbai Sub", tabula might have split it across spaces: "Mumbai", "Sub"
    if (flatVals[4] === 'Sub') {
        district = "Mumbai Sub";
        numStartIndex = 5;
    }


    // Now collect all numeric values from numStartIndex onwards
    let nums = [];
    for (let j = numStartIndex; j < flatVals.length; j++) {
        if (flatVals[j] !== '') {
            nums.push(parseNum(flatVals[j]));
        } else {
            nums.push(0);
        }
    }

    // According to the header structure:
    // Rainfall (mm): C, NC, PQ, Total  (4 values)
    // Total Geographical Area (ha) -> Recharge Worthy Area (ha): C, NC, PQ, Total (4 values); Hilly Area (1 value); Total (1 value) (Total 6 values)
    // Ground Water Recharge (ham) -> Rainfall Recharge: C, NC, PQ, Total (4 values)
    // Recharge from other sources: C, NC, PQ, Total (4 values)
    // Total: C, NC, PQ, Total (4 values)

    // Total numeric columns = 4 + 6 + 4 + 4 + 4 = 22 values

    // In Some lines like row 5: 0 2438.2 0 2438.2 -> C, NC, PQ, Total (Note C is 0)

    // Ensure we have enough numbers
    if (nums.length >= 22) {
        data.push({
            "S.No.": sno,
            "Basin": basin,
            "Watershed": watershed,
            "District": district,
            "Rainfall (mm)": {
                "C": nums[0],
                "NC": nums[1],
                "PQ": nums[2],
                "Total": nums[3]
            },
            "Total Geographical Area (ha)": {
                "Recharge Worthy Area (ha)": {
                    "C": nums[4],
                    "NC": nums[5],
                    "PQ": nums[6],
                    "Total": nums[7]
                },
                "Hilly Area": nums[8],
                "Total": nums[9]
            },
            "Ground Water Recharge (ham)": {
                "Rainfall Recharge": {
                    "C": nums[10],
                    "NC": nums[11],
                    "PQ": nums[12],
                    "Total": nums[13]
                },
                "Recharge from other sources": {
                    "C": nums[14],
                    "NC": nums[15],
                    "PQ": nums[16],
                    "Total": nums[17]
                },
                "Total": {
                    "C": nums[18],
                    "NC": nums[19],
                    "PQ": nums[20],
                    "Total": nums[21]
                }
            }
        });
    }
}

fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
console.log(`✅ Extracted structured JSON data successfully to ${outputFile}`);
