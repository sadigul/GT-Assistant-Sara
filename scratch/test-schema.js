const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const tables = ['dealer_groups', 'departments', 'suppliers', 'crm_activities', 'pricing_rules', 'audit_logs', 'invoice_lines', 'purchase_order_lines', 'shipment_lines'];
  for (const t of tables) {
    const { data, error } = await sb.from(t).select('*').limit(1);
    if (error) console.log(t, 'ERROR:', error.message);
    else console.log(t, 'COLS:', data && data[0] ? Object.keys(data[0]) : 'empty table');
  }
}
check();
