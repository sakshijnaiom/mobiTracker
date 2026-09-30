const navItems = document.querySelectorAll('.nav-item[data-view]');
const dashboard = document.getElementById('dashboardView');
const generic = document.getElementById('genericView');
const titles = {
  assets: ['Mobile assets', 'Manage every device in your fleet.', 'ASSET MANAGEMENT', 'All devices are accounted for', 'Your mobile inventory is ready to review.'],
  sims: ['SIM cards', 'Keep connectivity and ownership in sync.', 'CONNECTIVITY', 'SIM inventory at a glance', 'Every number, network, and status in one place.'],
  recharges: ['Recharge history', 'Track spend and expiry from activation onward.', 'FINANCIALS', 'Your recharge history is clear', 'Recent recharge activity will appear here.'],
  assignments: ['Assignments', 'See who has what, at a glance.', 'OPERATIONS', 'Assignments are up to date', 'New device assignments will appear here.'],
  reports: ['Reports', 'Understand fleet health with a quick snapshot.', 'INSIGHTS', 'Your reports are ready', 'Export a detailed report whenever you need one.']
};

function setView(view) {
  const isDash = view === 'dashboard';
  dashboard.classList.toggle('hidden', !isDash);
  generic.classList.toggle('hidden', isDash);
  document.getElementById('breadcrumbCurrent').textContent = isDash ? 'Dashboard' : titles[view][0];
  if (!isDash) {
    const [title, subtitle, eyebrow, heading, text] = titles[view];
    document.getElementById('genericTitle').textContent = title;
    document.getElementById('genericSubtitle').textContent = subtitle;
    document.getElementById('genericEyebrow').textContent = eyebrow;
    document.getElementById('emptyHeading').textContent = heading;
    document.getElementById('emptyText').textContent = text;
    const actionLabel = view === 'assignments' ? '＋ New assignment' : view === 'sims' ? '＋ Add SIM' : view === 'recharges' ? '＋ Add recharge' : '＋ Add asset';
    document.getElementById('genericAdd').textContent = actionLabel;
    document.getElementById('emptyAction').textContent = actionLabel;
  }
  document.getElementById('assetManagement').classList.toggle('hidden', view !== 'assets');
  document.getElementById('simManagement').classList.toggle('hidden', view !== 'sims');
  document.getElementById('rechargeManagement').classList.toggle('hidden', view !== 'recharges');
  document.getElementById('assignmentManagement').classList.toggle('hidden', view !== 'assignments');
  document.getElementById('genericEmpty').classList.toggle('hidden', ['assets', 'sims', 'recharges', 'assignments'].includes(view));
  navItems.forEach(item => item.classList.toggle('active', item.dataset.view === view));
  document.getElementById('sidebar').classList.remove('open');
  if (view === 'assets') loadAssets();
  if (view === 'sims') loadSims();
  if (view === 'recharges') loadRecharges();
  if (view === 'assignments') loadAssignments();
}
navItems.forEach(item => item.addEventListener('click', () => setView(item.dataset.view)));
document.querySelectorAll('[data-view-link]').forEach(button => button.addEventListener('click', () => setView(button.dataset.viewLink)));
document.getElementById('menuButton').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));

const toast = document.getElementById('toast');
async function queueRecharge(button) {
  button.textContent = 'Saving…'; button.disabled = true;
  try {
    const response = await fetch('/api/recharges', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ simId: button.dataset.simId, phoneNumber: button.dataset.phone, amount: 749, plan: 'Business recharge' }) });
    if (!response.ok) throw new Error('Recharge could not be saved.');
    button.textContent = 'Queued'; button.style.opacity = '.6';
    await showApiToast('Recharge saved', 'The recharge has been added to history.');
  } catch (error) { button.textContent = 'Recharge'; button.disabled = false; await showApiToast('Recharge failed', error.message); }
}
document.querySelectorAll('.recharge-now').forEach(button => button.addEventListener('click', () => queueRecharge(button)));
document.querySelector('.alert-list').addEventListener('click', event => { const button = event.target.closest('.recharge-now'); if (button) queueRecharge(button); });

