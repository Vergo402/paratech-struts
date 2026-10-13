#!/bin/bash
# usage: snap.sh <label>  -> writes rest/<label>.txt in the evidence folder and echoes it
EVID=/Users/alex/Developer/paratech-struts/fieldshore/.claude/audits/phase-j/step1-fixes/466
NS=fieldshore-database-default-rtdb
DB=http://127.0.0.1:9000
A_DEPT=d90feeda-c313-4c3a-b6f0-d52a206e4921
C_DEPT=5a17b03e-e6aa-4c15-9536-66d7979d29ca
mkdir -p "$EVID/rest"
get() { curl -s -m 5 -H 'Authorization: Bearer owner' "$DB/$1.json?ns=$NS"; }
{
  echo "# snapshot '$1' at $(date -u +%Y-%m-%dT%H:%M:%SZ)  (emulator REST, owner auth, ns=$NS)"
  echo "GET orgs/$A_DEPT/members            (dept A, QA Dept 466 A)"; get "orgs/$A_DEPT/members"; echo
  echo "GET orgs/$C_DEPT/members            (dept C, QA Dept 466 C = decoy)"; get "orgs/$C_DEPT/members"; echo
  echo "GET userDepts/YR8RtoG5xHXRxip1PFtjmlYXuhjj  (A)"; get "userDepts/YR8RtoG5xHXRxip1PFtjmlYXuhjj"; echo
  echo "GET userDepts/0epa2KmMkSZ80rFG8kIjd8xWtMor  (B)"; get "userDepts/0epa2KmMkSZ80rFG8kIjd8xWtMor"; echo
  echo "GET userDepts/74PXgMFQ8GrYEMtwZN3O94aRoKxe  (C)"; get "userDepts/74PXgMFQ8GrYEMtwZN3O94aRoKxe"; echo
} | tee "$EVID/rest/$1.txt"
