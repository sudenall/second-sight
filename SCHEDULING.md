# Scheduling Instructions

This document only gives instructions — no task was automatically added
to Windows Task Scheduler during this repo's setup. Apply the steps
below whenever you're ready to.

Since the number of pinned chats won't change much day to day, running
the whole scan (Layers A-C) **weekly** is recommended.

## 1. Layers A/B (Claude Cowork) — can't be automated, set a weekly reminder instead

Because the step that scans pinned chats on claude.ai via Claude Cowork
requires an interactive AI session (browser + account login), it can't
be fully automated at the operating-system level. Instead:

- Set up a reminder in Windows: use **Settings → Time & Language →
  Alarms & Clock**, or create a weekly recurring reminder in
  Outlook/Google Calendar ("Second Sight: scan pinned chats").
- Once you complete this step, Cowork will write the differences to
  `_staging/`.

## 2. Layer C (Claude Code) — can be automated with Task Scheduler

Once files pile up in `_staging/`, you can automatically trigger Layer C
by running the Claude Code CLI in headless mode:

1. Open **Task Scheduler** (Win+R → `taskschd.msc`).
2. From the right-hand panel, choose **Create Basic Task...**.
3. Name: `Second Sight - Layer C`.
4. Trigger: **Weekly**, on whichever day/time you prefer (e.g. Monday
   09:00).
5. Action: **Start a program**.
6. Program/script: `claude` (or the full path to `claude.exe`, which you
   can find with `where claude`).
7. Arguments: open the contents of `SCHEDULING\katman-c-prompt.txt`, copy
   it, and paste it inside `-p "..."` (don't forget to escape the quote
   characters). This file is the single source of truth for the prompt —
   if you want to change it, update only that file; the instruction here
   always stays the same.
8. Start in: `D:\Vaults For Obsidian\second-brain-for-sude`
9. Save.

> Note: `-p` (print/headless mode) runs Claude Code without an
> interactive session. We recommend triggering the first few runs
> manually and checking the output before wiring it up to run fully
> unattended.

## 3. Git sync — can be automated with Task Scheduler

A second step (or a second action on the same task) can be added right
after the Layer C task to run `sync.ps1`:

- Program/script: `powershell.exe`
- Arguments:
  ```
  -NoProfile -ExecutionPolicy Bypass -File "D:\Vaults For Obsidian\second-brain-for-sude\sync.ps1"
  ```

This way: you only scan chats with Cowork once a week, and everything
else (categorizing, updating the dashboard, git commit/push) flows
automatically.
