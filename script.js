/* script.js */
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS_ZA05pfAt7Jhi6utZG0ldfiIl6w-FUpgRmeR8vmeuvOaY8lBA9BLYYhSNee_n0I48L4CLPAULuZTR/pub?gid=2062191702&single=true&output=csv';
const PLAN_YEAR = 2026; 

let events = [];
let nav = 0; 
const calendar = document.getElementById('calendar-grid');
const monthDisplay = document.getElementById('month-display');
const modal = document.getElementById('event-modal');

// --- EXPANSION DATA (April - June) ---
const PLAN_EXTENSIONS = [
    { range: "Apr 1 - Apr 11", phase: "15. Spring Push", activity: "Treadmill", speed: "4.6 km/h", duration: "40 Mins", notes: "Increment speed.", difficulty: "Easy" },
    { range: "Apr 12 - Apr 16", phase: "16. Period Rest", activity: "REST", speed: "0 km/h", duration: "0 Mins", notes: "Hormonal Reset.", difficulty: "" },
    { range: "Apr 17 - Apr 27", phase: "17. Endurance+", activity: "Treadmill", speed: "4.6 km/h", duration: "40 Mins", notes: "Solidify 4.6.", difficulty: "Difficult" },
    { range: "Apr 28", phase: "18. The Reset", activity: "OUTING", speed: "REST", duration: "N/A", notes: "Monthly Review.", difficulty: "" },
    { range: "May 1 - May 11", phase: "19. Summer Prep", activity: "Treadmill", speed: "4.7 km/h", duration: "40 Mins", notes: "Heat management.", difficulty: "Easy" },
    { range: "May 12 - May 16", phase: "20. Period Rest", activity: "REST", speed: "0 km/h", duration: "0 Mins", notes: "Hormonal Reset.", difficulty: "" },
    { range: "May 17 - May 27", phase: "21. Peak Quota", activity: "Treadmill", speed: "4.7 km/h", duration: "40 Mins", notes: "Pushing harder.", difficulty: "Difficult" },
    { range: "May 28", phase: "22. The Reset", activity: "OUTING", speed: "REST", duration: "N/A", notes: "Quarterly alignment.", difficulty: "" },
    { range: "Jun 1 - Jun 11", phase: "23. Heat Training", activity: "Treadmill", speed: "4.8 km/h", duration: "40 Mins", notes: "Summer heat focus.", difficulty: "Easy" },
    { range: "Jun 12 - Jun 16", phase: "24. Period Rest", activity: "REST", speed: "0 km/h", duration: "0 Mins", notes: "Hormonal Reset.", difficulty: "" },
    { range: "Jun 17 - Jun 27", phase: "25. Mid-Year Push", activity: "Treadmill", speed: "4.8 km/h", duration: "40 Mins", notes: "Solidify 4.8.", difficulty: "Difficult" },
    { range: "Jun 28", phase: "26. The Reset", activity: "OUTING", speed: "REST", duration: "N/A", notes: "Mid-Year Review.", difficulty: "" }
];

async function loadData() {
    try {
        const response = await fetch(CSV_URL);
        const text = await response.text();
        const rows = parseCSV(text);
        events = [];
        if (rows.length >= 2) {
            const headers = rows[0].map(h => h.toLowerCase());
            const idxDate = headers.findIndex(h => h.includes('date')); 
            const idxAct = headers.findIndex(h => h.includes('activity'));
            const idxDiff = headers.findIndex(h => h.includes('difficulty'));
            const idxPhase = headers.findIndex(h => h.includes('phase'));
            const idxSpeed = headers.findIndex(h => h.includes('speed'));
            const idxDur = headers.findIndex(h => h.includes('duration'));
            const idxNote = headers.findIndex(h => h.includes('strategy'));

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < 2) continue;
                const dateList = expandDateRange(row[idxDate]);
                dateList.forEach(dateStr => {
                    events.push({
                        date: dateStr,
                        phase: row[idxPhase] || '',
                        activity: row[idxAct] || 'Event',
                        difficulty: idxDiff > -1 ? row[idxDiff] : '',
                        speed: row[idxSpeed] || '',
                        duration: row[idxDur] || '',
                        notes: row[idxNote] || ''
                    });
                });
            }
        }
        PLAN_EXTENSIONS.forEach(ext => {
            expandDateRange(ext.range).forEach(dateStr => {
                if (!events.find(e => e.date === dateStr)) {
                    events.push({ date: dateStr, phase: ext.phase, activity: ext.activity, difficulty: ext.difficulty, speed: ext.speed, duration: ext.duration, notes: ext.notes });
                }
            });
        });
        const today = new Date();
        nav = (today.getFullYear() === PLAN_YEAR) ? 0 : (PLAN_YEAR - today.getFullYear()) * 12 + (0 - today.getMonth());
        renderCalendar();
    } catch (e) { console.error(e); }
}

