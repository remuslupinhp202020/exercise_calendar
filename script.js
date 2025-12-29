// CONFIGURATION
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS_ZA05pfAt7Jhi6utZG0ldfiIl6w-FUpgRmeR8vmeuvOaY8lBA9BLYYhSNee_n0I48L4CLPAULuZTR/pub?gid=2062191702&single=true&output=csv';
const PLAN_YEAR = 2026; 

let events = [];
let nav = 0; 
const calendar = document.getElementById('calendar-grid');
const monthDisplay = document.getElementById('month-display');
const modal = document.getElementById('event-modal');

// --- ICONS & TYPES ---
// Updated function accepts 'phase' as a second argument
// Updated function accepts 'phase' as a second argument
function getEventInfo(activity, phase) {
    let icon = '';
    let type = 'workout'; 
    
    const act = (activity || '').toLowerCase();
    const ph = (phase || '').toLowerCase();
    
    if (act.includes('treadmill')) {
        // LOGIC: If it's "Boring" -> Running Man. Otherwise (Level Up/Intense) -> Fire.
        if (ph.includes('boring')) {
            icon = '🏃‍♂️'; 
        } else {
            icon = '🔥'; 
        }
        type = 'workout';
    } else if (act.includes('outing')) {
        icon = '🍜';
        type = 'outing';
    } else if (act.includes('rest')) {
        icon = '💤';
        type = 'rest';
    } else {
        icon = '🔹';
        type = 'workout';
    }

    return { icon, type };
}

// 1. Fetch
async function loadData() {
    try {
        const response = await fetch(CSV_URL);
        const text = await response.text();
        const rows = parseCSV(text);
        
        if (rows.length < 2) {
            console.error("CSV empty");
            return;
        }

        // Auto-detect columns
        const headers = rows[0].map(h => h.toLowerCase());
        const idxPhase = headers.findIndex(h => h.includes('phase'));
        const idxDate = headers.findIndex(h => h.includes('date')); 
        const idxAct = headers.findIndex(h => h.includes('activity'));
        const idxSpeed = headers.findIndex(h => h.includes('speed'));
        const idxDur = headers.findIndex(h => h.includes('duration'));
        const idxNote = headers.findIndex(h => h.includes('strategy'));

        if (idxDate === -1 || idxAct === -1) {
            alert("Error: Missing Date or Activity columns in Sheet.");
            return;
        }

        events = [];
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length < 2) continue;

            const dateRangeStr = row[idxDate];
            if (!dateRangeStr) continue;

            const dateList = expandDateRange(dateRangeStr);

            dateList.forEach(dateStr => {
                events.push({
                    date: dateStr,
                    phase: row[idxPhase] || '',
                    activity: row[idxAct] || 'Event',
                    speed: row[idxSpeed] || '',
                    duration: row[idxDur] || '',
                    notes: row[idxNote] || ''
                });
            });
        }

        const today = new Date();
        const diffYears = PLAN_YEAR - today.getFullYear();
        nav = (diffYears * 12) + (0 - today.getMonth()); 

        renderCalendar();

    } catch (e) {
        console.error(e);
        calendar.innerHTML = `<div style="text-align:center; padding:20px; color:red;">Error loading data. Check console.</div>`;
    }
}

// 2. CSV Parser
function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    const result = [];
    for (let i = 0; i < lines.length; i++) {
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

// 3. Date Parser (FIXED TIMEZONE ISSUE)
function expandDateRange(rawStr) {
    try {
        const cleanStr = rawStr.replace(/\([^\)]+\)/g, '').trim(); 
        
        // Helper: Create string YYYY-MM-DD manually to avoid Timezone shifts
        const formatDate = (dateObj) => {
            const y = dateObj.getFullYear();
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        const parsePart = (str) => {
            if(!str) return new Date();
            const d = new Date(`${str} ${PLAN_YEAR}`);
            if (str.trim().startsWith("Dec")) {
                d.setFullYear(PLAN_YEAR - 1);
            }
            return d;
        };

        const resultDates = [];

        if (cleanStr.includes("-")) {
            const parts = cleanStr.split("-");
            let start = parsePart(parts[0].trim());
            let end = parsePart(parts[1].trim());

            if (start > end) start.setFullYear(PLAN_YEAR - 1);

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                resultDates.push(formatDate(d));
            }
        } else {
            const d = parsePart(cleanStr);
            if (!isNaN(d)) {
                resultDates.push(formatDate(d));
            }
        }
        return resultDates;
    } catch (err) {
        console.warn("Date Error", err);
        return [];
    }
}

// 4. Render Calendar
function renderCalendar() {
    const dt = new Date();
    dt.setDate(1); 
    dt.setMonth(new Date().getMonth() + nav);

    const month = dt.getMonth();
    const year = dt.getFullYear();

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const paddingDays = new Date(year, month, 1).getDay();

    monthDisplay.innerText = `${dt.toLocaleDateString('en-us', { month: 'long' })} ${year}`;
    calendar.innerHTML = '';

    // Padding
    for(let i = 0; i < paddingDays; i++) {
        const daySquare = document.createElement('div');
        daySquare.classList.add('day', 'padding');
        calendar.appendChild(daySquare);
    }

    // Days
    for(let i = 1; i <= daysInMonth; i++) {
        const daySquare = document.createElement('div');
        daySquare.classList.add('day');
        
        // Construct YYYY-MM-DD manually to match expandDateRange
        const currentMonthStr = String(month + 1).padStart(2, '0');
        const currentDayStr = String(i).padStart(2, '0');
        const dayString = `${year}-${currentMonthStr}-${currentDayStr}`;
        
        const eventData = events.find(e => e.date === dayString);

        if (eventData) {
            const { icon, type } = getEventInfo(eventData.activity);
            daySquare.classList.add(`day-${type}`); 
            daySquare.classList.add('has-event');
        if (eventData.phase.toLowerCase().includes('boring')) {
                daySquare.classList.add('boring-phase');
            }
            let detailsHTML = '';
            
            if (type === 'workout') {
                detailsHTML = `
                    <div class="act-title">${eventData.activity}</div>
                    <div class="act-detail">${eventData.speed}</div>
                    <div class="act-detail">${eventData.duration}</div>
                `;
            } else {
                detailsHTML = `
                    <div class="act-title" style="font-size:1rem; margin-top:5px;">${eventData.activity.toUpperCase()}</div>
                `;
            }

            daySquare.innerHTML = `
                <div class="day-num">${i}</div>
                <div class="day-emoji">${icon}</div>
                <div class="day-content">
                    ${detailsHTML}
                </div>
            `;
            daySquare.addEventListener('click', () => openModal(eventData, dayString));

        } else {
            daySquare.innerHTML = `<div class="day-num">${i}</div>`;
        }

        calendar.appendChild(daySquare);
    }
}

// 5. Modal
function openModal(data, dateStr) {
    document.getElementById('modal-date').innerText = new Date(dateStr).toDateString();
    document.getElementById('m-phase').innerText = data.phase;
    document.getElementById('m-activity').innerText = data.activity;
    document.getElementById('m-speed').innerText = data.speed;
    document.getElementById('m-duration').innerText = data.duration;
    document.getElementById('m-notes').innerText = data.notes;
    modal.classList.remove('hidden');
}

document.getElementById('close-modal').addEventListener('click', () => modal.classList.add('hidden'));
window.onclick = function(event) { if (event.target == modal) modal.classList.add('hidden'); }

document.getElementById('next-btn').addEventListener('click', () => { nav++; renderCalendar(); });
document.getElementById('prev-btn').addEventListener('click', () => { nav--; renderCalendar(); });

loadData();
