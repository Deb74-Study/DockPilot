#!/usr/bin/env zsh
set -euo pipefail
set +o histexpand

ROOT='/Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject'
cd "$ROOT"

URL=$(grep -E "^export const SUPABASE_URL" supabaseClient.js | sed -E "s/.*'([^']+)'.*/\1/")
SERVICE_JWT=$(supabase projects api-keys --project-ref radrajwlerdxpuzeoqtq | awk '/^[[:space:]]*service_role[[:space:]]*\|/{print $NF}')
ANON=$(grep -E "^export const SUPABASE_ANON_KEY" supabaseClient.js | sed -E "s/.*'([^']+)'.*/\1/")

NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EXP=$(node -e "const d=new Date();d.setDate(d.getDate()+21);console.log(d.toISOString().slice(0,10));")

# 1) Ensure deterministic baseline for credentials.
curl -sS -X DELETE "$URL/rest/v1/credentials?login_name=not.is.null" \
  -H "apikey: $SERVICE_JWT" \
  -H "Authorization: Bearer $SERVICE_JWT" \
  -H "Prefer: return=representation,count=exact" \
  -D /tmp/p8_delete_headers.txt \
  -o /tmp/p8_delete_rows.json >/dev/null

# 2) Register/upsert two companies via manage-companies function.
call_manage() {
  local payload="$1"
  curl -sS "$URL/functions/v1/dockpilot-admin-manage-companies" \
    -H "apikey: $SERVICE_JWT" \
    -H "Authorization: Bearer $SERVICE_JWT" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

call_manage '{"action":"register","name":"Phase8 Alpha Co","contact_admin_email":"alpha.admin@dockpilot.local","contact_name":"Alpha Admin","contact_address":"Alpha Lane","registration_no":"P8-A-001","phone":"+91-8100000001","tba1":"phase8","tba2":"alpha"}' > /tmp/p8_register_alpha.json
call_manage '{"action":"register","name":"Phase8 Beta Co","contact_admin_email":"beta.admin@dockpilot.local","contact_name":"Beta Admin","contact_address":"Beta Street","registration_no":"P8-B-001","phone":"+91-8100000002","tba1":"phase8","tba2":"beta"}' > /tmp/p8_register_beta.json
call_manage '{"action":"list"}' > /tmp/p8_companies_list.json

C_ALPHA=$(node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('/tmp/p8_companies_list.json','utf8'));const arr=j.companies||[];const c=arr.find(x=>x.name==='Phase8 Alpha Co');if(!c)process.exit(2);console.log(c.id)")
C_BETA=$(node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('/tmp/p8_companies_list.json','utf8'));const arr=j.companies||[];const c=arr.find(x=>x.name==='Phase8 Beta Co');if(!c)process.exit(2);console.log(c.id)")

# 3) Issue same login name in both companies (must both succeed).
issue_fn() {
  local payload="$1"
  curl -sS "$URL/functions/v1/dockpilot-admin-issue-credential" \
    -H "apikey: $SERVICE_JWT" \
    -H "Authorization: Bearer $SERVICE_JWT" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

issue_fn "{\"company_id\":\"$C_ALPHA\",\"login_name\":\"phase8.user\",\"full_name\":\"Phase8 Alpha User\",\"email\":\"alpha.user@dockpilot.local\",\"role\":\"Company Admin\",\"temp_password\":\"Alpha#1234\",\"expiry\":\"$EXP\",\"access_groups\":[\"Admin Files\"],\"must_change_password\":true,\"password_updated_at\":null,\"created_at\":\"$NOW\"}" > /tmp/p8_issue_alpha.json
issue_fn "{\"company_id\":\"$C_BETA\",\"login_name\":\"phase8.user\",\"full_name\":\"Phase8 Beta User\",\"email\":\"beta.user@dockpilot.local\",\"role\":\"Company Admin\",\"temp_password\":\"Beta#5678\",\"expiry\":\"$EXP\",\"access_groups\":[\"Admin Files\"],\"must_change_password\":true,\"password_updated_at\":null,\"created_at\":\"$NOW\"}" > /tmp/p8_issue_beta.json

# 4) List credentials per company.
list_fn() {
  local payload="$1"
  curl -sS "$URL/functions/v1/dockpilot-admin-list-credentials" \
    -H "apikey: $SERVICE_JWT" \
    -H "Authorization: Bearer $SERVICE_JWT" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

list_fn "{\"company_id\":\"$C_ALPHA\"}" > /tmp/p8_list_alpha.json
list_fn "{\"company_id\":\"$C_BETA\"}" > /tmp/p8_list_beta.json

# 5) Extend + reset on alpha only.
curl -sS "$URL/functions/v1/dockpilot-admin-extend-credential" \
  -H "apikey: $SERVICE_JWT" \
  -H "Authorization: Bearer $SERVICE_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"company_id\":\"$C_ALPHA\",\"loginName\":\"phase8.user\",\"newExpiry\":\"$EXP\"}" > /tmp/p8_extend_alpha.json

curl -sS "$URL/functions/v1/dockpilot-admin-reset-password" \
  -H "apikey: $SERVICE_JWT" \
  -H "Authorization: Bearer $SERVICE_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"company_id\":\"$C_ALPHA\",\"loginName\":\"phase8.user\",\"newPassword\":\"Alpha#7777\"}" > /tmp/p8_reset_alpha.json

# 6) Login checks.
login_fn() {
  local payload="$1"
  curl -sS "$URL/functions/v1/dockpilot-login" \
    -H "apikey: $ANON" \
    -H "Authorization: Bearer $ANON" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

login_fn "{\"company_id\":\"$C_ALPHA\",\"loginName\":\"phase8.user\",\"password\":\"Alpha#7777\"}" > /tmp/p8_login_alpha_new.json
login_fn "{\"company_id\":\"$C_BETA\",\"loginName\":\"phase8.user\",\"password\":\"Beta#5678\"}" > /tmp/p8_login_beta_old.json
curl -sS -o /tmp/p8_login_cross.json -w "%{http_code}" "$URL/functions/v1/dockpilot-login" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d "{\"company_id\":\"$C_ALPHA\",\"loginName\":\"phase8.user\",\"password\":\"Beta#5678\"}" > /tmp/p8_login_cross_code.txt

# 7) Validate-session mismatch and success.
TOK_ALPHA=$(node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('/tmp/p8_login_alpha_new.json','utf8'));if(!j.ok)process.exit(2);console.log(j.session.session_token)")

curl -sS -o /tmp/p8_validate_alpha_ok.json -w "%{http_code}" "$URL/functions/v1/dockpilot-validate-session" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d "{\"company_id\":\"$C_ALPHA\",\"loginName\":\"phase8.user\",\"sessionToken\":\"$TOK_ALPHA\"}" > /tmp/p8_validate_alpha_ok_code.txt

curl -sS -o /tmp/p8_validate_wrong_company.json -w "%{http_code}" "$URL/functions/v1/dockpilot-validate-session" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d "{\"company_id\":\"$C_BETA\",\"loginName\":\"phase8.user\",\"sessionToken\":\"$TOK_ALPHA\"}" > /tmp/p8_validate_wrong_company_code.txt

# 8) Change password for beta and verify alpha unaffected.
curl -sS "$URL/functions/v1/dockpilot-change-password" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d "{\"company_id\":\"$C_BETA\",\"loginName\":\"phase8.user\",\"currentPassword\":\"Beta#5678\",\"newPassword\":\"Beta#9999\"}" > /tmp/p8_change_beta.json

curl -sS -o /tmp/p8_login_alpha_still.json -w "%{http_code}" "$URL/functions/v1/dockpilot-login" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d "{\"company_id\":\"$C_ALPHA\",\"loginName\":\"phase8.user\",\"password\":\"Alpha#7777\"}" > /tmp/p8_login_alpha_still_code.txt

curl -sS -o /tmp/p8_login_beta_old_fail.json -w "%{http_code}" "$URL/functions/v1/dockpilot-login" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d "{\"company_id\":\"$C_BETA\",\"loginName\":\"phase8.user\",\"password\":\"Beta#5678\"}" > /tmp/p8_login_beta_old_fail_code.txt

curl -sS -o /tmp/p8_login_beta_new_ok.json -w "%{http_code}" "$URL/functions/v1/dockpilot-login" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d "{\"company_id\":\"$C_BETA\",\"loginName\":\"phase8.user\",\"password\":\"Beta#9999\"}" > /tmp/p8_login_beta_new_ok_code.txt

# 9) Print compact summary.
node -e "const fs=require('fs');const j=p=>JSON.parse(fs.readFileSync(p,'utf8'));const code=p=>fs.readFileSync(p,'utf8').trim();const alpha=(j('/tmp/p8_list_alpha.json').accounts||[]).length;const beta=(j('/tmp/p8_list_beta.json').accounts||[]).length;console.log('alpha_company_id='+process.argv[1]);console.log('beta_company_id='+process.argv[2]);console.log('companies_list_ok='+String(j('/tmp/p8_companies_list.json').ok===true));console.log('issue_alpha_ok='+String(j('/tmp/p8_issue_alpha.json').ok===true));console.log('issue_beta_ok='+String(j('/tmp/p8_issue_beta.json').ok===true));console.log('list_alpha_accounts='+alpha);console.log('list_beta_accounts='+beta);console.log('extend_alpha_ok='+String(j('/tmp/p8_extend_alpha.json').ok===true));console.log('reset_alpha_ok='+String(j('/tmp/p8_reset_alpha.json').ok===true));console.log('login_alpha_new_ok='+String(j('/tmp/p8_login_alpha_new.json').ok===true));console.log('login_beta_old_ok='+String(j('/tmp/p8_login_beta_old.json').ok===true));console.log('login_cross_code='+code('/tmp/p8_login_cross_code.txt'));console.log('validate_alpha_ok_code='+code('/tmp/p8_validate_alpha_ok_code.txt'));console.log('validate_wrong_company_code='+code('/tmp/p8_validate_wrong_company_code.txt'));console.log('change_beta_ok='+String(j('/tmp/p8_change_beta.json').ok===true));console.log('login_alpha_still_code='+code('/tmp/p8_login_alpha_still_code.txt'));console.log('login_beta_old_fail_code='+code('/tmp/p8_login_beta_old_fail_code.txt'));console.log('login_beta_new_ok_code='+code('/tmp/p8_login_beta_new_ok_code.txt'));" "$C_ALPHA" "$C_BETA"
