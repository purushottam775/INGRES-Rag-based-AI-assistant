import fs from 'fs';
import path from 'path';

const inputFile = process.argv[2];
const outputFile = process.argv[3]; // The path to save the generated JSON

let content = fs.readFileSync(inputFile, 'utf-8');

// Fix multi-line break on the final "Total Area" row:
// Total Area,,,,,,,
// 260349 204777.4,78.65,40751.55 15.65,7709.54 2.96,,6333.63 2.43,776.89,0.3
// "(sq.km)",,,,,,,
content = content.replace(/Total Area,+[\r\n]+([\d\s.,]+)+[\r\n]+"\s*\(sq\.km\)\s*",+/,
    "Total,Total,260349,204777.4,78.65,40751.55,15.65,7709.54,2.96,6333.63,2.43,776.89,0.3");

// Fix specific anomalies (like Mumbai Sub)
content = content.replace(/18 Mumbai Sub 364\.94 364\.94,,100,,,,,/g, "18,Mumbai Sub,364.94,364.94,100,0,0,0,0,0,0,0,0");

const lines = content.split('\n');
const results = [];

for (let line of lines) {
    // Only process valid data lines (start with a number or are the fixed "Total" line)
    // 1 Ahmednagar 15624.75 5172.01,33.1,5972.85 38.23,3825.41 24.48,,654.48 4.19,,
    if (!/^\d{1,2}\s+|^Total,/.test(line.trim())) continue;

    let parts = [];
    let isTotal = line.trim().startsWith("Total,");

    if (isTotal) {
        parts = line.trim().split(',');
    } else {
        // Data format: `1 Ahmednagar 15624.75 5172.01,33.1,5972.85 38.23,3825.41 24.48,,654.48 4.19,,`
        // Replace ALL commas with spaces to unify everything to space separated values
        // Note: Multiple commas like ",," mean "0 0" or we can just treat the whole line as sequence of strictly ordered fields where missing means 0, BUT they don't insert 0s, they just leave empty space. 
        // Best approach: Replace commas with space, split by whitespace, parse backwards.

        let unifiedLine = line.replace(/,/g, ' ').trim();
        let tokens = unifiedLine.split(/\s+/).filter(t => t !== '');

        parts[0] = tokens[0]; // S.No
        // Determine district name (all string tokens until the first purely numeric token)
        let districtArr = [];
        let numStartIdx = 1;
        for (let i = 1; i < tokens.length; i++) {
            if (isNaN(Number(tokens[i]))) {
                districtArr.push(tokens[i]);
            } else {
                numStartIdx = i;
                break;
            }
        }
        parts[1] = districtArr.join(' ');

        // Use the original string with commas to reliably map the position!
        // `13 Jalgaon 11378.83 1777.93,15.62,7824.14 68.76,,,1776.76 15.61,,`
        // Instead of parsing spaces purely, let's observe the commas actually define the structure 
        // and missing values are explicitly denoted by multiple consecutive commas!

        // Wait, let's restore commas for numbers portion
        let origNumbersMatch = line.match(/(?:\d+\.\d+|\d+)[\d\s.,]+$/);
        if (origNumbersMatch) {
            let strNumbers = origNumbersMatch[0];
            // E.g. "15624.75 5172.01,33.1,5972.85 38.23,3825.41 24.48,,654.48 4.19,,"
            let numberTokensRaw = strNumbers.split(',');
            // numberTokensRaw = ["15624.75 5172.01", "33.1", "5972.85 38.23", "3825.41 24.48", "", "654.48 4.19", "", ""]

            // Now fully split all spaces inside each comma segment
            let flatNumbers = [];
            for (let seg of numberTokensRaw) {
                let segNums = seg.trim().split(/\s+/).filter(t => t !== '');
                if (segNums.length === 0) {
                    // Empty comma group means missing variables, but HOW MANY?
                    // Actually, let's rely on standard parsing instead:
                }
            }
        }
    }
}
