<#
Second Sight - iki bagimsiz git deposunu (public/private) tek komutla
senkronize eder. Ayni klasor iki ayri .git dizini tarafindan izlenir:
  .git-public  -> altyapi/kod (sablonlar, dashboard, README, script)
  .git-private -> gercek notlar (Notes, Sessions, Concepts, Weekly-Summaries,
                   _staging, _manifest.json, _index, _ogrenme-tercihlerim.md)

Kullanim:
  powershell -File sync.ps1
  powershell -File sync.ps1 -Message "Haftalik guncelleme"
#>

param(
    [string]$Message = "Sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
)

$root = $PSScriptRoot

$publicPaths = @(
    "Reminders\Home.md",
    "README.md",
    "SCHEDULING.md",
    "SCHEDULING\katman-c-prompt.txt",
    "sync.ps1",
    ".gitignore",
    "web-app"
)

$privatePaths = @(
    "Notes",
    "Sessions",
    "Concepts",
    "Weekly-Summaries",
    "_staging",
    "_manifest.json",
    "_index",
    "_ogrenme-tercihlerim.md",
    "SCHEDULING\son-calisma-raporu.md",
    ".gitignore"
)

function Sync-Repo {
    param(
        [string]$GitDir,
        [string]$Label,
        [string[]]$Paths
    )

    Write-Host "== $Label ($GitDir) ==" -ForegroundColor Cyan

    $existing = $Paths | Where-Object { Test-Path (Join-Path $root $_) }
    if ($existing.Count -eq 0) {
        Write-Host "  Izlenecek yol bulunamadi, atlaniyor." -ForegroundColor Yellow
        return
    }

    & git --git-dir="$root\$GitDir" --work-tree="$root" add -- $existing

    & git --git-dir="$root\$GitDir" --work-tree="$root" diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Degisiklik yok." -ForegroundColor DarkGray
        return
    }

    & git --git-dir="$root\$GitDir" --work-tree="$root" commit -m $Message

    & git --git-dir="$root\$GitDir" --work-tree="$root" push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Commit tamam, ama push basarisiz (remote yok/hata). Manuel push gerekebilir." -ForegroundColor Yellow
        return
    }

    Write-Host "  Commit + push tamamlandi." -ForegroundColor Green
}

Sync-Repo -GitDir ".git-public"  -Label "Public (second-sight)"       -Paths $publicPaths
Sync-Repo -GitDir ".git-private" -Label "Private (second-sight-vault)" -Paths $privatePaths
