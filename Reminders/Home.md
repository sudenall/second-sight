---
type: dashboard
---
# Second Sight — Ana Sayfa

Bu sayfa tamamen yerel olarak (Dataview/DataviewJS ile) hesaplanır, hiçbir AI
çağrısı gerektirmez. Obsidian her açıldığında otomatik güncellenir.

## Kategori Bazlı Kavramlar

```dataviewjs
// Dataview, "2026-08-11" gibi tarih string'lerini otomatik olarak bir Luxon
// DateTime nesnesine çeviriyor. String(dateTimeNesnesi) tam bir ISO string
// ("2026-08-11T00:00:00.000+03:00") üretir - bu yüzden her yerde normDate
// ile düz "yyyy-MM-dd" formatına indirgeyip öyle karşılaştırıyoruz/gösteriyoruz.
function normDate(v) {
    if (!v) return null;
    const d = dv.date(v);
    return d ? d.toFormat("yyyy-MM-dd") : String(v);
}

const concepts = dv.pages('"Concepts"').where(p => p.type === "concept");

const categories = new Set();
for (const c of concepts) {
    if (c.category) categories.add(String(c.category));
}

if (categories.size === 0) {
    dv.paragraph("Henüz kategorize edilmiş kavram yok.");
}

for (const cat of Array.from(categories).sort()) {
    dv.header(3, cat);

    const inCat = concepts.where(c => String(c.category) === cat);
    const subcats = new Set();
    for (const c of inCat) {
        if (c.subcategory) subcats.add(String(c.subcategory));
    }

    if (subcats.size === 0) {
        const rows = inCat
            .sort(c => normDate(c.date_learned) ?? "", 'desc')
            .map(c => [c.file.link, c.difficulty ?? "-", normDate(c.date_learned) ?? "-", c.status ?? "-"]);
        dv.table(["Kavram", "Zorluk", "Öğrenilme Tarihi", "Durum"], rows);
        continue;
    }

    for (const sub of Array.from(subcats).sort()) {
        dv.header(4, sub);
        const rows = inCat
            .where(c => String(c.subcategory) === sub)
            .sort(c => normDate(c.date_learned) ?? "", 'desc')
            .map(c => [c.file.link, c.difficulty ?? "-", normDate(c.date_learned) ?? "-", c.status ?? "-"]);
        dv.table(["Kavram", "Zorluk", "Öğrenilme Tarihi", "Durum"], rows);
    }
}
```

## Bu Haftanın Hatırlatmaları

**v2 (girdi-bazlı):** Artık NOT değil, GİRDİ (entry) bazlı çalışır —
`Notes/` klasöründeki her konu notunun frontmatter'ındaki `entries`
listesi taranır, her girdi bağımsız bir birim olarak işlenir. Her gün
için sırayla kontrol edilir: tam 3 gün önce öğrenilmiş bir girdi var mı →
yoksa 2 gün önce → yoksa dün → hiçbiri yoksa `review_due` tarihi o günden
önce olan en eski girdi gösterilir. Bir girdi, bu 3 günlük pencere içinde
(hangi gün önce yakalarsa) **sadece bir kez** gösterilir; aynı render
içinde başka bir gün sütununda tekrar çıkmaz.

`last_reminded` (artık not değil, GİRDİ seviyesinde tutulur), bir filtre
değil — sadece görüldü/hatırlandı durumunu gösteren bir işaret. Her gün
sütunu kendi içinde ikiye ayrılır: üstte henüz hatırlanmamışlar
(yanlarında **✓ Hatırladım** linki), bir çizgi, altında hatırlanmışlar
(soluk, ✓ işaretli, yanlarında **↺ Geri Al** linki). Başlık metni her iki
durumda da tıklanabilir — notun ilgili `## [Tarih] — [Etiket]` bölümüne
(`[[not-adi#anchor]]`) doğrudan gider.

```dataviewjs
function normDate(v) {
    if (!v) return null;
    const d = dv.date(v);
    return d ? d.toFormat("yyyy-MM-dd") : String(v);
}

// Notes/ klasöründeki her konu notunun entries[] listesini düz bir
// girdi dizisine indirger - her öğe kendi tarihini/anchor'ını/
// last_reminded durumunu taşıyan bağımsız bir birim olur.
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

// Bir girdinin last_reminded'ini kendi entries[] öğesi içinde günceller -
// artık notun kendisinde değil, ilgili anchor'a sahip girdide tutuluyor.
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
        btn.innerText = "✓ Hatırladım";
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
        undo.innerText = "↺ Geri Al";
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

const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const weekStart = moment().startOf("isoWeek"); // Pazartesi

// Bu render içinde bir gün sütununda gösterilen girdi, aynı render'daki
// diğer gün sütunlarında tekrar edilmesin diye burada işaretleniyor.
const claimed = new Set();

function buildCell(dayMoment) {
    const dayStr = dayMoment.format("YYYY-MM-DD");
    let picked = []; // {e, note}

    for (const offset of [3, 2, 1]) {
        const targetStr = dayMoment.clone().subtract(offset, "days").format("YYYY-MM-DD");
        const matches = entries.filter(e => e.date === targetStr && !claimed.has(entryKey(e)));
        if (matches.length > 0) {
            const label = offset === 1 ? "dün" : `${offset} gün önce`;
            for (const e of matches) {
                claimed.add(entryKey(e));
                picked.push({ e, note: `${label} öğrenmiştin, hatırla` });
            }
            break; // gün belirlendi, offset döngüsünden çık
        }
    }

    if (picked.length === 0) {
        const overdue = entries
            .filter(e => e.review_due && !claimed.has(entryKey(e)) && e.review_due < dayStr)
            .sort((a, b) => (a.review_due < b.review_due ? -1 : 1));
        if (overdue.length > 0) {
            const oldest = overdue[0];
            claimed.add(entryKey(oldest));
            picked.push({ e: oldest, note: "en son bunu öğrenmiştin, hâlâ tekrar etmedin" });
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
// Pazartesi'den Pazar'a sırayla işleniyor ki "hangisi önce yakalarsa" kuralı
// kronolojik olarak en erken günü kazansın (claimed kümesi bu sırayla dolar).
for (let i = 0; i < 7; i++) {
    const td = document.createElement("td");
    td.style.verticalAlign = "top";
    td.appendChild(buildCell(weekStart.clone().add(i, "days")));
    bodyRow.appendChild(td);
}
table.appendChild(bodyRow);

dv.container.appendChild(table);
```

