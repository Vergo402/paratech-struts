#!/bin/bash
# usage: extract-report.sh <agent-transcript.jsonl> <NN>  — writes <NN>/REPORT.md from the qa-driver's final message
grep 'REPORT-END' "$1" | tail -1 | jq -r '[.. | strings | select(contains("=====REPORT-END====="))] | last' \
  | awk '/=====REPORT-BEGIN=====/{f=1;next}/=====REPORT-END=====/{f=0}f' > "$(dirname "$0")/$2/REPORT.md"
wc -l "$(dirname "$0")/$2/REPORT.md"
