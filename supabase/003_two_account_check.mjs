// Run only with two dedicated, confirmed test accounts. Never use a service-role key.
// This creates a temporary project and calculation and attempts to delete them afterward.
const required = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'YB_TEST_EMAIL_A', 'YB_TEST_PASSWORD_A', 'YB_TEST_EMAIL_B', 'YB_TEST_PASSWORD_B'];
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);
const base = new URL(process.env.SUPABASE_URL);
if (base.protocol !== 'https:' || base.hostname !== 'cekxtxncdourlengbkzy.supabase.co') throw new Error('Unexpected project URL');
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!key.startsWith('sb_publishable_')) throw new Error('Use a publishable key only');
const headers = token => ({ apikey: key, Authorization: `Bearer ${token || key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' });
async function request(path, options = {}) {
  const response = await fetch(new URL(path, base), options);
  let data; try { data = await response.json(); } catch { data = null; }
  return { status: response.status, ok: response.ok, data };
}
async function login(suffix) {
  const result = await request('/auth/v1/token?grant_type=password', { method:'POST', headers:headers(), body:JSON.stringify({ email:process.env[`YB_TEST_EMAIL_${suffix}`], password:process.env[`YB_TEST_PASSWORD_${suffix}`] }) });
  if (!result.ok || !result.data?.access_token || !result.data?.user?.id) throw new Error(`Test account ${suffix} could not sign in`);
  return { token: result.data.access_token, id: result.data.user.id };
}
function check(condition, label) { if (!condition) throw new Error(label); console.log(`PASS ${label}`); }
const a = await login('A'), b = await login('B');
check(a.id !== b.id, 'two distinct accounts');
const table = '/rest/v1/yb_projects';
const calculationTable = '/rest/v1/yb_calculations';
let projectId;
try {
  const created = await request(table, { method:'POST', headers:headers(a.token), body:JSON.stringify({name:'YB temporary security test ' + crypto.randomUUID()}) });
  check(created.ok && created.data?.length === 1, 'owner creates temporary project');
  projectId = created.data[0].id;
  const filter = `?id=eq.${encodeURIComponent(projectId)}&select=id`;
  const calculation = await request(calculationTable, { method:'POST', headers:headers(a.token), body:JSON.stringify({project_id:projectId,tool_name:'test',title:'test',inputs:{},outputs:{}}) });
  check(calculation.ok && calculation.data?.length === 1, 'owner saves calculation');
  const ownerRead = await request(table + filter, {headers:headers(a.token)});
  check(ownerRead.ok && ownerRead.data?.length === 1, 'owner can read project');
  const otherRead = await request(table + filter, {headers:headers(b.token)});
  check(otherRead.ok && Array.isArray(otherRead.data) && otherRead.data.length === 0, 'other account cannot read project');
  const calcRead = await request(`${calculationTable}?project_id=eq.${encodeURIComponent(projectId)}&select=id`, {headers:headers(b.token)});
  check(calcRead.ok && Array.isArray(calcRead.data) && calcRead.data.length === 0, 'other account cannot read calculation');
  const otherUpdate = await request(table + filter, {method:'PATCH',headers:headers(b.token),body:JSON.stringify({name:'unauthorized'})});
  check(otherUpdate.ok && Array.isArray(otherUpdate.data) && otherUpdate.data.length === 0, 'other account cannot update project');
  const otherDelete = await request(table + filter, {method:'DELETE',headers:headers(b.token)});
  check(otherDelete.ok && Array.isArray(otherDelete.data) && otherDelete.data.length === 0, 'other account cannot delete project');
  const forged = await request(calculationTable, {method:'POST',headers:headers(b.token),body:JSON.stringify({project_id:projectId,owner_id:a.id,tool_name:'test',title:'test',inputs:{},outputs:{}})});
  check(!forged.ok && (forged.status === 401 || forged.status === 403 || forged.status === 409), 'forged calculation rejected');
  const attached = await request(calculationTable, {method:'POST',headers:headers(b.token),body:JSON.stringify({project_id:projectId,tool_name:'test',title:'test',inputs:{},outputs:{}})});
  check(!attached.ok && (attached.status === 401 || attached.status === 403 || attached.status === 409), 'other account cannot attach calculation to project');
  const anonymous = await request(table + filter, {headers:headers()});
  check((!anonymous.ok && (anonymous.status === 401 || anonymous.status === 403)) || (anonymous.ok && Array.isArray(anonymous.data) && anonymous.data.length === 0), 'anonymous cannot read project');
} finally {
  if (projectId) {
    const cleanup = await request(`${table}?id=eq.${encodeURIComponent(projectId)}&select=id`, {method:'DELETE',headers:headers(a.token)});
    if (!cleanup.ok || cleanup.data?.length !== 1) { console.error(`CLEANUP FAILED: manually remove temporary project ${projectId} from test account A`); process.exitCode = 1; }
    else console.log('PASS temporary project removed');
  }
}
