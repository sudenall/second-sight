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

Her gün için sırayla kontrol edilir: tam 3 gün önce öğrenilmiş bir kavram var
mı → yoksa 2 gün önce → yoksa dün → hiçbiri yoksa `review_due` tarihi o günden
önce olan en eski kavram gösterilir. Bir kavram, bu 3 günlük pencere içinde
(hangi gün önce yakalarsa) **sadece bir kez** gösterilir; aynı render içinde
başka bir gün sütununda tekrar çıkmaz.

`last_reminded`, artık bir filtre değil — sadece görüldü/hatırlandı
durumunu gösteren bir işaret. Her gün sütunu kendi içinde ikiye ayrılır:
üstte henüz hatırlanmamışlar (yanlarında **✓ Hatırladım** linki), bir çizgi,
altında hatırlanmışlar (soluk, ✓ işaretli, tıklanamaz). Linke tıklayınca
`last_reminded` işaretlenir ve concept bir sonraki render'da otomatik olarak
üst gruptan alt gruba düşer — kaybolmaz, sadece pasifleşir.

```dataviewjs
function normDate(v) {
    if (!v) return null;
    const d = dv.date(v);
    return d ? d.toFormat("yyyy-MM-dd") : String(v);
}

async function markReminded(path) {
    const file = app.vault.getAbstractFileByPath(path);
    if (!file) return;
    await app.fileManager.processFrontMatter(file, (fm) => {
        fm.last_reminded = moment().format("YYYY-MM-DD");
    });
}

function renderConceptLine(c, note, reminded) {
    const line = document.createElement("div");
    line.style.marginBottom = "4px";
    if (reminded) line.style.opacity = "0.55";

    if (reminded) line.appendChild(document.createTextNode("✓ "));

    const a = document.createElement("a");
    a.className = "internal-link";
    a.innerText = c.title ?? c.file.name;
    a.href = c.file.path;
    a.onclick = (e) => {
        e.preventDefault();
        app.workspace.openLinkText(c.file.path, "", false);
    };
    line.appendChild(a);
    line.appendChild(document.createTextNode(` (${note}) `));

    if (!reminded) {
        const btn = document.createElement("a");
        btn.innerText = "✓ Hatırladım";
        btn.style.cursor = "pointer";
        btn.style.fontSize = "0.85em";
        btn.style.color = "var(--text-accent)";
        btn.onclick = async (e) => {
            e.preventDefault();
            btn.innerText = "…";
            await markReminded(c.file.path);
        };
        line.appendChild(btn);
    }
    return line;
}

// last_reminded artık bir filtre değil, sadece görüldü/hatırlandı durumu -
// concept'ler yine güne atanıyor, sadece görüntülemede iki gruba ayrılıyor.
const concepts = dv.pages('"Concepts"').where(p => p.type === "concept" && p.date_learned);

const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const weekStart = moment().startOf("isoWeek"); // Pazartesi

// Bu render içinde bir gün sütununda gösterilen kavram, aynı render'daki
// diğer gün sütunlarında tekrar edilmesin diye burada işaretleniyor.
const claimed = new Set();

function buildCell(dayMoment) {
    const dayStr = dayMoment.format("YYYY-MM-DD");
    let entries = []; // {c, note}

    for (const offset of [3, 2, 1]) {
        const targetStr = dayMoment.clone().subtract(offset, "days").format("YYYY-MM-DD");
        const matches = concepts.where(c => normDate(c.date_learned) === targetStr && !claimed.has(c.file.path));
        if (matches.length > 0) {
            const label = offset === 1 ? "dün" : `${offset} gün önce`;
            for (const c of matches) {
                claimed.add(c.file.path);
                entries.push({ c, note: `${label} öğrenmiştin, hatırla` });
            }
            break; // gün belirlendi, offset döngüsünden çık
        }
    }

    if (entries.length === 0) {
        const overdue = concepts
            .where(c => c.review_due && !claimed.has(c.file.path) && normDate(c.review_due) < dayStr)
            .sort(c => normDate(c.review_due), 'asc');
        if (overdue.length > 0) {
            const oldest = overdue[0];
            claimed.add(oldest.file.path);
            entries.push({ c: oldest, note: "en son bunu öğrenmiştin, hâlâ tekrar etmedin" });
        }
    }

    const cell = document.createElement("div");
    if (entries.length === 0) {
        cell.innerText = "-";
        return cell;
    }

    const notReminded = entries.filter(e => !e.c.last_reminded);
    const reminded = entries.filter(e => e.c.last_reminded);

    for (const e of notReminded) cell.appendChild(renderConceptLine(e.c, e.note, false));
    if (notReminded.length > 0 && reminded.length > 0) cell.appendChild(document.createElement("hr"));
    for (const e of reminded) cell.appendChild(renderConceptLine(e.c, e.note, true));

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

Hatırlatma *filtresinden* tamamen bağımsız — bir kez gösterilip kaybolmaz,
her zaman (aşağıdaki 10 sınırı dahilinde) o haftada öğrenilenleri göstermeye
devam eder. `date_learned`'e göre gruplanır, kategori/alt kategori başlıkları
tıklanınca açılır. Her alt kategorinin altındaki concept listesi kendi
içinde `last_reminded` durumuna göre ikiye ayrılır: üstte hatırlanmamışlar,
bir çizgi, altında soluk/✓ işaretli hatırlanmışlar (burada tıklanabilir
değiller, sadece durumu gösterir).

```dataviewjs
function normDate(v) {
    if (!v) return null;
    const d = dv.date(v);
    return d ? d.toFormat("yyyy-MM-dd") : String(v);
}

