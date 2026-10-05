# Server Setup (Linux)

Daily ingest on the home server. Runs 6am ET: refreshes players, ingests last ~4 days of final games, rolls weeks over.

## 1. Get the code
```
git clone https://github.com/skyhoffert/skyhoffert.github.io.git
cd skyhoffert.github.io/blog/three-stars/worker
```
Already cloned? `git pull` instead.

## 2. Python venv
```
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## 3. Secrets
Create `worker/.env` (same contents as on your Windows machine, never committed):
```
SUPABASE_URL=https://ctyjgcimmpwlmtsedkbk.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

## 4. Test run
```
.venv/bin/python ingest.py
```
Should print players refreshed, games per day, and rollover per league.

## 5. Cron
`crontab -e`, add (replace path with output of `pwd` from the worker folder):
```
CRON_TZ=America/New_York
0 6 * * * cd /home/YOU/skyhoffert.github.io/blog/three-stars/worker && .venv/bin/python ingest.py >> ingest.log 2>&1
```
Check it next morning: `tail -50 ingest.log`


## Updating later
```
cd skyhoffert.github.io && git pull
cd blog/three-stars/worker && .venv/bin/pip install -r requirements.txt
```

## Windows fallback (Task Scheduler)
Only if the Linux server is down. Run in PowerShell from the `worker` folder; the time is your PC's local time, so set it to 6am ET equivalent:
```
schtasks /Create /TN "ThreeStarsIngest" /SC DAILY /ST 06:00 /TR "cmd /c cd /d %CD% && .venv\Scripts\python.exe ingest.py >> ingest.log 2>&1"
```
