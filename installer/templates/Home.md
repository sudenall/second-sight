---
type: dashboard
---
# Second Sight — Home

This page is computed entirely locally (via Dataview/DataviewJS) and
never calls any AI. It updates automatically every time Obsidian opens.

## This Week's Reminders

Works per **entry**, not per note — the `entries` list in every topic
note's frontmatter (under `Notes/`) is scanned, and each entry is treated
as an independent unit. Each day is checked in order: is there an entry
learned exactly 3 days before → otherwise 2 days before → otherwise
yesterday → otherwise the oldest entry whose `review_due` date has
already passed is shown. Within this 3-day window, an entry is shown
**only once** (whichever day claims it first) — it won't repeat under a
different day's column in the same render.

`last_reminded` (tracked per entry, not per note) isn't a filter — it's
just a marker of whether you've seen/reviewed it. Each day's column is
split into two: unreviewed entries on top (with a **✓ Reviewed** link
next to them), a divider, then reviewed ones below (dimmed, checked, with
a **↺ Undo** link next to them). The title is clickable either way — it
jumps straight to that entry's `## [Date] — [Label]` section
(`[[note-name#anchor]]`).

```dataviewjs
function normDate(v) {
    if (!v) return null;
    const d = dv.date(v);
    return d ? d.toFormat("yyyy-MM-dd") : String(v);
}

// Flattens every topic note's entries[] list (under Notes/) into a flat
// array of entries - each item is an independent unit carrying its own
// date/anchor/last_reminded status.
function flattenEntries() {
    const notes = dv.pages('"Notes"').where(p => p.entries && p.entries.length);
    const flat = [];
    for (const n of notes) {
        for (const e of n.entries) {
            if (!e || !e.date) continue;
            flat.push({
                date: normDate(e.date),
                label: e.label ?? "",
                anchor: e.anchor ?? "",
                review_due: e.review_due ? normDate(e.review_due) : null,
                last_reminded: e.last_reminded ? normDate(e.last_reminded) : "",
                noteTitle: n.title ?? n.file.name,
                fileName: n.file.name,
                filePath: n.file.path,
            });
        }
    }
    return flat;
}

function entryKey(e) { return e.filePath + "::" + e.anchor; }

// Updates an entry's last_reminded inside its own entries[] item - it's
// tracked on the entry with the matching anchor, not on the note itself.
async function setEntryReminded(filePath, anchor, value) {
    const file = app.vault.getAbstractFileByPath(filePath);
    if (!file) return;
    await app.fileManager.processFrontMatter(file, (fm) => {
        if (!fm.entries) return;
        const entry = fm.entries.find(x => x.anchor === anchor);
        if (entry) entry.last_reminded = value;
    });
}

function renderEntryLine(e, note, reminded) {
    const line = document.createElement("div");
    line.style.marginBottom = "4px";
    if (reminded) line.style.opacity = "0.55";

    if (reminded) line.appendChild(document.createTextNode("✓ "));

    const a = document.createElement("a");
    a.className = "internal-link";
    a.innerText = `${e.noteTitle} — ${e.label}`;
    a.href = e.filePath;
    a.style.cursor = "pointer";
    a.onclick = (ev) => {
        ev.preventDefault();
        app.workspace.openLinkText(`${e.fileName}#${e.anchor}`, "", false);
    };
    line.appendChild(a);
    line.appendChild(document.createTextNode(` (${note}) `));

    if (!reminded) {
        const btn = document.createElement("a");
        btn.innerText = "✓ Reviewed";
        btn.style.cursor = "pointer";
        btn.style.fontSize = "0.85em";
        btn.style.color = "var(--text-accent)";
        btn.onclick = async (ev) => {
            ev.preventDefault();
            btn.innerText = "…";
            await setEntryReminded(e.filePath, e.anchor, moment().format("YYYY-MM-DD"));
        };
        line.appendChild(btn);
    } else {
        const undo = document.createElement("a");
        undo.innerText = "↺ Undo";
        undo.style.cursor = "pointer";
        undo.style.fontSize = "0.85em";
        undo.style.color = "var(--text-muted)";
        undo.onclick = async (ev) => {
            ev.preventDefault();
            undo.innerText = "…";
            await setEntryReminded(e.filePath, e.anchor, "");
        };
        line.appendChild(undo);
    }
    return line;
}

