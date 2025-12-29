// CONFIGURATION
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS_ZA05pfAt7Jhi6utZG0ldfiIl6w-FUpgRmeR8vmeuvOaY8lBA9BLYYhSNee_n0I48L4CLPAULuZTR/pub?gid=2062191702&single=true&output=csv';

let events = [];
let nav = 0; // Tracks months from current date (0 = this month, 1 = next, etc.)
let clicked = null;
const calendar = document.getElementById('calendar-grid');
const monthDisplay = document.getElementById('month-display');
const modal = document.getElementById('event-modal');

// 1. Fetch & Initialize
async function loadData() {
    try {
        const response = await fetch(CSV_URL);
        const text = await response.text();
        const rows = parseCSV(text);
        
        // Process rows into event objects
        // CSV Structure: [0]Timestamp, [1]Phase, [2]DateRange, [3]Activity, [4]Speed, [5]Duration, [6]Strategy
        events = [];
        
        rows.forEach(row => {
            // Skip empty rows or header (if header wasn't removed by parseCSV check)
            if(row.length < 3 || row[1] === 'Phase') return;

            const dateRangeStr = row[2]; // "Dec 30 - Jan 3" or "Jan 4 (Sun)"
            
            // Expand range into individual date strings (YYYY-MM-DD)
            const dateList = expandDateRange(dateRangeStr);

            dateList.forEach(dateStr => {
                events.push({
                    date: dateStr, // "2025-01-04"
                    phase: row[1],
                    activity: row[3],
                    speed: row[4],
                    duration: row[5],
                    notes: row[6]
                });
            });
        });

        renderCalendar();

    } catch (e) {
        console.error("Error loading data:", e);
    }
}

// 2. CSV Parser
function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    const result = [];
    // Start from index 1 to skip header
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const regex = /(?:^|,)(?:"([^"]*)"|([^",]*))/g;
        let match;
        const row = [];
        while ((match = regex.exec(lines[i]))) {
            row.push((match[1] || match[2] || '').trim());
        }
        result.push(row);
    }
    return result;
}

// 3. Date Parser (The Magic Logic)
function expandDateRange(rawStr) {
    // Current assumption: Dates belong to current/next year context.
    // Handles: "Dec 30 - Jan 3" OR "Jan 4 (Sun)"
    const cleanStr = rawStr.replace(/\([^\)]+\)/g, '').trim(); // Remove (Sun)
    const currentYear = new Date().getFullYear(); 
    
    // Helper to make Date object from "Month Day"
    const parsePart = (str) => {
        const d = new Date(`${str} ${currentYear}`);
        // Logic to handle Year rollover (e.g. looking at Dec while in Jan)
        // If the parsed date is more than 6 months away, assume it's slightly different year context
        // specific to your needs, we'll keep it simple for now:
        if (str.includes("Jan") && new Date().getMonth() > 6) d.setFullYear(currentYear + 1);
        return d;
    };

    const resultDates = [];

    if (cleanStr.includes("-")) {
        // It's a range: "Dec 30 - Jan 3"
        const parts = cleanStr.split("-");
        let start = parsePart(parts[0].trim());
        let end = parsePart(parts[1].trim());

        // Handle Dec -> Jan rollover explicitly
        if (start > end) {
            end.setFullYear(start.getFullYear() + 1);
        }

        // Loop from start to end
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            resultDates.push(d.toISOString().split('T')[0]);
        }
    } else {
        // Single date
        const d = parsePart(cleanStr);
        resultDates.push(d.toISOString().split('T')[0]);
    }
    return resultDates;
}

// 4. Render Calendar
function renderCalendar() {
    const dt = new Date();
    
    if (nav !== 0) {
        dt.setMonth(new Date().getMonth() + nav);
    }

    const day = dt.getDate();
    const month = dt.getMonth();
    const year = dt.getFullYear();

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const dateString = firstDay.toLocaleDateString('en-us', {
        weekday: 'long',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    });
    
    const paddingDays = new Date(year, month, 1).getDay(); // 0 is Sunday

    monthDisplay.innerText = `${dt.toLocaleDateString('en-us', { month: 'long' })} ${year}`;
    calendar.innerHTML = '';

    // Empty boxes for days before start of month
    for(let i = 0; i < paddingDays; i++) {
        const daySquare = document.createElement('div');
        daySquare.classList.add('day', 'padding');
        calendar.appendChild(daySquare);
    }

    // Actual days
    for(let i = 1; i <= daysInMonth; i++) {
        const daySquare = document.createElement('div');
        daySquare.classList.add('day');
        
        const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        // Date Number
        const dayNum = document.createElement('div');
        dayNum.innerText = i;
        dayNum.classList.add('day-label');
        
        // Highlight Today
        const todayStr = new Date().toISOString().split('T')[0];
        if (dayString === todayStr) dayNum.classList.add('today-circle');
        
        daySquare.appendChild(dayNum);

        // Find Event
        const eventForDay = events.find(e => e.date === dayString);
        if (eventForDay) {
            const eventDiv = document.createElement('div');
            eventDiv.classList.add('event');
            eventDiv.innerText = eventForDay.activity;
            
            // Color Coding based on Activity text
            if(eventForDay.activity.toLowerCase().includes('rest')) {
                eventDiv.classList.add('evt-rest');
            } else if (eventForDay.activity.toLowerCase().includes('outing')) {
                eventDiv.classList.add('evt-outing');
            } else {
                eventDiv.classList.add('evt-workout');
            }

            eventDiv.addEventListener('click', () => openModal(eventForDay, dayString));
            daySquare.appendChild(eventDiv);
        }

        calendar.appendChild(daySquare);
    }
}

// 5. Modal Logic
function openModal(eventData, dateStr) {
    document.getElementById('modal-date').innerText = new Date(dateStr).toDateString();
    document.getElementById('m-phase').innerText = eventData.phase;
    document.getElementById('m-activity').innerText = eventData.activity;
    document.getElementById('m-speed').innerText = eventData.speed;
    document.getElementById('m-duration').innerText = eventData.duration;
    document.getElementById('m-notes').innerText = eventData.notes;
    
    modal.classList.remove('hidden');
}

document.getElementById('close-modal').addEventListener('click', () => {
    modal.classList.add('hidden');
});

// Close modal on outside click
window.onclick = function(event) {
    if (event.target == modal) {
        modal.classList.add('hidden');
    }
}

// 6. Buttons
document.getElementById('next-btn').addEventListener('click', () => {
    nav++;
    renderCalendar();
});

document.getElementById('prev-btn').addEventListener('click', () => {
    nav--;
    renderCalendar();
});

// Init
loadData();