const modal = document.getElementById('modal');
const assignmentModal = document.getElementById('assignmentModal');
const simModal = document.getElementById('simModal');
const rechargeModal = document.getElementById('rechargeModal');
function openModal() { modal.classList.add('open'); }
function closeModal() { modal.classList.remove('open'); }
function openAssignmentModal() { assignmentModal.classList.add('open'); }
function closeAssignmentModal() { assignmentModal.classList.remove('open'); }
async function openSimModal() { await loadAssetOptions(); simModal.classList.add('open'); }
function closeSimModal() { simModal.classList.remove('open'); }
function openRechargeModal() { rechargeModal.classList.add('open'); }
function closeRechargeModal() { rechargeModal.classList.remove('open'); }
document.getElementById('addAsset').addEventListener('click', openModal);
function openContextModal() { const current = document.getElementById('breadcrumbCurrent').textContent; current === 'Assignments' ? openAssignmentModal() : current === 'SIM cards' ? openSimModal() : current === 'Recharge history' ? openRechargeModal() : openModal(); }
document.getElementById('genericAdd').addEventListener('click', openContextModal);
document.getElementById('emptyAction').addEventListener('click', openContextModal);
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('closeAssignmentModal').addEventListener('click', closeAssignmentModal);
document.getElementById('closeSimModal').addEventListener('click', closeSimModal);
document.getElementById('closeRechargeModal').addEventListener('click', closeRechargeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
assignmentModal.addEventListener('click', e => { if (e.target === assignmentModal) closeAssignmentModal(); });
simModal.addEventListener('click', e => { if (e.target === simModal) closeSimModal(); });
rechargeModal.addEventListener('click', e => { if (e.target === rechargeModal) closeRechargeModal(); });
const assetFieldNames = ['assetId', 'brand', 'model', 'imei1', 'imei2', 'serialNumber', 'purchaseDate', 'purchaseVendor', 'purchaseCost', 'warrantyStartDate', 'warrantyEndDate', 'condition', 'status', 'currentLocation', 'remarks'];
const assignmentFieldNames = ['assignmentId', 'assetId', 'assignedTo', 'employeeId', 'department', 'designation', 'assignmentDate', 'expectedReturnDate', 'actualReturnDate', 'assignedBy', 'status', 'handoverRemarks'];
const simFieldNames = ['simId', 'phoneNumber', 'iccid', 'networkProvider', 'simType', 'activationDate', 'status', 'currentAssetId', 'assignedPerson', 'telecomCircle', 'ownership', 'kycStatus', 'remarks'];
const rechargeFieldNames = ['rechargeId', 'simId', 'phoneNumber', 'plan', 'amount', 'validityDays', 'rechargeDate', 'rechargeMode', 'transactionId', 'paymentReference', 'rechargeDoneBy', 'receipt', 'remarks'];
function formPayload(form, fieldNames) {
  return Object.fromEntries([...form.querySelectorAll('input,select,textarea')].map((field, index) => [fieldNames[index], field.value]));
}
async function loadAssetOptions() {
  try {
    const assets = await fetch('/api/assets').then(response => response.json());
    const select = document.getElementById('simAssetSelect');
    select.innerHTML = '<option value="">Unassigned</option>' + assets.map(asset => `<option value="${escapeHtml(asset.assetId)}">${escapeHtml(asset.assetId)} · ${escapeHtml(asset.brand)} ${escapeHtml(asset.model)}${asset.status === 'Assigned' ? ' · Assigned' : ''}</option>`).join('');
  } catch { /* Keep the unassigned option if assets cannot be loaded. */ }
}
async function showApiToast(title, message) {
  toast.querySelector('b').textContent = title; toast.querySelector('small').textContent = message;
  toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3600);
}
document.getElementById('assetForm').addEventListener('submit', async e => {
  e.preventDefault();
  const button = e.target.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = 'Saving…';
  try {
    const response = await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formPayload(e.target, assetFieldNames)) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not save asset.');
    closeModal(); e.target.reset(); await showApiToast('Asset added successfully', `${result.assetId} is now in your inventory.`); loadAssets();
  } catch (error) { await showApiToast('Could not save asset', error.message); }
  finally { button.disabled = false; button.innerHTML = 'Save asset <span>→</span>'; }
});
document.getElementById('assignmentForm').addEventListener('submit', async e => {
  e.preventDefault();
  const button = e.target.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = 'Saving…';
  try {
    const response = await fetch('/api/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formPayload(e.target, assignmentFieldNames)) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not save assignment.');
    closeAssignmentModal(); e.target.reset(); await showApiToast('Assignment saved successfully', `${result.assignmentId} is now part of the history.`); loadAssignments(); loadAssets();
  } catch (error) { await showApiToast('Could not save assignment', error.message); }
  finally { button.disabled = false; button.innerHTML = 'Save assignment <span>→</span>'; }
});
document.getElementById('simForm').addEventListener('submit', async e => {
  e.preventDefault();
  const button = e.target.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = 'Saving…';
  try {
    const response = await fetch('/api/sims', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formPayload(e.target, simFieldNames)) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not save SIM.');
    closeSimModal(); e.target.reset(); await showApiToast('SIM added successfully', `${result.simId} is now tracked separately from the mobile.`); loadSims();
  } catch (error) { await showApiToast('Could not save SIM', error.message); }
  finally { button.disabled = false; button.innerHTML = 'Save SIM <span>→</span>'; }
});
document.getElementById('rechargeForm').addEventListener('submit', async e => {
  e.preventDefault();
  const button = e.target.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = 'Saving…';
  try {
    const response = await fetch('/api/recharges', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formPayload(e.target, rechargeFieldNames)) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not save recharge.');
    closeRechargeModal(); e.target.reset(); await showApiToast('Recharge saved', `${result.rechargeStatus} · ${result.daysRemaining} days remaining.`); loadRecharges(); loadDashboard();
  } catch (error) { await showApiToast('Could not save recharge', error.message); }
  finally { button.disabled = false; button.innerHTML = 'Save recharge <span>→</span>'; }
});