const entries = flattenEntries();

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const weekStart = moment().startOf("isoWeek"); // Monday

// Marks an entry once it's shown in one day's column, so it doesn't
// repeat in another day's column within the same render.
const claimed = new Set();

function buildCell(dayMoment) {
    const dayStr = dayMoment.format("YYYY-MM-DD");
    let picked = []; // {e, note}

    for (const offset of [3, 2, 1]) {
        const targetStr = dayMoment.clone().subtract(offset, "days").format("YYYY-MM-DD");
        const matches = entries.filter(e => e.date === targetStr && !claimed.has(entryKey(e)));
        if (matches.length > 0) {
            const label = offset === 1 ? "yesterday" : `${offset} days ago`;
            for (const e of matches) {
                claimed.add(entryKey(e));
                picked.push({ e, note: `learned ${label} — review it` });
            }
            break; // day is settled, stop checking further offsets
        }
    }

    if (picked.length === 0) {
        const overdue = entries
            .filter(e => e.review_due && !claimed.has(entryKey(e)) && e.review_due < dayStr)
            .sort((a, b) => (a.review_due < b.review_due ? -1 : 1));
        if (overdue.length > 0) {
            const oldest = overdue[0];
            claimed.add(entryKey(oldest));
            picked.push({ e: oldest, note: "this was the last thing you learned, you still haven't reviewed it" });
        }
    }

    const cell = document.createElement("div");
    if (picked.length === 0) {
        cell.innerText = "-";
        return cell;
    }

    const notReminded = picked.filter(p => !p.e.last_reminded);
    const reminded = picked.filter(p => p.e.last_reminded);

    for (const p of notReminded) cell.appendChild(renderEntryLine(p.e, p.note, false));
    if (notReminded.length > 0 && reminded.length > 0) cell.appendChild(document.createElement("hr"));
    for (const p of reminded) cell.appendChild(renderEntryLine(p.e, p.note, true));

    return cell;
}

const table = document.createElement("table");
const headRow = document.createElement("tr");
for (const d of days) {
    const th = document.createElement("th");
    th.innerText = d;
    headRow.appendChild(th);
}
table.appendChild(headRow);

const bodyRow = document.createElement("tr");
// Processed Monday through Sunday in order so the "whichever claims it
// first" rule favors the chronologically earliest day (the claimed set
// fills up in this order).
for (let i = 0; i < 7; i++) {
    const td = document.createElement("td");
    td.style.verticalAlign = "top";
    td.appendChild(buildCell(weekStart.clone().add(i, "days")));
    bodyRow.appendChild(td);
}
table.appendChild(bodyRow);

dv.container.appendChild(table);
```

## Weekly Retrospective

Works per **entry**, not per note — the `entries` list of topic notes
under `Notes/` is scanned, and each entry is grouped by its own date into
a category → subcategory → entry hierarchy (a flat list of entries, not
notes). Completely independent of the reminder *filter* above — it
doesn't show once and disappear, it keeps showing every entry learned
that week (up to the 10-item cap below), always. Category/subcategory
headers expand on click. The entry list under each subcategory is split
in two by `last_reminded` status: unreviewed on top (with **✓
Reviewed**), a divider, then reviewed below (dimmed, checked, with **↺
Undo**). The title is clickable either way — it jumps straight to that
entry's `## [Date] — [Label]` section.

