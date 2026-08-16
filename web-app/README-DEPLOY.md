# Second Sight Web App — Deploy Talimatı (Cloudflare Pages)

Bu doküman sadece talimat verir — henüz hiçbir deploy işlemi yapılmadı.
Aşağıdaki adımları Cloudflare panelinden sen elle uygulayacaksın.

## Genel Mimari

Bu web app `second-sight` (public) reposunun `/web-app/` alt klasöründe
yaşıyor. Build sırasında `Notes/` (v2 konu notları — her not, frontmatter'da
tarihli bir `entries[]` listesi taşıyor), `Weekly-Summaries/`, `_index/`
(içinde `topics.json`, `categories.json`, `tags.json`) klasörlerini okuması
gerekiyor — ama bunlar `second-sight-vault` (private) reposunda. Yerelde bu
sorun yok çünkü ikisi aynı klasörü paylaşıyor; Cloudflare'ın build
ortamında ise sadece public repo klonlanır, bu yüzden build script'i
private repo'yu AYRICA, salt-okunur bir token ile klonlayıp ondan sonra
`astro build`'i çalıştırıyor.

```
Cloudflare build adımları:
1. second-sight (public) repo klonlanır  → web-app/ burada
2. second-sight-vault (private) repo,    → vault-data/ olarak ayrıca klonlanır
   salt-okunur bir GitHub token'ıyla
3. VAULT_DATA_DIR=vault-data ile astro build çalıştırılır
4. web-app/dist/ statik çıktısı npx wrangler deploy ile Cloudflare'a yayınlanır
```

## 1. Salt-Okunur GitHub Token Oluştur (private repo'yu klonlamak için)

1. GitHub → sağ üst profil ikonu → **Settings**.
2. Sol menüde en altta **Developer settings**.
3. **Personal access tokens → Fine-grained tokens → Generate new token**.
4. **Resource owner**: `sudenall` (senin hesabın).
5. **Repository access**: "Only select repositories" seç, sadece
   `second-sight-vault`'ı işaretle.
6. **Permissions → Repository permissions → Contents**: **Read-only**
   seç. Başka hiçbir izin gerekmiyor.
7. **Expiration**: bir tarih seç (örn. 1 yıl) — GitHub fine-grained
   token'lar süresiz olamıyor, süre dolunca yeni token üretip Cloudflare'da
   güncellemen gerekecek.
8. **Generate token** → gösterilen token'ı hemen kopyala (bir daha
   gösterilmiyor). Bunu bir sonraki adımda kullanacaksın.

## 2. Cloudflare Worker Projesi Oluştur

Cloudflare'ın klasik "Pages" ürünü değil, daha yeni **"Create a
Worker" → Connect to Git** akışı kullanılıyor (statik site,
Workers-with-static-assets olarak deploy ediliyor). Aşağıdaki ayarlar,
gerçek denemede karşılaşılan 3 hatanın (aşağıda ayrıca not edildi)
düzeltilmiş, çalışan hali.

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
   → **Create** → **Create a Worker** → **Connect to Git**.
2. GitHub hesabını bağla (istenirse), **second-sight** reposunu seç.
3. **Production branch**: `main`.
4. **Root directory**: `/web-app` — bu ÖNEMLİ, build komutu Cloudflare
   tarafından zaten bu klasörün İÇİNDEN çalıştırılıyor (aşağıdaki build
   komutu bunu varsayıyor, tekrar `cd web-app` YAPMIYOR).
5. `web-app/wrangler.jsonc` repo'da mevcut olmalı (zaten var):
   ```jsonc
   {
     "name": "second-sight",
     "compatibility_date": "2026-08-15",
     "assets": { "directory": "./dist" }
   }
   ```
6. **Build command** alanına aşağıdakini birebir yapıştır (BOŞ
   BIRAKMA — görünüşte optional/loading gösterse de zorunlu, boş
   bırakılırsa "wrangler.jsonc bekleniyor ama yok" hatası alınır):
   ```
   git clone --depth 1 https://x-access-token:$VAULT_REPO_TOKEN@github.com/sudenall/second-sight-vault.git vault-data && npm install && VAULT_DATA_DIR=$(pwd)/vault-data npm run build && npx wrangler deploy
   ```
   Dikkat: Root directory zaten `/web-app` olduğu için komutun başında
   `cd web-app &&` YOK — eklenirse "cd: can't cd to web-app" hatası
   alınır (zaten o klasördesin). `VAULT_DATA_DIR` de `$(pwd)/vault-data`
   olmalı, `$(pwd)/../vault-data` DEĞİL — clone zaten `web-app/`'ın
   içine (`web-app/vault-data`) oluyor, bir üst dizine çıkmak yanlış
   yere işaret eder (build "başarılı" görünür ama Astro `Concepts/
   klasörü bulunamadı` gibi uyarılarla boş içerik üretir).
