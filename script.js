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

// 5. Sorting Logic
const headers = document.querySelectorAll('th');
let currentSortCol = -1;
let isAscending = true;

// Add click listeners to headers
headers.forEach((header, index) => {
    header.addEventListener('click', () => {
        sortTable(index);
    });
});

function sortTable(columnIndex) {
    // Toggle direction if clicking the same column, otherwise reset to Ascending
    if (currentSortCol === columnIndex) {
        isAscending = !isAscending;
    } else {
        currentSortCol = columnIndex;
        isAscending = true;
    }

    // Sort the global tableData array
    tableData.sort((rowA, rowB) => {
        // Safe check in case a row is shorter than expected
        const cellA = (rowA[columnIndex] || '').toString().toLowerCase();
        const cellB = (rowB[columnIndex] || '').toString().toLowerCase();

        if (cellA < cellB) return isAscending ? -1 : 1;
        if (cellA > cellB) return isAscending ? 1 : -1;
        return 0;
    });

    // Update Header Visuals (Classes will be styled in Step 5)
    updateHeaderStyles(columnIndex);

    // Re-render the table with sorted data
    renderTable(tableData);
}

function updateHeaderStyles(columnIndex) {
    headers.forEach((th, idx) => {
        // Remove existing sort classes
        th.classList.remove('sort-asc', 'sort-desc');
        
        // Add class to the currently sorted header
        if (idx === columnIndex) {
            th.classList.add(isAscending ? 'sort-asc' : 'sort-desc');
        }
    });
}