```dataviewjs
function normDate(v) {
    if (!v) return null;
    const d = dv.date(v);
    return d ? d.toFormat("yyyy-MM-dd") : String(v);
}

function flattenEntries() {
    const notes = dv.pages('"Notes"').where(p => p.entries && p.entries.length);
    const flat = [];
    for (const n of notes) {
        for (const e of n.entries) {
            if (!e || !e.date) continue;
            flat.push({
                date: normDate(e.date),
                label: e.label ?? "",
                anchor: e.anchor ?? "",
                last_reminded: e.last_reminded ? normDate(e.last_reminded) : "",
                category: n.category ? String(n.category) : "(Uncategorized)",
                subcategory: n.subcategory ? String(n.subcategory) : "(No subcategory)",
                noteTitle: n.title ?? n.file.name,
                fileName: n.file.name,
                filePath: n.file.path,
            });
        }
    }
    return flat;
}

async function setEntryReminded(filePath, anchor, value) {
    const file = app.vault.getAbstractFileByPath(filePath);
    if (!file) return;
    await app.fileManager.processFrontMatter(file, (fm) => {
        if (!fm.entries) return;
        const entry = fm.entries.find(x => x.anchor === anchor);
        if (entry) entry.last_reminded = value;
    });
}

function renderEntryLine(e, reminded) {
    const line = document.createElement("div");
    line.style.marginBottom = "2px";
    if (reminded) line.style.opacity = "0.55";

    if (reminded) line.appendChild(document.createTextNode("✓ "));

    const a = document.createElement("a");
    a.className = "internal-link";
    a.innerText = `${e.noteTitle} — ${e.label}`;
    a.href = e.filePath;
    a.style.cursor = "pointer";
    a.onclick = (ev) => {
        ev.preventDefault();
        app.workspace.openLinkText(`${e.fileName}#${e.anchor}`, "", false);
    };
    line.appendChild(a);

    const action = document.createElement("a");
    action.style.cursor = "pointer";
    action.style.fontSize = "0.85em";
    action.style.marginLeft = "6px";
    if (!reminded) {
        action.innerText = "✓ Reviewed";
        action.style.color = "var(--text-accent)";
        action.onclick = async (ev) => {
            ev.preventDefault();
            action.innerText = "…";
            await setEntryReminded(e.filePath, e.anchor, moment().format("YYYY-MM-DD"));
        };
    } else {
        action.innerText = "↺ Undo";
        action.style.color = "var(--text-muted)";
        action.onclick = async (ev) => {
            ev.preventDefault();
            action.innerText = "…";
            await setEntryReminded(e.filePath, e.anchor, "");
        };
    }
    line.appendChild(action);

    return line;
}

function buildPeriodEl(periodEntries) {
    if (periodEntries.length === 0) {
        const p = document.createElement("p");
        p.innerText = "No entries in this period.";
        return p;
    }

    const byCategory = {};
    for (const e of periodEntries) {
        byCategory[e.category] = byCategory[e.category] || {};
        byCategory[e.category][e.subcategory] = byCategory[e.category][e.subcategory] || [];
        byCategory[e.category][e.subcategory].push(e);
    }

    const wrap = document.createElement("div");
    for (const cat of Object.keys(byCategory).sort()) {
        const subMap = byCategory[cat];
        const catTotal = Object.values(subMap).reduce((sum, arr) => sum + arr.length, 0);

        const catDetails = document.createElement("details");
        const catSummary = document.createElement("summary");
        catSummary.innerText = `${cat} (${catTotal})`;
        catDetails.appendChild(catSummary);

        for (const sub of Object.keys(subMap).sort()) {
            const list = subMap[sub].slice().sort((a, b) => (a.date < b.date ? 1 : -1));

            const subDetails = document.createElement("details");
            subDetails.style.marginLeft = "16px";
            subDetails.style.marginTop = "4px";
            const subSummary = document.createElement("summary");
            subSummary.innerText = `${sub} (${list.length})`;
            subDetails.appendChild(subSummary);

            const shown = list.slice(0, 10);
            const notReminded = shown.filter(e => !e.last_reminded);
            const reminded = shown.filter(e => e.last_reminded);

            const listWrap = document.createElement("div");
            listWrap.style.marginLeft = "16px";
            listWrap.style.marginTop = "4px";
            for (const e of notReminded) listWrap.appendChild(renderEntryLine(e, false));
            if (notReminded.length > 0 && reminded.length > 0) listWrap.appendChild(document.createElement("hr"));
            for (const e of reminded) listWrap.appendChild(renderEntryLine(e, true));

            if (list.length > 10) {
                const more = document.createElement("p");
                more.style.fontSize = "0.85em";
                more.style.opacity = "0.7";
                more.innerText = `+${list.length - 10} more (total ${list.length})`;
                listWrap.appendChild(more);
            }

            subDetails.appendChild(listWrap);
            catDetails.appendChild(subDetails);
        }
        wrap.appendChild(catDetails);
    }
    return wrap;
}

