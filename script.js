// CONFIGURATION
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS_ZA05pfAt7Jhi6utZG0ldfiIl6w-FUpgRmeR8vmeuvOaY8lBA9BLYYhSNee_n0I48L4CLPAULuZTR/pub?gid=2062191702&single=true&output=csv';
const PLAN_YEAR = 2026; 

let events = [];
let nav = 0; 
const calendar = document.getElementById('calendar-grid');
const monthDisplay = document.getElementById('month-display');
const modal = document.getElementById('event-modal');

// --- EMOJI & STYLE MAPPING ---
function getEventStyle(activity, phase) {
    let icon = '';
    let styleClass = ''; // Default to empty string
    
    const act = (activity || '').toLowerCase();
    const ph = (phase || '').toLowerCase();
    
    // Activity Icons
    if (act.includes('treadmill')) icon = '🏃‍♂️';
    else if (act.includes('outing')) icon = '🎉';
    else if (act.includes('rest')) icon = '🛌';
    else icon = '🔹';

    // Phase Styles
    let phaseIcon = '';
    if (ph.includes('boring')) {
        styleClass = 'phase-boring'; 
        phaseIcon = '⏳';
    } else if (ph.includes('level up') || ph.includes('solidify') || ph.includes('endurance')) {
        styleClass = 'phase-intense'; 
        phaseIcon = '🔥';
    } else if (ph.includes('reset') || ph.includes('period rest')) {
        styleClass = 'phase-reset'; 
        phaseIcon = '🌱';
    } else if (ph.includes('maintenance')) {
        styleClass = 'phase-maint';
        phaseIcon = '🔧';
    } else if (ph.includes('spring')) {
        styleClass = 'phase-maint'; // Reusing maintenance style for spring
        phaseIcon = '☀️';
    }

    return { icon, phaseIcon, styleClass };
}

// 1. Fetch & Initialize
async function loadData() {
    try {
        const response = await fetch(CSV_URL);
        const text = await response.text();
        const rows = parseCSV(text);
        
        if (rows.length < 2) {
            console.warn("CSV has no data rows");
            return;
        }

        // --- SMART COLUMN DETECTION ---
        const headers = rows[0].map(h => h.toLowerCase());
        const idxPhase = headers.findIndex(h => h.includes('phase'));
        const idxDate = headers.findIndex(h => h.includes('date')); 
        const idxAct = headers.findIndex(h => h.includes('activity'));
        const idxSpeed = headers.findIndex(h => h.includes('speed'));
        const idxDur = headers.findIndex(h => h.includes('duration'));
        const idxNote = headers.findIndex(h => h.includes('strategy'));

        if (idxDate === -1 || idxAct === -1) {
            alert("Error: Could not find 'Date' or 'Activity' columns.");
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

        // Jump to Jan 2026
        const today = new Date();
        const diffYears = PLAN_YEAR - today.getFullYear();
        nav = (diffYears * 12) + (0 - today.getMonth()); 

        renderCalendar();

    } catch (e) {
        console.error("Critical Error:", e);
        calendar.innerHTML = `<p style="color:red; text-align:center;">${e.message}</p>`;
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

// 3. Date Parser
function expandDateRange(rawStr) {
    try {
        const cleanStr = rawStr.replace(/\([^\)]+\)/g, '').trim(); 
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
                resultDates.push(d.toISOString().split('T')[0]);
            }
        } else {
            const d = parsePart(cleanStr);
            if (!isNaN(d)) {
                resultDates.push(d.toISOString().split('T')[0]);
            }
        }
        return resultDates;
    } catch (err) {
        return [];
    }
}

// 4. Render Calendar
function renderCalendar() {
    const dt = new Date();
    dt.setMonth(new Date().getMonth() + nav);

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

        const dayEvents = events.filter(e => e.date === dayString);

        dayEvents.forEach(eventData => {
            const { icon, phaseIcon, styleClass } = getEventStyle(eventData.activity, eventData.phase);
            
            const eventDiv = document.createElement('div');
            eventDiv.classList.add('event'); // Always add base class
            
            // FIX: Only add styleClass if it is not empty
            if (styleClass) {
                eventDiv.classList.add(styleClass);
            }
            
            if((eventData.activity||'').toLowerCase().includes('rest')) eventDiv.classList.add('evt-rest');
            else if ((eventData.activity||'').toLowerCase().includes('outing')) eventDiv.classList.add('evt-outing');
            else eventDiv.classList.add('evt-workout');

            eventDiv.innerHTML = `<span>${icon} ${eventData.activity}</span> <span class="phase-icon">${phaseIcon}</span>`;
            eventDiv.addEventListener('click', () => openModal(eventData, dayString));
            
            daySquare.appendChild(eventDiv);
        });

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
