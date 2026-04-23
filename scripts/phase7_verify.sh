#!/usr/bin/env zsh
set -euo pipefail
set +o histexpand

ROOT='/Users/debdeeptochattopadhyay/my-new-supabase-app/supabase/DockingProject'
cd "$ROOT"

URL=$(sed -n 's/^URL=//p' /tmp/p7_env)
ANON=$(sed -n 's/^ANON=//p' /tmp/p7_env)
C1=$(sed -n 's/^C1=//p' /tmp/p7_env)
C2=$(sed -n 's/^C2=//p' /tmp/p7_env)
P1=$(sed -n 's/^P1=//p' /tmp/p7_env)
P2=$(sed -n 's/^P2=//p' /tmp/p7_env)
P1NEW=$(sed -n 's/^P1NEW=//p' /tmp/p7_env)

curl -sS "$URL/functions/v1/dockpilot-login" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d "{\"loginName\":\"tenant.admin\",\"password\":\"$P1\",\"company_id\":\"$C1\"}" > /tmp/p7_login_c1.json

curl -sS "$URL/functions/v1/dockpilot-login" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d "{\"loginName\":\"tenant.admin\",\"password\":\"$P2\",\"company_id\":\"$C2\"}" > /tmp/p7_login_c2.json

curl -sS -o /tmp/p7_login_cross.json -w "%{http_code}" "$URL/functions/v1/dockpilot-login" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d "{\"loginName\":\"tenant.admin\",\"password\":\"$P2\",\"company_id\":\"$C1\"}" > /tmp/p7_login_cross_code.txt

TOKEN1=$(node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('/tmp/p7_login_c1.json','utf8'));if(!j.ok)process.exit(2);console.log(j.session.session_token)")

curl -sS -o /tmp/p7_validate_wrong.json -w "%{http_code}" "$URL/functions/v1/dockpilot-validate-session" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d "{\"loginName\":\"tenant.admin\",\"sessionToken\":\"$TOKEN1\",\"company_id\":\"$C2\"}" > /tmp/p7_validate_wrong_code.txt

curl -sS "$URL/functions/v1/dockpilot-change-password" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d "{\"loginName\":\"tenant.admin\",\"currentPassword\":\"$P1\",\"newPassword\":\"$P1NEW\",\"company_id\":\"$C1\"}" > /tmp/p7_change_c1.json

curl -sS -o /tmp/p7_login_c2_after.json -w "%{http_code}" "$URL/functions/v1/dockpilot-login" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d "{\"loginName\":\"tenant.admin\",\"password\":\"$P2\",\"company_id\":\"$C2\"}" > /tmp/p7_login_c2_after_code.txt

curl -sS -o /tmp/p7_login_c1_old_after.json -w "%{http_code}" "$URL/functions/v1/dockpilot-login" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d "{\"loginName\":\"tenant.admin\",\"password\":\"$P1\",\"company_id\":\"$C1\"}" > /tmp/p7_login_c1_old_after_code.txt

curl -sS -o /tmp/p7_login_c1_new_after.json -w "%{http_code}" "$URL/functions/v1/dockpilot-login" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" \
  -d "{\"loginName\":\"tenant.admin\",\"password\":\"$P1NEW\",\"company_id\":\"$C1\"}" > /tmp/p7_login_c1_new_after_code.txt

node -e "const fs=require('fs');const j=p=>JSON.parse(fs.readFileSync(p,'utf8'));const c=p=>fs.readFileSync(p,'utf8').trim();console.log('login_c1_ok='+String(j('/tmp/p7_login_c1.json').ok===true));console.log('login_c2_ok='+String(j('/tmp/p7_login_c2.json').ok===true));console.log('login_cross_code='+c('/tmp/p7_login_cross_code.txt'));console.log('validate_wrong_company_code='+c('/tmp/p7_validate_wrong_code.txt'));console.log('change_c1_ok='+String(j('/tmp/p7_change_c1.json').ok===true));console.log('login_c2_after_change_code='+c('/tmp/p7_login_c2_after_code.txt'));console.log('login_c1_old_after_change_code='+c('/tmp/p7_login_c1_old_after_code.txt'));console.log('login_c1_new_after_change_code='+c('/tmp/p7_login_c1_new_after_code.txt'));"