function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }
function statusClass(status) { return ['Available', 'Returned', 'Good'].includes(status) ? 'available' : ['Assigned', 'Active'].includes(status) ? 'active' : 'warning'; }
async function loadAssets() {
  try {
    const assets = await fetch('/api/assets').then(response => response.json());
    const tbody = document.querySelector('#assetManagement tbody');
    tbody.innerHTML = assets.map(asset => `<tr><td><b class="mono asset-id">${escapeHtml(asset.assetId)}</b></td><td><b>${escapeHtml(asset.brand)}</b><span class="table-sub">${escapeHtml(asset.model)}</span></td><td><b class="mono">${escapeHtml(asset.imei1?.slice(-4) ? '•••• ' + asset.imei1.slice(-4) : '—')} / ${escapeHtml(asset.imei2?.slice(-4) ? '•••• ' + asset.imei2.slice(-4) : '—')}</b><span class="table-sub">${escapeHtml(asset.serialNumber || '—')}</span></td><td><span>${escapeHtml(asset.purchaseDate || '—')}</span><span class="table-sub">₹${Number(asset.purchaseCost || 0).toLocaleString('en-IN')} · ${escapeHtml(asset.purchaseVendor || '—')}</span></td><td><span class="status ${statusClass(asset.condition)}">${escapeHtml(asset.condition || '—')}</span></td><td><span class="status ${statusClass(asset.status)}">${escapeHtml(asset.status)}</span></td><td>${escapeHtml(asset.currentLocation || '—')}</td></tr>`).join('');
  } catch { /* The dashboard remains usable while the API is unavailable. */ }
}
async function loadAssignments() {
  try {
    const assignments = await fetch('/api/assignments').then(response => response.json());
    const timeline = document.querySelector('.assignment-timeline');
    timeline.innerHTML = assignments.map((assignment, index) => `<div class="timeline-item ${index === 0 ? 'current' : ''}"><div class="timeline-dot"></div><div class="timeline-content"><div class="timeline-top"><b>${escapeHtml(assignment.assignedTo)}</b><span class="status ${statusClass(assignment.status)}">${escapeHtml(assignment.status)}</span></div><p><span class="mono">${escapeHtml(assignment.assetId)}</span> · ${escapeHtml(assignment.employeeId || 'No employee ID')} · ${escapeHtml(assignment.department || '—')} · ${escapeHtml(assignment.designation || '—')}</p><div class="timeline-meta"><span>Assigned ${escapeHtml(assignment.assignmentDate || '—')}</span><span>${assignment.actualReturnDate ? 'Returned ' + escapeHtml(assignment.actualReturnDate) : 'Expected return ' + escapeHtml(assignment.expectedReturnDate || '—')}</span><span>Assigned by ${escapeHtml(assignment.assignedBy || '—')}</span></div>${assignment.handoverRemarks ? `<small>${escapeHtml(assignment.handoverRemarks)}</small>` : ''}</div></div>`).join('');
  } catch { /* The dashboard remains usable while the API is unavailable. */ }
}
async function loadSims() {
  try {
    const sims = await fetch('/api/sims').then(response => response.json());
    document.getElementById('simTable').innerHTML = sims.map(sim => `<tr><td><b class="mono asset-id">${escapeHtml(sim.simId)}</b></td><td><b class="mono">${escapeHtml(sim.phoneNumber)}</b><span class="table-sub">${escapeHtml(sim.iccid || '—')}</span></td><td>${escapeHtml(sim.networkProvider)}<span class="table-sub">${escapeHtml(sim.telecomCircle || '—')}</span></td><td>${escapeHtml(sim.simType || '—')}</td><td><span class="status ${statusClass(sim.status)}">${escapeHtml(sim.status)}</span></td><td><b class="mono">${escapeHtml(sim.currentAssetId || '—')}</b></td><td>${escapeHtml(sim.assignedPerson || 'Unassigned')}</td><td><span class="status ${statusClass(sim.kycStatus)}">${escapeHtml(sim.kycStatus || 'Pending')}</span></td></tr>`).join('');
  } catch { /* The dashboard remains usable while the API is unavailable. */ }
}
function rechargeStatusClass(status) { return status === 'Active' ? 'active' : status === 'Expired' ? 'warning' : 'warning'; }
async function loadRecharges() {
  try {
    const allRecharges = await fetch('/api/recharges').then(response => response.json());
    const latestBySim = new Map(); allRecharges.forEach(recharge => { if (!latestBySim.has(recharge.simId)) latestBySim.set(recharge.simId, recharge); });
    document.getElementById('rechargeTable').innerHTML = [...latestBySim.values()].map(recharge => `<tr><td><b class="mono">${escapeHtml(recharge.phoneNumber || '—')}</b></td><td>${escapeHtml(recharge.networkProvider || recharge.plan?.split(' ')[0] || '—')}</td><td>${escapeHtml(recharge.plan || '—')}</td><td>₹${Number(recharge.amount || 0).toLocaleString('en-IN')}</td><td>${escapeHtml(recharge.rechargeDate || '—')}</td><td>${escapeHtml(recharge.validityDays || '—')} Days</td><td>${escapeHtml(recharge.expiryDate || '—')}</td><td>${recharge.daysRemaining === null ? '—' : `${escapeHtml(recharge.daysRemaining)} ${recharge.daysRemaining === 1 || recharge.daysRemaining === -1 ? 'Day' : 'Days'}`}</td><td><span class="status ${rechargeStatusClass(recharge.rechargeStatus)}">${escapeHtml(recharge.rechargeStatus)}</span></td></tr>`).join('');
    document.getElementById('historyTable').innerHTML = allRecharges.map(recharge => `<tr><td><b class="mono asset-id">${escapeHtml(recharge.rechargeId)}</b></td><td><span class="mono">${escapeHtml(recharge.simId)}</span><span class="table-sub">${escapeHtml(recharge.phoneNumber || '—')}</span></td><td>₹${Number(recharge.amount || 0).toLocaleString('en-IN')}</td><td>${escapeHtml(recharge.rechargeDate || '—')}</td><td>${escapeHtml(recharge.expiryDate || '—')}</td><td>${escapeHtml(recharge.plan || `${recharge.validityDays || '—'} Days`)}</td><td>${escapeHtml(recharge.rechargeMode || '—')}</td><td>${escapeHtml(recharge.rechargeDoneBy || '—')}</td><td><span class="status ${rechargeStatusClass(recharge.rechargeStatus)}">${escapeHtml(recharge.rechargeStatus)}</span></td></tr>`).join('');
  } catch { /* The dashboard remains usable while the API is unavailable. */ }
}
async function loadDashboard() {
  try {
    const summary = await fetch('/api/dashboard').then(response => response.json());
    [['totalSimsMetric', summary.totalSims], ['activeSimsMetric', summary.activeSims], ['expiringMetric', summary.rechargeExpiring], ['expiredMetric', summary.rechargeExpired], ['inactiveSimsMetric', summary.inactiveSims], ['totalAssetsMetric', summary.totalAssets], ['rechargeActiveMetric', summary.rechargeActive], ['rechargeExpiringStrip', summary.rechargeExpiring], ['rechargeExpiredStrip', summary.rechargeExpired]].forEach(([id, value]) => { const element = document.getElementById(id); if (element) element.textContent = String(value).padStart(2, '0'); });
    document.getElementById('thisMonthRechargeTotal').textContent = `₹${Number(summary.thisMonthRechargeTotal || 0).toLocaleString('en-IN')}`;
    document.getElementById('thisMonthRechargeCount').textContent = `${summary.thisMonthRechargeCount || 0} recharges`;
  } catch { /* Keep the static fallback numbers visible if the API is unavailable. */ }
}
async function loadAlerts() {
  try {
    const alerts = await fetch('/api/alerts').then(response => response.json());
    const list = document.querySelector('.alert-list');
    if (!alerts.length) { list.innerHTML = '<div class="no-alerts">All mobile and SIM records are currently healthy.</div>'; return; }
    list.innerHTML = alerts.slice(0, 5).map(alert => {
      if (alert.type === 'assignment') return `<div class="alert-row assignment-alert"><div class="network-logo assignment-mark">↗</div><div class="alert-detail"><b>${escapeHtml(alert.assetId)}</b><span>Currently assigned to ${escapeHtml(alert.assignedPerson)}</span></div><div class="expiry"><span>Assigned</span><strong>${escapeHtml(alert.assignmentDate || '—')}</strong></div><span class="alert-info">View</span></div>`;
      const provider = (alert.networkProvider || 'SIM').toLowerCase();
      const providerClass = provider.includes('airtel') ? 'airtel' : provider.includes('vi') ? 'vi' : 'jio';
      return `<div class="alert-row"><div class="network-logo ${providerClass}">${escapeHtml(alert.networkProvider || 'SIM')}</div><div class="alert-detail"><b>${escapeHtml(alert.phoneNumber || '—')}</b><span>${escapeHtml(alert.assignedPerson)} · ${escapeHtml(alert.message)}</span></div><div class="expiry"><span>${alert.type === 'expiredRecharge' ? 'Expired on' : 'Expires in'}</span><strong>${escapeHtml(alert.type === 'expiredRecharge' ? alert.expiryDate : `${alert.daysRemaining} days`)}</strong></div>${alert.type === 'expiredRecharge' ? '<span class="alert-info expired-label">Expired</span>' : `<button class="small-action recharge-now" data-sim-id="${escapeHtml(alert.simId)}" data-phone="${escapeHtml(alert.phoneNumber || '')}">Recharge</button>`}</div>`;
    }).join('');
  } catch { /* Keep the static alert fallback visible if the API is unavailable. */ }
}
loadAssets();
loadSims();
loadRecharges();
loadDashboard();
loadAlerts();

document.getElementById('globalSearch').addEventListener('input', e => {
  const term = e.target.value.toLowerCase();
  document.querySelectorAll('#assetTable tr').forEach(row => row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none');
});
document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('globalSearch').focus(); } });
