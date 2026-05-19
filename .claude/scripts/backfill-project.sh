#!/usr/bin/env bash
# Backfill all GitHub issues into the FieldShore Roadmap project (#1).
# Compatible with macOS bash 3 (no associative arrays).
set -euo pipefail

REPO="Vergo402/paratech-struts"
OWNER="Vergo402"
PROJECT_NUM=1
PROJECT_ID="PVT_kwHODy7CN84BYNd6"
F_RELEASE_ID="PVTSSF_lAHODy7CN84BYNd6zhTU5j0"
F_SOURCE_ID="PVTSSF_lAHODy7CN84BYNd6zhTU5G0"

release_opt_id() {
  case "$1" in
    Backlog) echo db9f03f8 ;;
    v5.0.0) echo a9645c1d ;;
    v4.0.0) echo 731c786c ;;
    v3.17.0) echo 3448be54 ;;
    v3.16.4) echo 11d19137 ;;
    v3.16.3) echo 80509a6b ;;
    v3.16.2) echo 2232a149 ;;
    v3.16.1) echo ee87949c ;;
    v3.16.0) echo 5f761a90 ;;
    v3.15.0) echo 353e27cc ;;
    v3.14.3) echo 122fbc2a ;;
    v3.12.0) echo d3ef7bdd ;;
    v3.11.3) echo d0244f02 ;;
    v3.11.2) echo d528c780 ;;
    v3.11.1) echo b640d9a6 ;;
    v3.10.1) echo 8c63f9a9 ;;
    v3.10.0) echo 128ae59d ;;
    v3.9.2) echo dacffbf4 ;;
    v3.9.1) echo cbe51fc8 ;;
    v3.9.0) echo 32c447aa ;;
    v3.8.3) echo ee9d04b5 ;;
    v3.8.2) echo 9323c951 ;;
    v3.8.1) echo e1ba85e6 ;;
    v3.8.0) echo b9c7a086 ;;
    v3.7.5) echo 30893182 ;;
    v3.7.4) echo 8bd4e926 ;;
    v3.7.3) echo 884a5fd2 ;;
    v3.7.2) echo e1f21964 ;;
    v3.7.0) echo 35c42931 ;;
    v3.6.0) echo 9a050f86 ;;
    v3.5.3) echo 9496862f ;;
    v3.5.2) echo f24ca3c6 ;;
    v3.5.1) echo 78565cb9 ;;
    v3.5.0) echo c066ff45 ;;
    pre-v3.5.0) echo 4d481215 ;;
    *) echo "" ;;
  esac
}

source_opt_id() {
  case "$1" in
    audit) echo 90715db5 ;;
    feedback) echo a3d8760a ;;
    manual) echo af495887 ;;
    post-mortem) echo 1fad4bbc ;;
    bug) echo 4dea7cad ;;
    enhancement) echo 4505a9e8 ;;
    *) echo "" ;;
  esac
}

TAG_DATA=$(git tag -l 'v*' --sort=committerdate --format='%(committerdate:iso8601-strict)|%(refname:short)')

release_for_closed_at() {
  local closed_at="$1"
  while IFS='|' read -r tag_date tag_name; do
    if [[ "$tag_date" > "$closed_at" || "$tag_date" == "$closed_at" ]]; then
      echo "$tag_name"
      return
    fi
  done <<< "$TAG_DATA"
  echo "$TAG_DATA" | tail -1 | cut -d'|' -f2
}

source_for_labels() {
  local labels_json="$1"
  if echo "$labels_json" | jq -e '.[] | select(.name == "audit")' >/dev/null 2>&1; then
    echo "audit"
  elif echo "$labels_json" | jq -e '.[] | select(.name == "enhancement")' >/dev/null 2>&1; then
    echo "enhancement"
  elif echo "$labels_json" | jq -e '.[] | select(.name == "bug")' >/dev/null 2>&1; then
    echo "bug"
  else
    echo "manual"
  fi
}

process_issue() {
  local number="$1" state="$2" closed_at="$3" labels="$4" url="$5"

  local release_name
  if [[ "$state" == "OPEN" ]]; then
    release_name="Backlog"
  else
    if [[ "$closed_at" < "2026-05-14T17:15:20Z" ]]; then
      release_name="pre-v3.5.0"
    else
      release_name=$(release_for_closed_at "$closed_at")
    fi
  fi

  local source_name
  source_name=$(source_for_labels "$labels")

  local release_opt
  release_opt=$(release_opt_id "$release_name")
  local source_opt
  source_opt=$(source_opt_id "$source_name")

  if [[ -z "$release_opt" ]]; then
    echo "  SKIP #$number — unknown release '$release_name'"
    return
  fi
  if [[ -z "$source_opt" ]]; then
    echo "  SKIP #$number — unknown source '$source_name'"
    return
  fi

  local item_id
  item_id=$(gh project item-add "$PROJECT_NUM" --owner "$OWNER" --url "$url" --format json 2>/dev/null | jq -r '.id')

  if [[ -z "$item_id" || "$item_id" == "null" ]]; then
    echo "  FAIL #$number — could not add to project"
    return
  fi

  gh project item-edit --id "$item_id" --project-id "$PROJECT_ID" --field-id "$F_RELEASE_ID" --single-select-option-id "$release_opt" >/dev/null
  gh project item-edit --id "$item_id" --project-id "$PROJECT_ID" --field-id "$F_SOURCE_ID" --single-select-option-id "$source_opt" >/dev/null

  echo "  OK #$number → Release=$release_name Source=$source_name"
}

echo "=== Backfilling all issues into FieldShore Roadmap (Project #$PROJECT_NUM) ==="

ISSUES=$(gh issue list --repo "$REPO" --state all --limit 500 --json number,state,closedAt,labels,url)
TOTAL=$(echo "$ISSUES" | jq 'length')
echo "Found $TOTAL issues. Processing..."

i=0
echo "$ISSUES" | jq -c '.[]' | while read -r row; do
  i=$((i+1))
  number=$(echo "$row" | jq -r '.number')
  state=$(echo "$row" | jq -r '.state')
  closed_at=$(echo "$row" | jq -r '.closedAt // ""')
  labels=$(echo "$row" | jq -c '.labels')
  url=$(echo "$row" | jq -r '.url')

  echo "[$i/$TOTAL] #$number ($state)"
  process_issue "$number" "$state" "$closed_at" "$labels" "$url"
done

echo "=== Done ==="
