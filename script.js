// CONFIGURATION
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS_ZA05pfAt7Jhi6utZG0ldfiIl6w-FUpgRmeR8vmeuvOaY8lBA9BLYYhSNee_n0I48L4CLPAULuZTR/pub?gid=2062191702&single=true&output=csv';

// CRITICAL: Set this to the year your schedule is built for (2026 based on your screenshot)
const PLAN_YEAR = 2026; 

let events = [];
let nav = 0; 
let clicked = null;
const calendar = document.getElementById('calendar-grid');
const monthDisplay = document.getElementById('month-display');
const modal = document.getElementById('event-modal');

// --- EMOJI & STYLE MAPPING ---
function getEventStyle(activity, phase) {
    let icon = '';
    let styleClass = '';
    
    // 1. Activity Icons
    const act = activity.toLowerCase();
    if (act.includes('treadmill')) icon = '🏃‍♂️';
    else if (act.includes('outing')) icon = '🎉';
    else if (act.includes('rest')) icon = '🛌';
    else icon = '🔹';

    // 2. Phase Styling (Add markers for phase types)
    const ph = phase.toLowerCase();
    let phaseIcon = '';
    
    if (ph.includes('boring')) {
        styleClass = 'phase-boring'; // Gray/Muted
        phaseIcon = '⏳';
    } else if (ph.includes('level up') || ph.includes('solidify')) {
        styleClass = 'phase-intense'; // Bright/Bold
        phaseIcon = '🔥';
    } else if (ph.includes('reset')) {
        styleClass = 'phase-reset'; // Green/Calm
        phaseIcon = '🌱';
    } else if (ph.includes('maintenance')) {
        styleClass = 'phase-maint';
        phaseIcon = '🔧';
    }

    return { icon, phaseIcon, styleClass };
}

// 1. Fetch & Initialize
async function loadData() {
    try {
        const response = await fetch(CSV_URL);
        const text = await response.text();
        const rows = parseCSV(text);
        
        events = [];
        
        rows.forEach(row => {
            if(row.length < 3 || row[1] === 'Phase') return;

            const dateRangeStr = row[2]; 
            const dateList = expandDateRange(dateRangeStr);

            dateList.forEach(dateStr => {
                events.push({
                    date: dateStr,
                    phase: row[1],
                    activity: row[3],
                    speed: row[4],
                    duration: row[5],
                    notes: row[6]
                });
            });
        });

        // Set initial view to January of the Plan Year
        const today = new Date();
        const diffYears = PLAN_YEAR - today.getFullYear();
        // Adjust nav so the calendar opens on Jan 2026 immediately
        nav = (diffYears * 12) + (0 - today.getMonth()); // 0 = Jan

        renderCalendar();

    } catch (e) {
        console.error("Error loading data:", e);
    }
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    const result = [];
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

// 3. Date Parser (Fixed for 2026)
function expandDateRange(rawStr) {
    const cleanStr = rawStr.replace(/\([^\)]+\)/g, '').trim(); 
    
    // Helper to make Date object using PLAN_YEAR
    const parsePart = (str) => {
        // Assume format is "Month Day" (e.g., "Dec 30")
        const d = new Date(`${str} ${PLAN_YEAR}`);
        
        // Handle "Dec" dates belonging to the previous year (e.g. Dec 2025)
        // If the parsed month is Dec and the row is generally about Jan/Feb, shift year back
        // Simple heuristic: If string is Dec, make it PLAN_YEAR - 1
        if (str.startsWith("Dec")) {
            d.setFullYear(PLAN_YEAR - 1);
        }
        return d;
    };

    const resultDates = [];

    if (cleanStr.includes("-")) {
        const parts = cleanStr.split("-");
        let start = parsePart(parts[0].trim());
        let end = parsePart(parts[1].trim());

        // Handle Dec 30 (2025) - Jan 3 (2026)
        if (start > end) {
            start.setFullYear(PLAN_YEAR - 1);
        }

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            resultDates.push(d.toISOString().split('T')[0]);
        }
    } else {
        const d = parsePart(cleanStr);
        resultDates.push(d.toISOString().split('T')[0]);
    }
    return resultDates;
}

// 4. Render Calendar
function renderCalendar() {
    const dt = new Date();
    dt.setMonth(new Date().getMonth() + nav);

    const day = dt.getDate();
    const month = dt.getMonth();
    const year = dt.getFullYear();

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const paddingDays = new Date(year, month, 1).getDay();

    monthDisplay.innerText = `${dt.toLocaleDateString('en-us', { month: 'long' })} ${year}`;
    calendar.innerHTML = '';

    for(let i = 0; i < paddingDays; i++) {
        const daySquare = document.createElement('div');
        daySquare.classList.add('day', 'padding');
        calendar.appendChild(daySquare);
    }

    for(let i = 1; i <= daysInMonth; i++) {
        const daySquare = document.createElement('div');
        daySquare.classList.add('day');
        
        const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        const dayNum = document.createElement('div');
        dayNum.innerText = i;
        dayNum.classList.add('day-label');
        daySquare.appendChild(dayNum);

        const eventForDay = events.find(e => e.date === dayString);
        if (eventForDay) {
            // Get Styling and Icons
            const { icon, phaseIcon, styleClass } = getEventStyle(eventForDay.activity, eventForDay.phase);

            const eventDiv = document.createElement('div');
            eventDiv.classList.add('event', styleClass);
            
            // Add Activity Class for base color (Rest vs Workout)
            if(eventForDay.activity.toLowerCase().includes('rest')) eventDiv.classList.add('evt-rest');
            else if (eventForDay.activity.toLowerCase().includes('outing')) eventDiv.classList.add('evt-outing');
            else eventDiv.classList.add('evt-workout');

            // HTML Content with Icons
            eventDiv.innerHTML = `<span>${icon} ${eventForDay.activity}</span> <span class="phase-icon">${phaseIcon}</span>`;
            
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

document.getElementById('close-modal').addEventListener('click', () => modal.classList.add('hidden'));
window.onclick = function(event) { if (event.target == modal) modal.classList.add('hidden'); }

document.getElementById('next-btn').addEventListener('click', () => { nav++; renderCalendar(); });
document.getElementById('prev-btn').addEventListener('click', () => { nav--; renderCalendar(); });

loadData();
