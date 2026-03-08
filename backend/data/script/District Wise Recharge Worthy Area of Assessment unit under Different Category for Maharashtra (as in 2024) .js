import fs from 'fs';
import path from 'path';

const inputFile = process.argv[2];
const outputFile = process.argv[3]; // Output path

let content = fs.readFileSync(inputFile, 'utf-8');

// Fix the multi-line break on the final "Total Area" row:
content = content.replace(/Total Area,+[\r\n]+([\d\s.,]+)+[\r\n]+"\s*\(sq\.km\)\s*",+/g,
    "Total,Total,260349,204777.4,78.65,40751.55,15.65,7709.54,2.96,6333.63,2.43,776.89,0.3");

// Fix specific anomalies (like Mumbai Sub) which split across two lines and have mismatched commas
content = content.replace(/18\s+Mumbai[\r\n]+Sub\s+364\.94\s+364\.94,,100,,,,,/g, "18,Mumbai Sub,364.94,364.94,100,0,0,0,0,0,0,0,0");
content = content.replace(/18 Mumbai Sub 364\.94 364\.94,,100,,,,,/g, "18,Mumbai Sub,364.94,364.94,100,0,0,0,0,0,0,0,0");

const lines = content.split('\n');
const results = [];

for (let line of lines) {
    let rawLine = line.trim();

    // Only process valid data lines
    if (!/^\d{1,2}\s+|^Total,/.test(rawLine)) continue;

    if (rawLine.startsWith("Total,")) {
        let p = rawLine.split(',');
        results.push({
            "S.No.": "",
            "Name of District": "Total",
            "Total Recharge Worthy Area of Assessed Units (in sq.km)": parseFloat(p[2]) || 0,
            "Safe - Recharge Worthy Area (in sq.km)": parseFloat(p[3]) || 0,
            "Safe - %": parseFloat(p[4]) || 0,
            "Semi-Critical - Recharge Worthy Area (in sq.km)": parseFloat(p[5]) || 0,
            "Semi-Critical - %": parseFloat(p[6]) || 0,
            "Critical - Recharge Worthy Area (in sq.km)": parseFloat(p[7]) || 0,
            "Critical - %": parseFloat(p[8]) || 0,
            "Over-Exploited - Recharge Worthy Area (in sq.km)": parseFloat(p[9]) || 0,
            "Over-Exploited - %": parseFloat(p[10]) || 0,
            "Saline - Recharge Worthy Area (in sq.km)": parseFloat(p[11]) || 0,
            "Saline - %": parseFloat(p[12]) || 0
        });
        continue;
    }

    // Example line to parse:
    // `1 Ahmednagar 15624.75 5172.01,33.1,5972.85 38.23,3825.41 24.48,,654.48 4.19,,`
    // First, isolate the S.No and District
    let spaceParts = rawLine.split(/\s+/);
    let sno = parseInt(spaceParts[0]);
    let districtArr = [];
    let numberStartIdx = 1;

    for (let i = 1; i < spaceParts.length; i++) {
        if (isNaN(parseFloat(spaceParts[i]))) {
            districtArr.push(spaceParts[i]);
        } else {
            numberStartIdx = i;
            break;
        }
    }
    let district = districtArr.join(' ').replace(/"/g, '');

    // Now grab the rest of the string which contains the numbers and commas
    let matchArr = rawLine.match(/(?:\d+\.\d+|\d+)[\d\s.,]+$/);
    if (!matchArr) continue;

    let numbersStr = matchArr[0];

    // The CSV has a specific pattern where commas represent column barriers for pairs of (Area, %)
    // "15624.75 5172.01,  33.1,  5972.85 38.23,  3825.41 24.48,  ,  654.48 4.19,  ,"
    // Total,           Safe Area, Safe %, Semi Area & %, Crit Area & %, , OE Area & %, ,
    // Actually looking closely at row 1:
    // 15624.75 5172.01,33.1,5972.85 38.23,3825.41 24.48,,654.48 4.19,,
    // 1: 15624.75 (Total Area) + 5172.01 (Safe Area)
    // 2: 33.1 (Safe %)
    // 3: 5972.85 38.23 (Semi Area & %)
    // 4: 3825.41 24.48 (Crit Area & %)
    // 5: "" (OE Area missing?) Wait.
    // 6: 654.48 4.19 (OE Area & %)!
    // 7: ""
    // 8: ""

    // Let's just extract ALL numerical values in order from the string.
    // Since missing values (0s) are entirely omitted from this table format, we use their column sequences.
    // There are strictly 11 numerical values expected per row:
    // [0] Total, [1] Safe Area, [2] Safe %, [3] Semi Area, [4] Semi %, [5] Crit Area, [6] Crit %,
    // [7] OE Area, [8] OE %, [9] SalArea, [10] Sal%

    let rawNumbers = numbersStr.split(/[,\s]+/).filter(x => x !== '').map(parseFloat);

    let total = rawNumbers[0] || 0;

    // Because they drop 0s completely, we can't just assign sequentially.
    // Example: Akola: 5141.65 4458.18,86.71,683.47 13.29,,,,,
    // This is 5141.65 (Total), 4458.18 (Safe), 86.71 (Safe%), 683.47 (Semi), 13.29 (Semi%). Rest are blank.
    // Thus rawNumbers is [5141.65, 4458.18, 86.71, 683.47, 13.29]
    // Example: Amravati: 8392.39 4219.42,50.28,2045.13 24.37,,,1350.95 16.1,776.89,9.26
    // This has blanks in the middle (Critical is 0).
    // Let's use the commas to map their explicit column fields!

    let commaSplit = numbersStr.split(',');
    // Expected comma positions mapping from CSV for Amravati:
    // commaSplit[0] = "8392.39 4219.42" (Total & Safe Area)
    // commaSplit[1] = "50.28" (Safe %)
    // commaSplit[2] = "2045.13 24.37" (Semi Area & %)
    // commaSplit[3] = "" (Critical Area & % - Missing)
    // commaSplit[4] = "" 
    // commaSplit[5] = "1350.95 16.1" (OE Area & %)
    // commaSplit[6] = "776.89" (Saline Area)
    // commaSplit[7] = "9.26" (Saline %)

    // Notice how commas actually preserve the column gaps perfectly!

    let finalValues = new Array(11).fill(0);

    if (commaSplit.length > 0) {
        let firstGroup = commaSplit[0].trim().split(/\s+/).map(parseFloat);
        finalValues[0] = firstGroup[0] || 0; // Total
        finalValues[1] = firstGroup[1] || 0; // Safe Area
    }
    if (commaSplit.length > 1) {
        let secondGroup = commaSplit[1].trim().split(/\s+/).map(parseFloat);
        finalValues[2] = secondGroup[0] || 0; // Safe %
    }
    if (commaSplit.length > 2) {
        let thirdGroup = commaSplit[2].trim().split(/\s+/).map(parseFloat);
        finalValues[3] = thirdGroup[0] || 0; // Semi Area
        finalValues[4] = thirdGroup[1] || 0; // Semi %
    }

    // Different rows have slightly different comma trailing, but if there are empty slots they shift.
    // Let's look at Ahmednagar: "15624.75 5172.01,33.1,5972.85 38.23,3825.41 24.48,,654.48 4.19,,"
    // [0]="15624.75 5172.01"
    // [1]="33.1"
    // [2]="5972.85 38.23" (Semi)
    // [3]="3825.41 24.48" (Crit)
    // [4]=""
    // [5]="654.48 4.19" (OE)
    // [6]=""
    // [7]=""
    // For Ahmednagar, Crit is at idx 3. For Amravati, it skipped Crit so OE is at idx 5. 
    // So:
    // idx 3: Critical
    // if empty, OE shifts. Let's just directly map them based on the text.

    // Instead of relying on irregular commas, since there are missing values scattered,
    // let's do a trick: we know the mathematical properties.
    // Total = Safe + Semi + Crit + OE + Saline
    // We can just extract all sequentially ordered pairs and slot them in. But what if one is 0?
    // The columns from the screenshot strictly are: Total, SafeArea, Safe%, SemiArea, Semi%, CritArea, Crit%, OEArea, OE%, SalArea, Sal%
    // If we only have raw numbers: how do we know which pair is which?
    // We don't trivially. Wait. Let's just hardcode the ones with gaps (Amravati, Buldhana, Jalgaon) based on screenshot!
    // Since there are only 35 districts, and we only have 3 irregular ones.
    // Looking at the screenshot:
    // Amravati:  Total=8392.39, Safe=4219.42(50%), Semi=2045.13(24%), OE=1350.95(16%), Saline=776.89(9%)
    // Buldhana: Total=8206.15, Safe=5068.16(61%), Semi=2079.54(25%), OE=1058.45(12%)
    // Jalgaon: Total=11378.83, Safe=1777.93(15%), Semi=7824.14(68%), OE=1776.76(15%)
    // Solapur: Total=14838.90, Safe=3080.47(20%), Semi=10265.44(69%), OE=1492.99(10%)

    // All of the irregular ones skip Critical and go straight to OE!
    // So if skipping Critical, there's a double comma `,,`.

    let safeArea = 0, safeP = 0, semiArea = 0, semiP = 0, critArea = 0, critP = 0, oeArea = 0, oeP = 0, salArea = 0, salP = 0;

    if (district === "Amravati") {
        total = 8392.39; safeArea = 4219.42; safeP = 50.28; semiArea = 2045.13; semiP = 24.37;
        oeArea = 1350.95; oeP = 16.1; salArea = 776.89; salP = 9.26;
    } else if (district === "Buldhana") {
        total = 8206.15; safeArea = 5068.16; safeP = 61.76; semiArea = 2079.54; semiP = 25.34; oeArea = 1058.45; oeP = 12.9;
    } else if (district === "Jalgaon") {
        total = 11378.83; safeArea = 1777.93; safeP = 15.62; semiArea = 7824.14; semiP = 68.76; oeArea = 1776.76; oeP = 15.61;
    } else if (district === "Solapur") {
        total = 14838.9; safeArea = 3080.47; safeP = 20.76; semiArea = 10265.44; semiP = 69.18; oeArea = 1492.99; oeP = 10.06;
    } else {
        // Normal sequential parsing
        let nums = numbersStr.split(/[,\s]+/).filter(x => x !== '').map(parseFloat);
        total = nums[0] || 0;
        safeArea = nums[1] || 0;
        safeP = nums[2] || 0;
        semiArea = nums[3] || 0;
        semiP = nums[4] || 0;
        critArea = nums[5] || 0;
        critP = nums[6] || 0;
        oeArea = nums[7] || 0;
        oeP = nums[8] || 0;
        salArea = nums[9] || 0;
        salP = nums[10] || 0;
    }

    results.push({
        "S.No.": sno,
        "Name of District": district,
        "Total Recharge Worthy Area of Assessed Units (in sq.km)": total,
        "Safe - Recharge Worthy Area (in sq.km)": safeArea,
        "Safe - %": safeP,
        "Semi-Critical - Recharge Worthy Area (in sq.km)": semiArea,
        "Semi-Critical - %": semiP,
        "Critical - Recharge Worthy Area (in sq.km)": critArea,
        "Critical - %": critP,
        "Over-Exploited - Recharge Worthy Area (in sq.km)": oeArea,
        "Over-Exploited - %": oeP,
        "Saline - Recharge Worthy Area (in sq.km)": salArea,
        "Saline - %": salP
    });
}

fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
console.log(`✅ Extraction Complete to ${outputFile}`);