const concepts = dv.pages('"Concepts"').where(p => p.type === "concept" && p.date_learned).array();

function periodMarkdown(periodConcepts) {
    if (periodConcepts.length === 0) return "_Bu dönemde kavram yok._\n";

    const byCategory = {};
    for (const c of periodConcepts) {
        const cat = c.category ? String(c.category) : "(Kategorisiz)";
        const sub = c.subcategory ? String(c.subcategory) : "(Alt kategorisiz)";
        byCategory[cat] = byCategory[cat] || {};
        byCategory[cat][sub] = byCategory[cat][sub] || [];
        byCategory[cat][sub].push(c);
    }

    let md = "";
    for (const cat of Object.keys(byCategory).sort()) {
        const subMap = byCategory[cat];
        const catTotal = Object.values(subMap).reduce((sum, arr) => sum + arr.length, 0);
        md += `<details><summary>${cat} (${catTotal})</summary>\n\n`;
        for (const sub of Object.keys(subMap).sort()) {
            const list = subMap[sub].sort((a, b) => (normDate(b.date_learned) ?? "").localeCompare(normDate(a.date_learned) ?? ""));
            md += `<details><summary>${sub} (${list.length})</summary>\n\n`;

            const shown = list.slice(0, 10);
            const notReminded = shown.filter(c => !c.last_reminded);
            const reminded = shown.filter(c => c.last_reminded);

            for (const c of notReminded) {
                md += `- [[${c.file.name}|${c.title ?? c.file.name}]]\n`;
            }
            if (notReminded.length > 0 && reminded.length > 0) {
                md += `\n---\n\n`;
            }
            for (const c of reminded) {
                md += `- <span style="opacity:0.55;">✓ [[${c.file.name}|${c.title ?? c.file.name}]]</span>\n`;
            }

            if (list.length > 10) {
                md += `\n_+${list.length - 10} tane daha (toplam ${list.length})_\n`;
            }
            md += `\n</details>\n\n`;
        }
        md += `</details>\n\n`;
    }
    return md;
}

