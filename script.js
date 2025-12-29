// 1. Configuration
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS_ZA05pfAt7Jhi6utZG0ldfiIl6w-FUpgRmeR8vmeuvOaY8lBA9BLYYhSNee_n0I48L4CLPAULuZTR/pub?gid=2062191702&single=true&output=csv';

const tableBody = document.getElementById('table-body');
let tableData = []; // Store data globally for sorting later

// 2. Fetch Data
fetch(SHEET_CSV_URL)
    .then(response => response.text())
    .then(csvText => {
        tableData = parseCSV(csvText);
        renderTable(tableData);
    })
    .catch(error => console.error('Error fetching data:', error));

// 3. CSV Parser (Handles commas inside quotes)
function parseCSV(text) {
    const rows = [];
    // Split by new line, handling different EOL characters
    const lines = text.split(/\r?\n/);
    
    // Skip the first line (headers)
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue; // Skip empty lines

        // Regex to match CSV columns, respecting quotes
        const regex = /(?:^|,)(?:"([^"]*)"|([^",]*))/g;
        let match;
        const row = [];
        
        while ((match = regex.exec(lines[i]))) {
            // value is either group 1 (quoted) or group 2 (unquoted)
            let value = match[1] || match[2] || '';
            row.push(value.trim());
        }
        
        if (row.length > 0) {
            rows.push(row);
        }
    }
    return rows;
}

// 4. Render Table
function renderTable(data) {
    tableBody.innerHTML = ''; // Clear existing rows

    data.forEach(rowData => {
        const tr = document.createElement('tr');
        
        // Loop through the specific columns we expect
        // (Phase, Date Range, Activity, Speed, Duration, Strategy)
        rowData.forEach(cellText => {
            const td = document.createElement('td');
            td.textContent = cellText;
            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    });
}
