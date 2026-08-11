# Second Sight

*A second brain that remembers what you forgot to review.*

Claude.ai'de pinlenmiş sohbetlerden öğrenilen bilgileri, kategorize edilmiş ve
ilişkisel bir Obsidian bilgi tabanına (ve ileride bir web arayüzüne) dönüştüren
kişisel "second brain" sistemi.

> Bu repo **sadece altyapıyı** içerir: şablonlar, dashboard script'i, senkron
> aracı ve dokümantasyon. Gerçek not içeriği (Sessions/, Concepts/,
> Weekly-Summaries/, `_staging/`, `_manifest.json`, `_index/`) kasıtlı olarak
> burada değil — ayrı bir **private** repoda tutulur. Detay için
> [Repo ayrımı](#repo-ayrımı-publicprivate) bölümüne bakın.

## Çözülen problem

Claude.ai'deki sohbetlerde zamanla çok fazla şey öğreniliyor, ama bu bilgi
sohbet geçmişinde gömülü kalıyor. Bir şeyi tekrar hatırlamak/uygulamak
gerektiğinde eski sohbetlere dönüp arama yapmak gerekiyor — bu hem yavaş hem
de öğrenilen bilginin birbirine bağlanmasını (ilişkisel bir bilgi ağı olarak
büyümesini) engelliyor. Second Sight bu bilgiyi sohbetten çıkarıp, atomik ve
birbirine bağlı notlara dönüştürerek kalıcı, aranabilir, tekrar edilebilir bir
sisteme taşıyor.

## Mimari

```
claude.ai pinli sohbetler
        │  (Claude Cowork - manuel/tarayıcı üzerinden)
        ▼
   Katman A: Manifest karşılaştırması
   (başlık + son değişiklik → sadece FARKLI olanlar ilerler)
        ▼
   Katman B: Ham çıkarma → _staging/*.md
   (kategorize etmeden, hiçbir öğrenme birimi atlanmadan)
        │  (Claude Code)
        ▼
   Katman C: Kategorize + ilişkilendirme
   (_index/*.json ile hızlı eşleştirme, Session+Concept notu üretimi,
    manifest/index güncelleme, _staging dosyasını silme)
        ▼
   Katman D: Dashboard (Reminders/Home.md)
   (Dataview/DataviewJS, tamamen yerel, AI çağrısı yok)
```

### Katman A — Manifest kontrolü

Sohbetin tam içeriği açılmadan önce sadece başlık + son değişiklik bilgisi
`_manifest.json`'daki `last_seen_modified` ile karşılaştırılır. Eşleşiyorsa o
sohbet tamamen atlanır. Bu, her çalıştırmada bütün sohbetlerin yeniden
işlenmesini (ve gereksiz AI/işlem maliyetini) önler.

### Katman B — Ham çıkarma

Sadece fark bulunan sohbetlerin içeriği açılır ve karar/analiz yapılmadan
`_staging/` klasörüne ham metin olarak yazılır. Format detayı için
[`_staging/README.md`](_staging/README.md).

### Katman C — Kategorize + ilişkilendirme

`_staging/`'deki her dosya için önce `_index/categories.json` ve
`_index/tags.json`'a bakılır (tüm vault taranmaz), mevcut notlarla eşleşme
varsa `related` alanları iki yönlü bağlanır. Session + Concept notları
üretilir, `review_due = date_learned + 3 gün` hesaplanır. İşlem bitince
manifest/index güncellenir, işlenen `_staging` dosyası silinir.

**Kategori iki katmanlı**: `category` (geniş üst başlık, örn. "AI Certified
Architect") ve `subcategory` (o üst başlık altında daha spesifik, örn.
"Claude Developer Platform"). İkisi de esnek büyüyen bir taksonomi —
`_index/categories.json`'da her `category` kendi `subcategories` listesini
taşır. Mevcut olanlardan uygun yoksa (kategori ya da alt kategori fark etmez)
yeni eklemeden önce onay istenir.

Eksiksizlik kuralı: bir sohbette geçen HER ayrı öğrenme birimi (kavram,
teknik/yöntem, mimari karar, sorun, çözüm, düzelen yanlış anlama,
karşılaştırma/trade-off) ayrı bir concept notu adayıdır. Önemsiz görünse bile
atlanmaz; en fazla küçük/bağlantılı iki alt-kavram tek notta birleştirilir.

### Katman D — Dashboard

`Reminders/Home.md`, kategori bazlı tablolar ve haftalık hatırlatma
tablosunu Dataview/DataviewJS ile hesaplar. Bir kere kurulur, sonrası her
Obsidian açılışında otomatik ve ücretsiz çalışır.

## Maliyet-verimlilik yaklaşımı

- **Manifest**: değişmeyen sohbetler hiç açılmaz.
- **Staging**: ham çıkarma ve kategorize/ilişkilendirme ayrı adımlar — biri
  diğerini tekrar tetiklemez.
- **Index (categories.json / tags.json)**: ilişkilendirme için tüm vault
  yerine küçük index dosyaları taranır.
- **Dashboard**: AI çağrısı gerektirmeyen, tamamen yerel Dataview/DataviewJS.

## Repo ayrımı (public/private)

Aynı vault klasörü, **iki bağımsız git deposu** tarafından izlenir
(`git --git-dir` tekniği, aynı klasörde iki ayrı `.git` dizini):

| Repo | Git dizini | İçerik | Görünürlük |
|---|---|---|---|
| `second-sight` (bu repo) | `.git-public` | `_templates/`, `Reminders/Home.md`, `README.md`, `SCHEDULING.md`, `sync.ps1`, `.gitignore` | Public |
| `second-sight-vault` | `.git-private` | `Sessions/`, `Concepts/`, `Weekly-Summaries/`, `_staging/`, `_manifest.json`, `_index/` | Private |

Vault klasör yapısı tam olarak spesifikasyondaki gibi tek parça kalır; sadece
git tarafında iki ayrı geçmiş tutulur.

### Senkronizasyon

Obsidian'da normal şekilde not oluşturup/düzenledikten sonra tek komut:

```powershell
powershell -File sync.ps1
```

Bu script her iki repoyu da kendi dosya listesiyle stage eder, değişiklik
varsa commit + push eder. Hangi repoya hangi dosyanın gittiğini düşünmene
gerek yok — script bunu `publicPaths` / `privatePaths` listeleriyle otomatik
ayırıyor. Tam otomatik (zamanlanmış) çalıştırma için bkz. [`SCHEDULING.md`](SCHEDULING.md).

## Kullanılan araçlar

- **Obsidian** — vault, Dataview ve Templater eklentileri (zaten kurulu)
- **Claude Cowork** — pinli sohbet tarama (Katman A/B), claude.ai hesabı
  üzerinden manuel tetiklenir
- **Claude Code** — kategorize/ilişkilendirme (Katman C), staging dosyalarını
  işler
- **Git / GitHub** — iki bağımsız repo (public altyapı, private vault)
- **PowerShell** — `sync.ps1` ile senkron

## Durum

Klasör yapısı, şablonlar, index/manifest iskeletleri ve dashboard kuruldu.
Web arayüzü aşaması henüz başlamadı — önce kurgusal örnek veriyle Katman C
test ediliyor.
