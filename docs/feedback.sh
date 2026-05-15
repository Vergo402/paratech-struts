#!/bin/bash
# Pull feedback & bug reports from Firebase
# Usage: ./feedback.sh         (all feedback)
#        ./feedback.sh bugs    (bugs only)
#        ./feedback.sh features (features only)

DB_URL="https://paratech-c3ab4-default-rtdb.firebaseio.com/feedback.json"
FILTER="${1:-all}"

curl -s "$DB_URL" | python3 -c "
import json, sys
from datetime import datetime

data = json.load(sys.stdin)
if not data:
    print('No feedback found.')
    sys.exit()

items = []
for key, val in data.items():
    val['_id'] = key
    items.append(val)

items.sort(key=lambda x: x.get('timestamp', 0), reverse=True)

filter_type = '$FILTER'
if filter_type == 'bugs':
    items = [i for i in items if i.get('category') == 'bug']
elif filter_type == 'features':
    items = [i for i in items if i.get('category') == 'feature']

if not items:
    print(f'No {filter_type} found.')
    sys.exit()

print(f'\\n  {len(items)} feedback item(s)\\n')
print('-' * 60)

for item in items:
    ts = item.get('timestamp', 0)
    date = datetime.fromtimestamp(ts / 1000).strftime('%Y-%m-%d %H:%M') if ts else 'unknown'
    cat = item.get('category', '?').upper()
    ver = item.get('appVersion', '?')
    dept = item.get('deptId', '?')
    text = item.get('text', '')
    emoji = '🐛' if cat == 'BUG' else '💡' if cat == 'FEATURE' else '📝'

    print(f'  {emoji} [{cat}]  v{ver}  |  {date}  |  dept: {dept}')
    print(f'     {text}')
    print('-' * 60)
"
