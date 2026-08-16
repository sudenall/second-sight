<#
Second Sight - Installer

Sets up the folder structure and starter files for a new Second Sight
vault: a personal "second brain" system that turns pinned claude.ai chats
into a categorized, reviewable Obsidian knowledge base.

This script only creates folders and files inside the Obsidian vault you
point it at. It does not touch git, does not install anything, and does
not talk to the network.

Usage:
  powershell -File install.ps1
#>

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "  $Message" -ForegroundColor Gray
}

function Write-Done {
    param([string]$Message)
    Write-Host "$Message" -ForegroundColor Green
}

Write-Host ""
Write-Host "Second Sight Installer" -ForegroundColor Cyan
Write-Host "This sets up the folder structure for a new Second Sight vault." -ForegroundColor Gray
Write-Host ""

$vaultPath = Read-Host "Enter the path to your Obsidian vault"

if ([string]::IsNullOrWhiteSpace($vaultPath)) {
    Write-Host "No path entered. Exiting." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path -LiteralPath $vaultPath -PathType Container)) {
    Write-Host "Error: '$vaultPath' does not exist or is not a folder." -ForegroundColor Red
    exit 1
}

$vaultPath = (Resolve-Path -LiteralPath $vaultPath).Path

# --- Safety check: does a Second Sight setup already exist here? ---
$notesFolder = Join-Path $vaultPath "Notes"
$instructionsFile = Join-Path $vaultPath "SCHEDULING\note-processing-instructions.md"
$legacyInstructionsFile = Join-Path $vaultPath "SCHEDULING\katman-c-prompt.txt"

$alreadyExists = (Test-Path -LiteralPath $notesFolder) `
    -or (Test-Path -LiteralPath $instructionsFile) `
    -or (Test-Path -LiteralPath $legacyInstructionsFile)

if ($alreadyExists) {
    Write-Host ""
    Write-Host "It looks like a Second Sight setup already exists in this folder." -ForegroundColor Yellow
    $confirm = Read-Host "Overwrite? (y/n)"
    if ($confirm -ne "y") {
        Write-Host "Setup cancelled. Nothing was changed." -ForegroundColor Yellow
        exit 0
    }
    Write-Host ""
}

Write-Host "Setting up Second Sight in: $vaultPath" -ForegroundColor Cyan
Write-Host ""

# --- 1. Folders ---
$folders = @("Notes", "Weekly-Summaries", "Reminders", "_staging", "_index", "SCHEDULING")
foreach ($folder in $folders) {
    $path = Join-Path $vaultPath $folder
    if (-not (Test-Path -LiteralPath $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Done "Created $folder/ folder"
    } else {
        Write-Step "$folder/ already exists, skipping"
    }
}

# --- 2. Empty index files ---
$topicsPath = Join-Path $vaultPath "_index\topics.json"
Set-Content -LiteralPath $topicsPath -Value "{}`n" -Encoding utf8 -NoNewline
Write-Done "Created _index/topics.json"

$categoriesPath = Join-Path $vaultPath "_index\categories.json"
$categoriesContent = @'
{
  "categories": []
}
'@
Set-Content -LiteralPath $categoriesPath -Value $categoriesContent -Encoding utf8
Write-Done "Created _index/categories.json"

$tagsPath = Join-Path $vaultPath "_index\tags.json"
Set-Content -LiteralPath $tagsPath -Value "{}`n" -Encoding utf8 -NoNewline
Write-Done "Created _index/tags.json"

# --- 3. Manifest ---
$manifestPath = Join-Path $vaultPath "_manifest.json"
Set-Content -LiteralPath $manifestPath -Value "{}`n" -Encoding utf8 -NoNewline
Write-Done "Created _manifest.json"

# --- 4. Dashboard (copied from template next to this script) ---
$scriptDir = $PSScriptRoot
$homeTemplateSrc = Join-Path $scriptDir "templates\Home.md"
$homeTemplateDst = Join-Path $vaultPath "Reminders\Home.md"
if (Test-Path -LiteralPath $homeTemplateSrc) {
    Copy-Item -LiteralPath $homeTemplateSrc -Destination $homeTemplateDst -Force
    Write-Done "Created Reminders/Home.md (dashboard)"
} else {
    Write-Host "Warning: templates\Home.md not found next to install.ps1 - skipped Reminders/Home.md" -ForegroundColor Yellow
}

# --- 5. Note-processing instructions (copied from template next to this script) ---
$instructionsSrc = Join-Path $scriptDir "templates\note-processing-instructions.md"
$instructionsDst = Join-Path $vaultPath "SCHEDULING\note-processing-instructions.md"
if (Test-Path -LiteralPath $instructionsSrc) {
    Copy-Item -LiteralPath $instructionsSrc -Destination $instructionsDst -Force
    Write-Done "Created SCHEDULING/note-processing-instructions.md"
} else {
    Write-Host "Warning: templates\note-processing-instructions.md not found next to install.ps1 - skipped" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Cyan
Write-Host "Next: open SETUP-GUIDE.md for how to connect this to Claude and (optionally) publish a web view." -ForegroundColor Gray
Write-Host ""