const entries = flattenEntries();

function weekRange(n) { // n=1 -> last week
    const start = moment().startOf("isoWeek").subtract(n, "weeks");
    const end = start.clone().endOf("isoWeek");
    return [start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD")];
}

const weekLabels = ["Last Week", "2 Weeks Ago", "3 Weeks Ago", "4 Weeks Ago"];
const container = document.createElement("div");
container.style.display = "flex";
container.style.gap = "16px";
container.style.flexWrap = "wrap";
container.style.alignItems = "flex-start";

weekLabels.forEach((label, idx) => {
    const [start, end] = weekRange(idx + 1);
    const periodEntries = entries.filter(e => e.date >= start && e.date <= end);

    const col = document.createElement("div");
    col.style.flex = "1";
    col.style.minWidth = "220px";
    const heading = document.createElement("p");
    heading.innerHTML = `<strong>${label} (${periodEntries.length})</strong>`;
    col.appendChild(heading);
    col.appendChild(buildPeriodEl(periodEntries));
    container.appendChild(col);
});

dv.container.appendChild(container);
```

## Monthly Retrospective

Same logic, same category → subcategory → entry hierarchy, same ✓
Reviewed/↺ Undo and anchor-link behavior — just with monthly windows
(the last 3 months).

```dataviewjs
function normDate(v) {
    if (!v) return null;
    const d = dv.date(v);
    return d ? d.toFormat("yyyy-MM-dd") : String(v);
}

function flattenEntries() {
    const notes = dv.pages('"Notes"').where(p => p.entries && p.entries.length);
    const flat = [];
    for (const n of notes) {
        for (const e of n.entries) {
            if (!e || !e.date) continue;
            flat.push({
                date: normDate(e.date),
                label: e.label ?? "",
                anchor: e.anchor ?? "",
                last_reminded: e.last_reminded ? normDate(e.last_reminded) : "",
                category: n.category ? String(n.category) : "(Uncategorized)",
                subcategory: n.subcategory ? String(n.subcategory) : "(No subcategory)",
                noteTitle: n.title ?? n.file.name,
                fileName: n.file.name,
                filePath: n.file.path,
            });
        }
    }
    return flat;
}

async function setEntryReminded(filePath, anchor, value) {
    const file = app.vault.getAbstractFileByPath(filePath);
    if (!file) return;
    await app.fileManager.processFrontMatter(file, (fm) => {
        if (!fm.entries) return;
        const entry = fm.entries.find(x => x.anchor === anchor);
        if (entry) entry.last_reminded = value;
    });
}

function renderEntryLine(e, reminded) {
    const line = document.createElement("div");
    line.style.marginBottom = "2px";
    if (reminded) line.style.opacity = "0.55";

    if (reminded) line.appendChild(document.createTextNode("✓ "));

    const a = document.createElement("a");
    a.className = "internal-link";
    a.innerText = `${e.noteTitle} — ${e.label}`;
    a.href = e.filePath;
    a.style.cursor = "pointer";
    a.onclick = (ev) => {
        ev.preventDefault();
        app.workspace.openLinkText(`${e.fileName}#${e.anchor}`, "", false);
    };
    line.appendChild(a);

    const action = document.createElement("a");
    action.style.cursor = "pointer";
    action.style.fontSize = "0.85em";
    action.style.marginLeft = "6px";
    if (!reminded) {
        action.innerText = "✓ Reviewed";
        action.style.color = "var(--text-accent)";
        action.onclick = async (ev) => {
            ev.preventDefault();
            action.innerText = "…";
            await setEntryReminded(e.filePath, e.anchor, moment().format("YYYY-MM-DD"));
        };
    } else {
        action.innerText = "↺ Undo";
        action.style.color = "var(--text-muted)";
        action.onclick = async (ev) => {
            ev.preventDefault();
            action.innerText = "…";
            await setEntryReminded(e.filePath, e.anchor, "");
        };
    }
    line.appendChild(action);

    return line;
}

function buildPeriodEl(periodEntries) {
    if (periodEntries.length === 0) {
        const p = document.createElement("p");
        p.innerText = "No entries in this period.";
        return p;
    }

    const byCategory = {};
    for (const e of periodEntries) {
        byCategory[e.category] = byCategory[e.category] || {};
        byCategory[e.category][e.subcategory] = byCategory[e.category][e.subcategory] || [];
        byCategory[e.category][e.subcategory].push(e);
    }

    const wrap = document.createElement("div");
    for (const cat of Object.keys(byCategory).sort()) {
        const subMap = byCategory[cat];
        const catTotal = Object.values(subMap).reduce((sum, arr) => sum + arr.length, 0);

        const catDetails = document.createElement("details");
        const catSummary = document.createElement("summary");
        catSummary.innerText = `${cat} (${catTotal})`;
        catDetails.appendChild(catSummary);

        for (const sub of Object.keys(subMap).sort()) {
            const list = subMap[sub].slice().sort((a, b) => (a.date < b.date ? 1 : -1));

            const subDetails = document.createElement("details");
            subDetails.style.marginLeft = "16px";
            subDetails.style.marginTop = "4px";
            const subSummary = document.createElement("summary");
            subSummary.innerText = `${sub} (${list.length})`;
            subDetails.appendChild(subSummary);

            const shown = list.slice(0, 10);
            const notReminded = shown.filter(e => !e.last_reminded);
            const reminded = shown.filter(e => e.last_reminded);

            const listWrap = document.createElement("div");
            listWrap.style.marginLeft = "16px";
            listWrap.style.marginTop = "4px";
            for (const e of notReminded) listWrap.appendChild(renderEntryLine(e, false));
            if (notReminded.length > 0 && reminded.length > 0) listWrap.appendChild(document.createElement("hr"));
            for (const e of reminded) listWrap.appendChild(renderEntryLine(e, true));

            if (list.length > 10) {
                const more = document.createElement("p");
                more.style.fontSize = "0.85em";
                more.style.opacity = "0.7";
                more.innerText = `+${list.length - 10} more (total ${list.length})`;
                listWrap.appendChild(more);
            }

            subDetails.appendChild(listWrap);
            catDetails.appendChild(subDetails);
        }
        wrap.appendChild(catDetails);
    }
    return wrap;
}

const entries = flattenEntries();

function monthRange(n) { // n=1 -> last month
    const start = moment().startOf("month").subtract(n, "months");
    const end = start.clone().endOf("month");
    return [start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD")];
}

const monthLabels = ["Last Month", "Month Before", "Month Before That"];
const container = document.createElement("div");
container.style.display = "flex";
container.style.gap = "16px";
container.style.flexWrap = "wrap";
container.style.alignItems = "flex-start";

monthLabels.forEach((label, idx) => {
    const [start, end] = monthRange(idx + 1);
    const periodEntries = entries.filter(e => e.date >= start && e.date <= end);

    const col = document.createElement("div");
    col.style.flex = "1";
    col.style.minWidth = "220px";
    const heading = document.createElement("p");
    heading.innerHTML = `<strong>${label} (${periodEntries.length})</strong>`;
    col.appendChild(heading);
    col.appendChild(buildPeriodEl(periodEntries));
    container.appendChild(col);
});

dv.container.appendChild(container);
```
