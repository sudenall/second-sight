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
önce olan en eski kavram gösterilir.

```dataviewjs
// Bkz. yukarıdaki normDate notu - aynı sebeple burada da normalize ediyoruz.
function normDate(v) {
    if (!v) return null;
    const d = dv.date(v);
    return d ? d.toFormat("yyyy-MM-dd") : String(v);
}

const concepts = dv.pages('"Concepts"').where(p => p.type === "concept" && p.date_learned);

const days = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const weekStart = moment().startOf("isoWeek"); // Pazartesi

function conceptsOn(dateStr) {
    return concepts.where(c => normDate(c.date_learned) === dateStr);
}

function findReminder(dayMoment) {
    const dayStr = dayMoment.format("YYYY-MM-DD");
    for (const offset of [3, 2, 1]) {
        const targetStr = dayMoment.clone().subtract(offset, "days").format("YYYY-MM-DD");
        const matches = conceptsOn(targetStr);
        if (matches.length > 0) {
            const label = offset === 1 ? "dün" : `${offset} gün önce`;
            return matches
                .map(c => `${c.file.link} (${label} öğrenmiştin, hatırla)`)
                .join("<br>");
        }
    }
    const overdue = concepts
        .where(c => c.review_due && normDate(c.review_due) < dayStr)
        .sort(c => normDate(c.review_due), 'asc');
    if (overdue.length > 0) {
        const oldest = overdue[0];
        return `${oldest.file.link} (en son bunu öğrenmiştin, hâlâ tekrar etmedin)`;
    }
    return "-";
}

const row = days.map((_, i) => findReminder(weekStart.clone().add(i, "days")));
dv.table(days, [row]);
```

## Gecikmiş Tekrarlar (review_due geçmiş, hiç gösterilmemiş olabilir)

```dataviewjs
// Bkz. yukarıdaki normDate notu - aynı sebeple burada da normalize ediyoruz.
function normDate(v) {
    if (!v) return null;
    const d = dv.date(v);
    return d ? d.toFormat("yyyy-MM-dd") : String(v);
}

const today = moment().format("YYYY-MM-DD");
const overdue = dv.pages('"Concepts"')
    .where(p => p.type === "concept" && p.review_due && normDate(p.review_due) < today)
    .sort(p => normDate(p.review_due), 'asc');

if (overdue.length === 0) {
    dv.paragraph("Gecikmiş tekrar yok.");
} else {
    dv.table(
        ["Kavram", "Kategori", "review_due"],
        overdue.map(c => [c.file.link, c.category ?? "-", normDate(c.review_due)])
    );
}
```