function parseCSV(text) {
    return text.split(/\r?\n/).filter(line => line.trim()).map(line => {
        const regex = /(?:^|,)(?:"([^"]*)"|([^",]*))/g;
        let match, row = [];
        while ((match = regex.exec(line))) row.push((match[1] || match[2] || '').trim());
        return row;
    });
}

function expandDateRange(rawStr) {
    try {
        const cleanStr = rawStr.replace(/\([^\)]+\)/g, '').trim(); 
        const formatDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const parsePart = str => {
            const d = new Date(`${str} ${PLAN_YEAR}`);
            if (str.trim().startsWith("Dec")) d.setFullYear(PLAN_YEAR - 1);
            return d;
        };
        const resultDates = [];
        if (cleanStr.includes("-")) {
            const [s, e] = cleanStr.split("-").map(p => parsePart(p.trim()));
            let start = s; if (start > e) start.setFullYear(PLAN_YEAR - 1);
            for (let d = new Date(start); d <= e; d.setDate(d.getDate() + 1)) resultDates.push(formatDate(d));
        } else {
            const d = parsePart(cleanStr); if (!isNaN(d)) resultDates.push(formatDate(d));
        }
        return resultDates;
    } catch (err) { return []; }
}

function renderCalendar() {
    const today = new Date();
    const dt = new Date(); dt.setDate(1); dt.setMonth(today.getMonth() + nav);
    const month = dt.getMonth(), year = dt.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const paddingDays = new Date(year, month, 1).getDay();
    monthDisplay.innerText = `${dt.toLocaleDateString('en-us', { month: 'long' })} ${year}`;
    calendar.innerHTML = '';
    for(let i = 0; i < paddingDays; i++) calendar.appendChild(Object.assign(document.createElement('div'), { className: 'day padding' }));
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    for(let i = 1; i <= daysInMonth; i++) {
        const daySquare = document.createElement('div'); daySquare.className = 'day';
        const dayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        if (dayString === todayStr) daySquare.classList.add('today');
        const eventData = events.find(e => e.date === dayString);
        if (eventData) {
            const { icon, type } = getEventInfo(eventData.activity, eventData.difficulty);
            daySquare.classList.add(`day-${type}`, 'has-event');
            const detailsHTML = type.includes('workout') ? `<div class="act-title">${eventData.activity}</div><div class="act-detail">${eventData.speed}</div><div class="act-detail">${eventData.duration}</div>` : `<div class="act-title" style="font-size:1rem; margin-top:5px;">${eventData.activity.toUpperCase()}</div>`;
            daySquare.innerHTML = `<div class="day-num">${i}</div><div class="day-emoji">${icon}</div><div class="day-content">${detailsHTML}</div>`;
            daySquare.addEventListener('click', () => openModal(eventData, dayString));
        } else { daySquare.innerHTML = `<div class="day-num">${i}</div>`; }
        calendar.appendChild(daySquare);
    }
}

function getEventInfo(activity, difficulty) {
    const act = (activity || '').toLowerCase(), diff = (difficulty || '').toLowerCase();
    if (act.includes('treadmill')) return diff.includes('easy') ? { icon: '🏃‍♂️', type: 'workout-easy' } : { icon: '🔥', type: 'workout' };
    if (act.includes('outing')) return { icon: '🍜', type: 'outing' };
    if (act.includes('rest')) return { icon: '💤', type: 'rest' };
    return { icon: '🔹', type: 'workout' };
}

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
