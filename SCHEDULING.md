# Zamanlama Talimatları

Bu doküman sadece talimat verir — hiçbir görev bu repo kurulumu sırasında
otomatik olarak Windows Task Scheduler'a eklenmedi. Aşağıdaki adımları ne
zaman hazır olursan o zaman uygula.

Pinli sohbet sayısı günlük büyük değişmeyeceği için tüm taramayı (Katman
A-C) **haftalık** çalıştırmak öneriliyor.

## 1. Katman A/B (Claude Cowork) — otomatikleştirilemez, haftalık hatırlatma öner

Claude Cowork ile claude.ai'deki pinli sohbetleri tarama adımı interaktif bir
AI oturumu gerektirdiği için (tarayıcı + hesap girişi), işletim sistemi
seviyesinde tam otomatik zamanlanamaz. Bunun yerine:

- Windows'ta bir hatırlatma kur: **Ayarlar → Saat ve Dil → Alarmlar ve Saat**
  uygulaması ya da Outlook/Google Takvim'de haftalık tekrarlayan bir hatırlatma
  ("Second Sight: pinli sohbetleri tara") oluştur.
- Bu adımı tamamladığında Cowork, farkları `_staging/`'e yazacak.

## 2. Katman C (Claude Code) — Task Scheduler ile otomatikleştirilebilir

`_staging/` klasöründe dosya birikince, Claude Code CLI'ı başsız (headless)
modda çalıştırarak Katman C'yi otomatik tetikleyebilirsin:

1. **Görev Zamanlayıcı**'yı aç (Win+R → `taskschd.msc`).
2. Sağ panelden **Temel Görev Oluştur...** seç.
3. İsim: `Second Sight - Katman C`.
4. Tetikleyici: **Haftalık**, istediğin gün/saat (örn. Pazartesi 09:00).
5. Eylem: **Bir program başlat**.
6. Program/script: `claude` (veya `claude.exe`'nin tam yolu, `where claude`
   ile bulunabilir).
7. Argümanlar (örnek):
   ```
   -p "D:\Vaults For Obsidian\second-brain-for-sude\_staging klasöründeki tüm dosyaları, projenin Katman C kurallarına göre işle: kategorize et, ilişkilendir, Session+Concept notları üret, manifest ve index dosyalarını güncelle, işlenen staging dosyalarını sil."
   ```
8. Başlangıç dizini (Start in): `D:\Vaults For Obsidian\second-brain-for-sude`
9. Kaydet.

> Not: `-p` (print/headless mod) Claude Code'u interaktif olmadan çalıştırır.
> İlk birkaç çalıştırmayı manuel tetikleyip çıktısını kontrol etmeden tam
> otomatiğe bağlamanı önermeyiz.

## 3. Git senkronu — Task Scheduler ile otomatikleştirilebilir

Katman C görevinin hemen ardından `sync.ps1`'i çalıştıracak ikinci bir adım
(ya da aynı görevin ikinci eylemi) eklenebilir:

- Program/script: `powershell.exe`
- Argümanlar:
  ```
  -NoProfile -ExecutionPolicy Bypass -File "D:\Vaults For Obsidian\second-brain-for-sude\sync.ps1"
  ```

Bu şekilde: sen sadece haftada bir Cowork ile sohbetleri tarıyorsun, geri
kalan her şey (kategorize, dashboard güncelleme, git commit/push) otomatik
akıyor.