7. **Environment variables (before deploying)** bölümünü aç, iki değişken
   ekle:
   - `VAULT_REPO_TOKEN` = (1. adımda kopyaladığın token) → sağdaki kalem/
     göz simgesinden **Encrypt** işaretle (bu, secret alanı yapar, panelde
     bir daha düz metin görünmez).
   - `NODE_VERSION` = `22` (Astro 5 için güncel bir Node sürümü garanti
     eder; Cloudflare'ın varsayılanı farklı olabilir).
8. **Save and Deploy**.

İlk build birkaç dakika sürebilir. Bittiğinde Cloudflare sana
`second-sight.pages.dev` gibi (proje adına göre değişen) bir link verecek
— **bu adımdan sonra site herkese açık olur, o yüzden bir sonraki adımı
(Cloudflare Access) atlamadan tamamla.**

## 3. Cloudflare Access ile E-posta Tabanlı Kimlik Doğrulama

Bu adım, siteyi (kod public olsa da) sadece senin e-postanla giriş
yapabilen bir sayfaya çevirir — şifre değil, tek kullanımlık kod (OTP)
e-postana gelir.

1. Cloudflare panelinde sol menüden **Zero Trust** (ya da doğrudan
   [one.dash.cloudflare.com](https://one.dash.cloudflare.com)) sekmesine
   git. İlk kez giriyorsan ücretsiz plan seçimini onaylaman istenebilir
   (50 kullanıcıya kadar ücretsiz, senin için yeterli).
2. Sol menüde **Access → Applications → Add an application**.
3. **Application type**: **Self-hosted** seç.
4. **Application name**: `Second Sight`.
5. **Application domain**: Cloudflare Pages projenin adresini gir (örn.
   `second-sight.pages.dev` — 2. adımdaki deploy sonunda aldığın domain).
6. **Session duration**: tercihine göre (örn. `24 hours` ya da `7 days`).
7. **Add policy** (bir sonraki ekranda):
   - **Policy name**: `Sadece ben`.
   - **Action**: `Allow`.
   - **Include** kuralı: **Emails** seç, `irlandasude@gmail.com` yaz.
8. **Save**.

Bundan sonra siteye giren herkes önce Cloudflare'ın giriş sayfasını
görecek, e-posta adresini girecek, e-postasına gelen kodu girecek — sadece
yukarıda izin verdiğin adres içeri girebilecek.

## 4. Doğrulama

- Deploy tamamlandıktan ve Access kurulduktan sonra, siteye
  (gizli sekmede/farklı bir tarayıcıda) git, e-posta ile giriş yapmayı
  dene, ana sayfanın Obsidian'daki Home.md ile aynı bilgiyi gösterdiğini
  kontrol et.
- İçerik güncellemesi (yeni sohbet işlendiğinde) otomatik yayınlanır.
  Cloudflare Pages sadece **public repo'ya push geldiğinde** yeniden build
  alıyor, ve Katman C normalde sadece private repo'yu (`Notes/`, `_index/`)
  değiştirdiği için public repo'da commit edilecek bir şey olmuyordu — bu
  yüzden `SCHEDULING/katman-c-prompt.txt`'ye bir "DEPLOY TETİKLEYİCİ ADIMI"
  eklendi: Katman C gerçekten bir staging dosyası işlediyse,
  `SCHEDULING/last-content-update.txt` dosyasına o anki zaman damgasını
  yazıp sync.ps1'i çalıştırıyor. `sync.ps1` de bilerek önce **private**'ı
  sonra **public**'i push edecek şekilde sıralandı — bu sıra kritik, çünkü
  Cloudflare'ın build script'i private vault'u klonlarken onun remote'da
  zaten güncel olması gerekiyor (public push'un tetiklediği build,
  private'ın henüz yüklenmemiş bir haline değil, en güncel haline
  bakmalı). Staging klasörü boşsa (işlenecek yeni içerik yoksa) bu adım
  atlanıyor, gereksiz bir rebuild tetiklenmiyor.

## Yerel Geliştirme (hatırlatma)

```powershell
cd web-app
npm install
npm run dev
```

`http://localhost:4321` — yerelde `VAULT_DATA_DIR` ayarlamana gerek yok,
web-app'in bir üst klasörü zaten vault'un kendisi.
