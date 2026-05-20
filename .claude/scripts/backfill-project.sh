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
  # IDs regenerated 2026-05-20 after the Release options list was inadvertently
  # replaced via updateProjectV2Field (the mutation replaces, doesn't append).
  # If options are recreated again, regenerate these via:
  #   gh project field-list 1 --owner Vergo402 --format json | jq '.fields[] | select(.name=="Release")'
  case "$1" in
    Backlog) echo 9042c5c9 ;;
    v5.0.0) echo 2f3938fc ;;
    v4.0.0) echo 29df24c4 ;;
    v3.18.1) echo 7b8713d3 ;;
    v3.18.0) echo d39a6235 ;;
    v3.17.4) echo f50045aa ;;
    v3.17.3) echo 416e62ae ;;
    v3.17.2) echo 97c84b14 ;;
    v3.17.1) echo d9d91526 ;;
    v3.17.0) echo 210788ac ;;
    v3.16.4) echo b81fff06 ;;
    v3.16.3) echo 555eab3d ;;
    v3.16.2) echo 1cb29c75 ;;
    v3.16.1) echo b400fee1 ;;
    v3.16.0) echo e4d0da2f ;;
    v3.15.0) echo a4e0d01e ;;
    v3.14.3) echo aacae658 ;;
    v3.12.0) echo 2809e6c8 ;;
    v3.11.3) echo 52646f7e ;;
    v3.11.2) echo 7b311a76 ;;
    v3.11.1) echo a5781c85 ;;
    v3.10.1) echo bb5b3c02 ;;
    v3.10.0) echo e7a5e14a ;;
    v3.9.2) echo e5d7a42d ;;
    v3.9.1) echo 6851d9a5 ;;
    v3.9.0) echo f37f79bf ;;
    v3.8.3) echo 66d9ddd0 ;;
    v3.8.2) echo 0faa1b90 ;;
    v3.8.1) echo 6792994d ;;
    v3.8.0) echo b67a6191 ;;
    v3.7.5) echo 1b2f49a1 ;;
    v3.7.4) echo 8ead5fb4 ;;
    v3.7.3) echo f560e012 ;;
    v3.7.2) echo c12c50d2 ;;
    v3.7.0) echo 17b2fbbd ;;
    v3.6.0) echo e6262eaa ;;
    v3.5.3) echo 54467486 ;;
    v3.5.2) echo 64e27a98 ;;
    v3.5.1) echo 7861326c ;;
    v3.5.0) echo 1a902637 ;;
    pre-v3.5.0) echo c50a4a19 ;;
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