## Haftalık Geriye Dönük Özet

**v2 (girdi-bazlı):** Artık NOT değil, GİRDİ bazlı — `Notes/` klasöründeki
konu notlarının `entries` listesi taranır, her girdi kendi tarihiyle
bağımsız bir birim olarak kategori→alt kategori→girdi hiyerarşisinde
gruplanır (not değil, doğrudan girdi listesi). Hatırlatma *filtresinden*
tamamen bağımsız — bir kez gösterilip kaybolmaz, her zaman (aşağıdaki 10
sınırı dahilinde) o haftada öğrenilen girdileri göstermeye devam eder.
Kategori/alt kategori başlıkları tıklanınca açılır. Her alt kategorinin
altındaki girdi listesi kendi içinde `last_reminded` durumuna göre ikiye
ayrılır: üstte hatırlanmamışlar (yanlarında **✓ Hatırladım**), bir çizgi,
altında hatırlanmışlar (soluk, ✓ işaretli, yanlarında **↺ Geri Al**).
Başlık her iki durumda da tıklanabilir — o girdinin `## [Tarih] —
[Etiket]` bölümüne doğrudan gider.

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
                category: n.category ? String(n.category) : "(Kategorisiz)",
                subcategory: n.subcategory ? String(n.subcategory) : "(Alt kategorisiz)",
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
        action.innerText = "✓ Hatırladım";
        action.style.color = "var(--text-accent)";
        action.onclick = async (ev) => {
            ev.preventDefault();
            action.innerText = "…";
            await setEntryReminded(e.filePath, e.anchor, moment().format("YYYY-MM-DD"));
        };
    } else {
        action.innerText = "↺ Geri Al";
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
        p.innerText = "Bu dönemde girdi yok.";
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
                more.innerText = `+${list.length - 10} tane daha (toplam ${list.length})`;
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

function weekRange(n) { // n=1 -> geçen hafta
    const start = moment().startOf("isoWeek").subtract(n, "weeks");
    const end = start.clone().endOf("isoWeek");
    return [start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD")];
}

const weekLabels = ["Geçen Hafta", "2 Hafta Önce", "3 Hafta Önce", "4 Hafta Önce"];
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

## Aylık Geriye Dönük Özet

**v2 (girdi-bazlı):** Aynı mantık, aynı kategori→alt kategori→girdi
hiyerarşisi, aynı ✓ Hatırladım/↺ Geri Al ve anchor-linki davranışı — sadece
aylık pencerelerle (son 3 ay).

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
                category: n.category ? String(n.category) : "(Kategorisiz)",
                subcategory: n.subcategory ? String(n.subcategory) : "(Alt kategorisiz)",
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
        action.innerText = "✓ Hatırladım";
        action.style.color = "var(--text-accent)";
        action.onclick = async (ev) => {
            ev.preventDefault();
            action.innerText = "…";
            await setEntryReminded(e.filePath, e.anchor, moment().format("YYYY-MM-DD"));
        };
    } else {
        action.innerText = "↺ Geri Al";
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
        p.innerText = "Bu dönemde girdi yok.";
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
                more.innerText = `+${list.length - 10} tane daha (toplam ${list.length})`;
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

function monthRange(n) { // n=1 -> geçen ay
    const start = moment().startOf("month").subtract(n, "months");
    const end = start.clone().endOf("month");
    return [start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD")];
}

const monthLabels = ["Geçen Ay", "Önceki Ay", "Ondan Önceki Ay"];
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

## Gecikmiş Tekrarlar (review_due geçmiş, hiç gösterilmemiş olabilir)

Diğer tablolarla tutarlı olsun diye burada da `last_reminded` sadece
görüntüleme grubunu belirliyor, listeden çıkarmıyor.

```dataviewjs
function normDate(v) {
    if (!v) return null;
    const d = dv.date(v);
    return d ? d.toFormat("yyyy-MM-dd") : String(v);
}

const today = moment().format("YYYY-MM-DD");
const overdue = dv.pages('"Concepts"')
    .where(p => p.type === "concept" && p.review_due && normDate(p.review_due) < today)
    .sort(p => normDate(p.review_due), 'asc')
    .array();

if (overdue.length === 0) {
    dv.paragraph("Gecikmiş tekrar yok.");
} else {
    const notReminded = overdue.filter(c => !c.last_reminded);
    const reminded = overdue.filter(c => c.last_reminded);

    let md = "";
    for (const c of notReminded) {
        md += `- [[${c.file.name}|${c.title ?? c.file.name}]] — *${c.category ?? "-"}*, review_due: ${normDate(c.review_due)}\n`;
    }
    if (notReminded.length > 0 && reminded.length > 0) {
        md += "\n---\n\n";
    }
    for (const c of reminded) {
        md += `- <span style="opacity:0.55;">✓ [[${c.file.name}|${c.title ?? c.file.name}]] — *${c.category ?? "-"}*, review_due: ${normDate(c.review_due)}</span>\n`;
    }
    dv.el("div", md);
}
```
