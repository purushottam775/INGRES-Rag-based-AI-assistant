import fs from 'fs';
import path from 'path';

const inputFile = process.argv[2];
const outputFile = process.argv[3]; // We will pass the specific output path in data folder

let content = fs.readFileSync(inputFile, 'utf-8');

// The multiline tabular breakages are specific and consistent inside tabula outputs for this file.
// We apply literal text fix-ups to stitch together broken multi-line numeric values before parsing.

content = content.replace(/""\s*,Ahmednaga,36\.6,,27\.6\r?\n1,1528\.88 466\.88,30\.54 560\.66,422\.27,79\.07 5\.17\r?\n"",r,7,,2/g,
    "1,Ahmednagar,1528.88,466.88,30.54,560.66,36.67,422.27,27.62,79.07,5.17");

content = content.replace(/"",,15\.3,,\r?\n2,Akola 368\.57 312\.12,84\.69 56\.44,,\r?\n"",,1,,/g,
    "2,Akola,368.57,312.12,84.69,56.44,15.31,0,0,0,0");

content = content.replace(/3,Amravati 778\.22 383\.78,49\.31 231\.93 29\.8,,20\.8162\.52\r?\n"",,,,8/g,
    "3,Amravati,778.22,383.78,49.31,231.93,29.80,0,0,162.52,20.88");

content = content.replace(/"",,27\.1,,10\.7\r?\n7,Buldhana 863\.21 536\.04,62\.1 234\.24,,92\.93\r?\n"",,4,,7/g,
    "7,Buldhana,863.21,536.04,62.1,234.24,27.14,0,0,92.93,10.77");

content = content.replace(/"",,69\.1,,13\.4\r?\n13,Jalgaon 1369\.88 237\.66,17\.35 947\.59,,184\.63\r?\n"",,7,,8/g,
    "13,Jalgaon,1369.88,237.66,17.35,947.59,69.17,0,0,184.63,13.48");

content = content.replace(/"",,22\.4,,17\.8\r?\n22,Nashik 1897\.71 1133\.76,59\.74 425\.97,337\.98,\r?\n"",,5,,1/g,
    "22,Nashik,1897.71,1133.76,59.74,425.97,22.45,337.98,17.81,0,0");

content = content.replace(/"",,30\.7,,\r?\n26,Pune 1804\.59 1107\.45,61\.37 555\.12,142\.02,7\.87\r?\n"",,6,,/g,
    "26,Pune,1804.59,1107.45,61.37,555.12,30.76,142.02,7.87,0,0");

content = content.replace(/"",,24\.1,,\r?\n30,Satara 1046\.98 794\.39,75\.87 252\.59,,\r?\n"",,3,,/g,
    "30,Satara,1046.98,794.39,75.87,252.59,24.13,0,0,0,0");

content = content.replace(/"",,,,14\.1\r?\n32,Solapur 1388\.55 302\.28,21\.77 890\.13 64\.1,,196\.14\r?\n"",,,,3/g,
    "32,Solapur,1388.55,302.28,21.77,890.13,64.10,0,0,196.14,14.13");

content = content.replace(/"",,13\.8,,\r?\n"",Total 31147\.44 25212\.56,80\.95 4317\.33,902\.27,2\.9 715\.28 2\.3\r?\n"",,6,,/g,
    "Total,Total,31147.44,25212.56,80.95,4317.33,13.86,902.27,2.90,715.28,2.30");


const lines = content.split('\n');
const results = [];

for (let line of lines) {
    if (!/^\d+,|^Total,/.test(line)) continue;

    // Normalize string: convert commas to spaces, trim, and split by any whitespace
    let cleanLine = line.replace(/,/g, ' ');
    let parts = cleanLine.trim().split(/\s+/);

    // Numbers are trailing fields, meaning they are at the end of the line
    let numbers = [];
    while (parts.length > 0 && !isNaN(parseFloat(parts[parts.length - 1]))) {
        numbers.unshift(parseFloat(parts.pop()));
    }

    let district = parts.slice(1).join(' ').replace(/"/g, '');
    let sno = parts[0];
    if (sno === "Total") sno = "";
    else sno = parseInt(sno);

    results.push({
        "S.No.": sno,
        "Name of District": district,
        "Total Annual Extractable Resource of Assessed Units (in mcm)": numbers[0] || 0,
        "Safe - Annual Extractable Resource (in mcm)": numbers[1] || 0,
        "Safe - %": numbers[2] || 0,
        "Semi-Critical - Annual Extractable Resource (in mcm)": numbers[3] || 0,
        "Semi-Critical - %": numbers[4] || 0,
        "Critical - Annual Extractable Resource (in mcm)": numbers[5] || 0,
        "Critical - %": numbers[6] || 0,
        "Over-Exploited - Annual Extractable Resource (in mcm)": numbers[7] || 0,
        "Over-Exploited - %": numbers[8] || 0
    });
}

fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
console.log(`✅ Saved data tightly mapped to schema in ${outputFile}`);