function weekRange(n) { // n=1 -> geçen hafta
    const start = moment().startOf("isoWeek").subtract(n, "weeks");
    const end = start.clone().endOf("isoWeek");
    return [start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD")];
}

const weekLabels = ["Geçen Hafta", "2 Hafta Önce", "3 Hafta Önce", "4 Hafta Önce"];
const cols = weekLabels.map((label, idx) => {
    const [start, end] = weekRange(idx + 1);
    const periodConcepts = concepts.filter(c => {
        const d = normDate(c.date_learned);
        return d && d >= start && d <= end;
    });
    return `<div style="flex:1;min-width:220px;">\n\n**${label} (${periodConcepts.length})**\n\n${periodMarkdown(periodConcepts)}\n</div>`;
});

const wrap = `<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">\n\n${cols.join("\n\n")}\n\n</div>`;
dv.el("div", wrap);
```

## Aylık Geriye Dönük Özet

Aynı mantık, aylık pencerelerle (son 3 ay).

```dataviewjs
function normDate(v) {
    if (!v) return null;
    const d = dv.date(v);
    return d ? d.toFormat("yyyy-MM-dd") : String(v);
}

const concepts = dv.pages('"Concepts"').where(p => p.type === "concept" && p.date_learned).array();

function periodMarkdown(periodConcepts) {
    if (periodConcepts.length === 0) return "_Bu dönemde kavram yok._\n";

    const byCategory = {};
    for (const c of periodConcepts) {
        const cat = c.category ? String(c.category) : "(Kategorisiz)";
        const sub = c.subcategory ? String(c.subcategory) : "(Alt kategorisiz)";
        byCategory[cat] = byCategory[cat] || {};
        byCategory[cat][sub] = byCategory[cat][sub] || [];
        byCategory[cat][sub].push(c);
    }

    let md = "";
    for (const cat of Object.keys(byCategory).sort()) {
        const subMap = byCategory[cat];
        const catTotal = Object.values(subMap).reduce((sum, arr) => sum + arr.length, 0);
        md += `<details><summary>${cat} (${catTotal})</summary>\n\n`;
        for (const sub of Object.keys(subMap).sort()) {
            const list = subMap[sub].sort((a, b) => (normDate(b.date_learned) ?? "").localeCompare(normDate(a.date_learned) ?? ""));
            md += `<details><summary>${sub} (${list.length})</summary>\n\n`;

            const shown = list.slice(0, 10);
            const notReminded = shown.filter(c => !c.last_reminded);
            const reminded = shown.filter(c => c.last_reminded);

            for (const c of notReminded) {
                md += `- [[${c.file.name}|${c.title ?? c.file.name}]]\n`;
            }
            if (notReminded.length > 0 && reminded.length > 0) {
                md += `\n---\n\n`;
            }
            for (const c of reminded) {
                md += `- <span style="opacity:0.55;">✓ [[${c.file.name}|${c.title ?? c.file.name}]]</span>\n`;
            }

            if (list.length > 10) {
                md += `\n_+${list.length - 10} tane daha (toplam ${list.length})_\n`;
            }
            md += `\n</details>\n\n`;
        }
        md += `</details>\n\n`;
    }
    return md;
}

function monthRange(n) { // n=1 -> geçen ay
    const start = moment().startOf("month").subtract(n, "months");
    const end = start.clone().endOf("month");
    return [start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD")];
}

const monthLabels = ["Geçen Ay", "Önceki Ay", "Ondan Önceki Ay"];
const cols = monthLabels.map((label, idx) => {
    const [start, end] = monthRange(idx + 1);
    const periodConcepts = concepts.filter(c => {
        const d = normDate(c.date_learned);
        return d && d >= start && d <= end;
    });
    return `<div style="flex:1;min-width:220px;">\n\n**${label} (${periodConcepts.length})**\n\n${periodMarkdown(periodConcepts)}\n</div>`;
});

const wrap = `<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">\n\n${cols.join("\n\n")}\n\n</div>`;
dv.el("div", wrap);
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
