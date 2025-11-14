function toICSDate(d) {
  const dt = new Date(d);
  const pad = (n)=> String(n).padStart(2,'0');
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth()+1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(dt.getUTCSeconds())}Z`;
}

function eventToICS(event) {
  const uid = `${event.id}@lichcongtac.local`;
  const dtStart = toICSDate(event.start_time);
  const dtEnd = toICSDate(event.end_time);
  const title = (event.title||'').replace(/\n/g,' ');
  const desc = (event.description||'').replace(/\n/g,' ');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LichCongTac//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${desc}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

module.exports = { eventToICS };
