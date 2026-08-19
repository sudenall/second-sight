<#
Second Sight - syncs two independent git repos (public/private) with one
command. The same folder is tracked by two separate .git directories:
  .git-public  -> infra/code (templates, dashboard, README, script)
  .git-private -> actual notes (Notes, Sessions, Concepts, Weekly-Summaries,
                   _staging, _manifest.json, _index, _ogrenme-tercihlerim.md)

Usage:
  powershell -File sync.ps1
  powershell -File sync.ps1 -Message "Weekly update"
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
    "SCHEDULING\last-content-update.txt",
    "sync.ps1",
    ".gitignore",
    "web-app",
    "installer"
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
    "PROJECT-STATUS.md",
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
        Write-Host "  No tracked paths found, skipping." -ForegroundColor Yellow
        return
    }

    & git --git-dir="$root\$GitDir" --work-tree="$root" add -- $existing

    & git --git-dir="$root\$GitDir" --work-tree="$root" diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  No changes." -ForegroundColor DarkGray
        return
    }

    & git --git-dir="$root\$GitDir" --work-tree="$root" commit -m $Message

    & git --git-dir="$root\$GitDir" --work-tree="$root" push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Commit done, but push failed (no remote / error). Manual push may be needed." -ForegroundColor Yellow
        return
    }

    Write-Host "  Commit + push completed." -ForegroundColor Green
}

# Private once, Public second - deliberately in this order. Cloudflare
# Pages watches the PUBLIC repo for pushes and, on trigger, clones the
# PRIVATE vault repo fresh to pull in content (see web-app/README-DEPLOY.md
# and src/lib/vault-dir.mjs). If Public pushed first, a build could kick
# off and clone Private before its new content actually landed on the
# remote, shipping a stale site. Pushing Private first guarantees Private's
# remote is already up to date by the time Public's push (and therefore
# Cloudflare's build) happens.
Sync-Repo -GitDir ".git-private" -Label "Private (second-sight-vault)" -Paths $privatePaths
Sync-Repo -GitDir ".git-public"  -Label "Public (second-sight)"       -Paths $publicPaths
