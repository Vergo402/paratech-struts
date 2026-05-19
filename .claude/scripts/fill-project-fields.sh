#!/usr/bin/env bash
# Fill Severity + Component on every Project item via heuristics.
# Best-effort for historical shipped items — manual override expected for any miss.
set -euo pipefail

OWNER="Vergo402"
PROJECT_NUM=1
PROJECT_ID="PVT_kwHODy7CN84BYNd6"
F_SEVERITY_ID="PVTSSF_lAHODy7CN84BYNd6zhTU5G8"
F_COMPONENT_ID="PVTSSF_lAHODy7CN84BYNd6zhTU5IU"

severity_opt_id() {
  case "$1" in
    Critical) echo "$(gh project field-list 1 --owner $OWNER --format json | jq -r '.fields[] | select(.name=="Severity") | .options[] | select(.name=="Critical") | .id')" ;;
    High) echo "$(gh project field-list 1 --owner $OWNER --format json | jq -r '.fields[] | select(.name=="Severity") | .options[] | select(.name=="High") | .id')" ;;
    Medium) echo "$(gh project field-list 1 --owner $OWNER --format json | jq -r '.fields[] | select(.name=="Severity") | .options[] | select(.name=="Medium") | .id')" ;;
    Low) echo "$(gh project field-list 1 --owner $OWNER --format json | jq -r '.fields[] | select(.name=="Severity") | .options[] | select(.name=="Low") | .id')" ;;
  esac
}

# Cache option IDs once
SEV_CRIT=$(gh project field-list 1 --owner $OWNER --format json | jq -r '.fields[] | select(.name=="Severity") | .options[] | select(.name=="Critical") | .id')
SEV_HIGH=$(gh project field-list 1 --owner $OWNER --format json | jq -r '.fields[] | select(.name=="Severity") | .options[] | select(.name=="High") | .id')
SEV_MED=$(gh project field-list 1 --owner $OWNER --format json | jq -r '.fields[] | select(.name=="Severity") | .options[] | select(.name=="Medium") | .id')
SEV_LOW=$(gh project field-list 1 --owner $OWNER --format json | jq -r '.fields[] | select(.name=="Severity") | .options[] | select(.name=="Low") | .id')

COMP_JSON=$(gh project field-list 1 --owner $OWNER --format json | jq -r '.fields[] | select(.name=="Component") | .options')
COMP_SYNC=$(echo "$COMP_JSON" | jq -r '.[] | select(.name=="sync") | .id')
COMP_INV=$(echo "$COMP_JSON" | jq -r '.[] | select(.name=="inventory") | .id')
COMP_ICS=$(echo "$COMP_JSON" | jq -r '.[] | select(.name=="ICS") | .id')
COMP_UI=$(echo "$COMP_JSON" | jq -r '.[] | select(.name=="UI") | .id')
COMP_DOC=$(echo "$COMP_JSON" | jq -r '.[] | select(.name=="doctrine") | .id')
COMP_INFRA=$(echo "$COMP_JSON" | jq -r '.[] | select(.name=="infra") | .id')
COMP_DOCS=$(echo "$COMP_JSON" | jq -r '.[] | select(.name=="docs") | .id')
COMP_STRUT=$(echo "$COMP_JSON" | jq -r '.[] | select(.name=="strut-algorithm") | .id')

# Severity heuristic: title keywords + audit label
infer_severity() {
  local title_lower; title_lower=$(echo "$1" | tr '[:upper:]' '[:lower:]')
  local labels="$2"
  # Critical: XSS, data loss, wrong strut, security
  if echo "$title_lower" | grep -qE "xss|data loss|wrong strut|critical|permission_denied|safety-critical"; then
    echo Critical; return
  fi
  # High: audit label, race, listener leak, sync failure, transaction
  if echo "$labels" | jq -e '.[] | select(.name == "audit")' >/dev/null 2>&1; then
    echo High; return
  fi
  if echo "$title_lower" | grep -qE "race|leak|silent|transaction|sync|offline|firebase"; then
    echo High; return
  fi
  # Low: cosmetic, sort, label, polish, manual link
  if echo "$title_lower" | grep -qE "sort|label|cosmetic|polish|color|contrast|manual link|wording"; then
    echo Low; return
  fi
  echo Medium
}

# Component heuristic: title keywords
infer_component() {
  local title_lower; title_lower=$(echo "$1" | tr '[:upper:]' '[:lower:]')
  if echo "$title_lower" | grep -qE "sync|transaction|offline|firebase|listener|backup|resync|service worker|cache"; then
    echo "$COMP_SYNC"; return
  fi
  if echo "$title_lower" | grep -qE "inventory|excel|import|export|deploy|return|external equipment|apparatus"; then
    echo "$COMP_INV"; return
  fi
  if echo "$title_lower" | grep -qE "strut|load table|acme|longshore|deduction|wood|plate|extension"; then
    echo "$COMP_STRUT"; return
  fi
  if echo "$title_lower" | grep -qE "ics|nims|role|org chart|smartart|command|operations |hierarchy|safety officer|incident"; then
    echo "$COMP_ICS"; return
  fi
  if echo "$title_lower" | grep -qE "doctrine|terminology|group|assignedresource"; then
    echo "$COMP_DOC"; return
  fi
  if echo "$title_lower" | grep -qE "modal|button|nav|drilldown|legend|tab|view|desktop|mobile|css|color|contrast|touch|scroll|drag"; then
    echo "$COMP_UI"; return
  fi
  if echo "$title_lower" | grep -qE "manual|docs|readme|changelog"; then
    echo "$COMP_DOCS"; return
  fi
  if echo "$title_lower" | grep -qE "rules|security|auth|deploy|version|infra|github|pages"; then
    echo "$COMP_INFRA"; return
  fi
  echo "$COMP_UI"  # default catch-all: most issues are UI
}

ITEMS=$(gh project item-list 1 --owner $OWNER --format json --limit 200)
TOTAL=$(echo "$ITEMS" | jq '.items | length')
echo "Processing $TOTAL items..."

i=0
echo "$ITEMS" | jq -c '.items[]' | while read -r row; do
  i=$((i+1))
  item_id=$(echo "$row" | jq -r '.id')
  number=$(echo "$row" | jq -r '.content.number // empty')
  title=$(echo "$row" | jq -r '.content.title // .title // ""')

  if [[ -z "$number" ]]; then
    echo "[$i/$TOTAL] (no issue) skip"
    continue
  fi

  labels=$(gh issue view "$number" --repo Vergo402/paratech-struts --json labels 2>/dev/null | jq '.labels' || echo '[]')

  sev_name=$(infer_severity "$title" "$labels")
  case "$sev_name" in
    Critical) sev_opt="$SEV_CRIT" ;;
    High) sev_opt="$SEV_HIGH" ;;
    Medium) sev_opt="$SEV_MED" ;;
    Low) sev_opt="$SEV_LOW" ;;
  esac
  comp_opt=$(infer_component "$title")
  comp_name=$(echo "$COMP_JSON" | jq -r --arg id "$comp_opt" '.[] | select(.id==$id) | .name')

  gh project item-edit --id "$item_id" --project-id "$PROJECT_ID" --field-id "$F_SEVERITY_ID" --single-select-option-id "$sev_opt" >/dev/null
  gh project item-edit --id "$item_id" --project-id "$PROJECT_ID" --field-id "$F_COMPONENT_ID" --single-select-option-id "$comp_opt" >/dev/null

  echo "[$i/$TOTAL] #$number Sev=$sev_name Comp=$comp_name — $title"
done
echo "Done."
