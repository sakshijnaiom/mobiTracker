import 'dotenv/config';
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 4173);
const client = new MongoClient(process.env.MONGODB_URI);
let db;

app.use(express.json({ limit: '1mb' }));

function cleanId(value) {
  return value ? String(value).trim() : '';
}

function serialize(record) {
  if (!record) return record;
  return { ...record, _id: record._id?.toString() };
}

function rechargeStatus(expiryDate) {
  if (!expiryDate) return 'Active';
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const expiry = new Date(`${expiryDate}T00:00:00Z`).getTime();
  const daysRemaining = Math.ceil((expiry - todayUtc) / 86400000);
  if (daysRemaining < 0) return 'Expired';
  if (daysRemaining <= 3) return 'Expiring Soon';
  if (daysRemaining <= 10) return 'Upcoming Expiry';
  return 'Active';
}

function enrichRecharge(recharge) {
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const expiry = recharge.expiryDate ? new Date(`${recharge.expiryDate}T00:00:00Z`).getTime() : null;
  const daysRemaining = expiry === null ? null : Math.ceil((expiry - todayUtc) / 86400000);
  return { ...serialize(recharge), daysRemaining, rechargeStatus: rechargeStatus(recharge.expiryDate) };
}

async function seed() {
  const assets = db.collection('assets');
  if (await assets.countDocuments() === 0) {
    await assets.insertMany([
      { assetId: 'MOB-0001', brand: 'Samsung', model: 'Galaxy A55', imei1: 'XXXXXXXX4821', imei2: 'XXXXXXXX7012', serialNumber: 'SN-A55-1024', purchaseDate: '2026-01-10', purchaseVendor: 'Samsung India', purchaseCost: 32999, warrantyStartDate: '2026-01-10', warrantyEndDate: '2027-01-10', condition: 'Good', status: 'Assigned', currentLocation: 'Sales floor', remarks: 'Issued with charger and protective case', assignedTo: 'Rahul Patil', createdAt: new Date() },
      { assetId: 'MOB-0002', brand: 'Apple', model: 'iPhone 14', imei1: 'XXXXXXXX2840', imei2: '', serialNumber: 'SN-IP14-2219', purchaseDate: '2025-11-22', purchaseVendor: 'Apple India', purchaseCost: 58900, warrantyStartDate: '2025-11-22', warrantyEndDate: '2026-11-22', condition: 'Good', status: 'Available', currentLocation: 'IT cupboard', remarks: '', assignedTo: '', createdAt: new Date() },
      { assetId: 'MOB-0003', brand: 'OnePlus', model: '12 5G', imei1: 'XXXXXXXX0319', imei2: '', serialNumber: 'SN-OP12-8930', purchaseDate: '2026-02-03', purchaseVendor: 'OnePlus', purchaseCost: 64999, warrantyStartDate: '2026-02-03', warrantyEndDate: '2027-02-03', condition: 'Damaged', status: 'Under Repair', currentLocation: 'Service center', remarks: 'Screen replacement', assignedTo: '', createdAt: new Date() }
    ]);
  }
  const assignments = db.collection('assignments');
  if (await assignments.countDocuments() === 0) {
    await assignments.insertMany([
      { assignmentId: 'ASN-0003', assetId: 'MOB-0001', assignedTo: 'Rahul Patil', employeeId: 'EMP-1024', department: 'Sales', designation: 'Account Executive', assignmentDate: '2026-01-15', expectedReturnDate: '2027-01-15', actualReturnDate: '', assignedBy: 'Arjun Kapoor', status: 'Active', handoverRemarks: 'Device issued with charger and protective case.', createdAt: new Date('2026-01-15') },
      { assignmentId: 'ASN-0002', assetId: 'MOB-0001', assignedTo: 'Amit Joshi', employeeId: 'EMP-1007', department: 'Sales', designation: 'Territory Manager', assignmentDate: '2025-08-04', expectedReturnDate: '2026-08-04', actualReturnDate: '2026-01-14', assignedBy: 'Neha Shah', status: 'Returned', handoverRemarks: 'Returned in good condition after role change.', createdAt: new Date('2025-08-04') },
      { assignmentId: 'ASN-0001', assetId: 'MOB-0001', assignedTo: 'IT Stores', employeeId: '', department: 'IT', designation: 'Central inventory', assignmentDate: '2025-01-10', expectedReturnDate: '', actualReturnDate: '2025-08-03', assignedBy: 'Arjun Kapoor', status: 'Returned', handoverRemarks: '', createdAt: new Date('2025-01-10') }
    ]);
  }
  const sims = db.collection('sims');
  if (await sims.countDocuments() === 0) {
    await sims.insertMany([
      { simId: 'SIM-0001', phoneNumber: '+919876512401', iccid: '8991000000004821', networkProvider: 'Jio', simType: 'Physical SIM', activationDate: '2025-01-10', status: 'Active', currentAssetId: 'MOB-0001', assignedPerson: 'Rahul Patil', telecomCircle: 'Maharashtra', ownership: 'Company', kycStatus: 'Verified', remarks: '' },
      { simId: 'SIM-0002', phoneNumber: '+919810277842', iccid: '8991000000002840', networkProvider: 'Airtel', simType: 'Physical SIM', activationDate: '2025-02-18', status: 'Active', currentAssetId: 'MOB-0002', assignedPerson: 'Priya Shah', telecomCircle: 'Maharashtra', ownership: 'Company', kycStatus: 'Verified', remarks: '' },
      { simId: 'SIM-0003', phoneNumber: '+919820150319', iccid: '8991000000000319', networkProvider: 'Vi', simType: 'eSIM', activationDate: '2025-03-02', status: 'Active', currentAssetId: 'MOB-0003', assignedPerson: '', telecomCircle: 'Maharashtra', ownership: 'Company', kycStatus: 'Verified', remarks: '' }
    ]);
  }
  await sims.updateMany({ networkProvider: { $exists: false } }, [{ $set: { networkProvider: '$network', activationDate: '$activatedOn', currentAssetId: '$assetId', simType: 'Physical SIM', telecomCircle: 'Maharashtra', ownership: 'Company', kycStatus: 'Verified', assignedPerson: '' } }, { $unset: ['network', 'activatedOn', 'assetId'] }]);
  const simAssignments = db.collection('simAssignments');
  if (await simAssignments.countDocuments() === 0) {
    await simAssignments.insertMany([
      { relationshipId: 'SMA-0003', simId: 'SIM-0001', assetId: 'MOB-0001', assignedPerson: 'Rahul Patil', assignedFrom: '2026-01-15', assignedTo: '', status: 'Current', remarks: 'SIM currently in active company mobile.', createdAt: new Date('2026-01-15') },
      { relationshipId: 'SMA-0002', simId: 'SIM-0001', assetId: 'MOB-0005', assignedPerson: 'Amit Joshi', assignedFrom: '2025-03-01', assignedTo: '2026-01-14', status: 'Previous', remarks: 'Moved after role change.', createdAt: new Date('2025-03-01') },
      { relationshipId: 'SMA-0001', simId: 'SIM-0001', assetId: 'MOB-0008', assignedPerson: 'IT Stores', assignedFrom: '2025-01-10', assignedTo: '2025-02-28', status: 'Previous', remarks: 'Initial activation and custody.', createdAt: new Date('2025-01-10') }
    ]);
  }
  const recharges = db.collection('recharges');
  if (await recharges.countDocuments() === 0) {
    await recharges.insertMany([
      { rechargeId: 'RCH-0001', simId: 'SIM-0001', phoneNumber: '+919876512401', amount: 749, rechargeDate: '2026-09-01', expiryDate: '2026-10-01', plan: 'Jio Business 749', status: 'Active', createdAt: new Date('2026-09-01') },
      { rechargeId: 'RCH-0002', simId: 'SIM-0002', phoneNumber: '+919810277842', amount: 699, rechargeDate: '2026-09-04', expiryDate: '2026-10-04', plan: 'Airtel Business 699', status: 'Active', createdAt: new Date('2026-09-04') }
    ]);
  }
  const historySeed = [
    { rechargeId: 'RECH-001', simId: 'SIM-0001', phoneNumber: '+919876512401', amount: 299, rechargeDate: '2026-01-10', expiryDate: '2026-02-06', validityDays: 28, plan: '28 Days', rechargeMode: 'UPI', transactionId: 'UPI-20260110-001', paymentReference: 'pay_001', rechargeDoneBy: 'Arjun Kapoor', receipt: '', remarks: '', status: 'Active', createdAt: new Date('2026-01-10') },
    { rechargeId: 'RECH-002', simId: 'SIM-0001', phoneNumber: '+919876512401', amount: 299, rechargeDate: '2026-02-07', expiryDate: '2026-03-06', validityDays: 28, plan: '28 Days', rechargeMode: 'Company Account', transactionId: 'CA-20260207-002', paymentReference: 'pay_002', rechargeDoneBy: 'Arjun Kapoor', receipt: '', remarks: '', status: 'Active', createdAt: new Date('2026-02-07') },
    { rechargeId: 'RECH-003', simId: 'SIM-0001', phoneNumber: '+919876512401', amount: 349, rechargeDate: '2026-03-07', expiryDate: '2026-04-04', validityDays: 28, plan: '28 Days', rechargeMode: 'UPI', transactionId: 'UPI-20260307-003', paymentReference: 'pay_003', rechargeDoneBy: 'Neha Shah', receipt: '', remarks: '', status: 'Active', createdAt: new Date('2026-03-07') },
    { rechargeId: 'RECH-004', simId: 'SIM-0001', phoneNumber: '+919876512401', amount: 349, rechargeDate: '2026-04-05', expiryDate: '2026-05-02', validityDays: 28, plan: '28 Days', rechargeMode: 'Card', transactionId: 'CARD-20260405-004', paymentReference: 'pay_004', rechargeDoneBy: 'Arjun Kapoor', receipt: '', remarks: '', status: 'Active', createdAt: new Date('2026-04-05') },
    { rechargeId: 'RECH-005', simId: 'SIM-0001', phoneNumber: '+919876512401', amount: 349, rechargeDate: '2026-09-03', expiryDate: '2026-10-01', validityDays: 28, plan: '28 Days', rechargeMode: 'UPI', transactionId: 'UPI-20260903-005', paymentReference: 'pay_005', rechargeDoneBy: 'Arjun Kapoor', receipt: '', remarks: '', status: 'Active', createdAt: new Date('2026-09-03') }
  ];
  for (const historyRecord of historySeed) await recharges.updateOne({ rechargeId: historyRecord.rechargeId }, { $setOnInsert: historyRecord }, { upsert: true });
  const incompleteRecharges = await recharges.find({ $or: [{ expiryDate: '' }, { expiryDate: { $exists: false } }] }).toArray();
  for (const recharge of incompleteRecharges) {
    const validityDays = Number(recharge.validityDays || 28);
    const baseDate = recharge.rechargeDate || new Date().toISOString().slice(0, 10);
    const expiryDate = new Date(new Date(`${baseDate}T00:00:00Z`).getTime() + validityDays * 86400000).toISOString().slice(0, 10);
    await recharges.updateOne({ _id: recharge._id }, { $set: { validityDays, expiryDate } });
  }
  await Promise.all([
    assets.createIndex({ assetId: 1 }, { unique: true }),
    assets.createIndex({ status: 1 }),
    db.collection('assignments').createIndex({ assignmentId: 1 }, { unique: true }),
    db.collection('assignments').createIndex({ assetId: 1, createdAt: -1 }),
    db.collection('sims').createIndex({ phoneNumber: 1 }, { unique: true, sparse: true }),
    db.collection('sims').createIndex({ simId: 1 }, { unique: true }),
    simAssignments.createIndex({ relationshipId: 1 }, { unique: true }),
    simAssignments.createIndex({ simId: 1, createdAt: -1 }),
    db.collection('recharges').createIndex({ simId: 1, rechargeDate: -1 })
  ]);
}

app.get('/api/health', (_req, res) => res.json({ ok: true, database: db?.databaseName || null }));

app.get('/api/dashboard', async (_req, res) => {
  const [totalAssets, totalSims, activeSims, inactiveSims, assigned, available, underRepair, recentAssignments, rechargeRecords] = await Promise.all([
    db.collection('assets').countDocuments(),
    db.collection('sims').countDocuments(),
    db.collection('sims').countDocuments({ status: 'Active' }),
    db.collection('sims').countDocuments({ status: { $ne: 'Active' } }),
    db.collection('assets').countDocuments({ status: 'Assigned' }),
    db.collection('assets').countDocuments({ status: 'Available' }),
    db.collection('assets').countDocuments({ status: 'Under Repair' }),
    db.collection('assignments').find().sort({ createdAt: -1 }).limit(5).toArray(),
    db.collection('recharges').find().toArray()
  ]);
  const latestBySim = new Map();
  rechargeRecords.sort((a, b) => new Date(b.rechargeDate || 0) - new Date(a.rechargeDate || 0)).forEach(recharge => { if (!latestBySim.has(recharge.simId)) latestBySim.set(recharge.simId, recharge); });
  const statuses = [...latestBySim.values()].map(recharge => rechargeStatus(recharge.expiryDate));
  const monthKey = new Date().toISOString().slice(0, 7);
  const thisMonth = rechargeRecords.filter(recharge => String(recharge.rechargeDate || '').startsWith(monthKey));
  res.json({ totalAssets, totalSims, activeSims, inactiveSims, rechargeActive: statuses.filter(status => status === 'Active').length, rechargeExpiring: statuses.filter(status => ['Upcoming Expiry', 'Expiring Soon'].includes(status)).length, rechargeExpired: statuses.filter(status => status === 'Expired').length, thisMonthRechargeTotal: thisMonth.reduce((sum, recharge) => sum + Number(recharge.amount || 0), 0), thisMonthRechargeCount: thisMonth.length, assigned, available, underRepair, recentAssignments: recentAssignments.map(serialize) });
});

app.get('/api/alerts', async (_req, res) => {
  const [sims, recharges, assignments] = await Promise.all([
    db.collection('sims').find().toArray(),
    db.collection('recharges').find().sort({ rechargeDate: -1 }).toArray(),
    db.collection('assignments').find({ status: 'Active' }).sort({ createdAt: -1 }).toArray()
  ]);
  const simById = new Map(sims.map(sim => [sim.simId, sim]));
  const latestBySim = new Map();
  recharges.forEach(recharge => { if (!latestBySim.has(recharge.simId)) latestBySim.set(recharge.simId, recharge); });
  const alerts = [];
  for (const recharge of latestBySim.values()) {
    const sim = simById.get(recharge.simId) || {};
    const daysRemaining = enrichRecharge(recharge).daysRemaining;
    const status = rechargeStatus(recharge.expiryDate);
    if (status === 'Expired' || (daysRemaining !== null && daysRemaining <= 10)) alerts.push({ type: status === 'Expired' ? 'expiredRecharge' : 'expiringRecharge', priority: status === 'Expired' ? 'critical' : 'warning', simId: recharge.simId, phoneNumber: recharge.phoneNumber || sim.phoneNumber, networkProvider: sim.networkProvider || 'SIM', assignedPerson: sim.assignedPerson || 'Unassigned', amount: recharge.amount, expiryDate: recharge.expiryDate, daysRemaining, message: status === 'Expired' ? 'Recharge has expired.' : `Recharge expires in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}.` });
  }
  assignments.slice(0, 4).forEach(assignment => alerts.push({ type: 'assignment', priority: 'info', assetId: assignment.assetId, assignedPerson: assignment.assignedTo, assignmentDate: assignment.assignmentDate, message: `Mobile ${assignment.assetId} is currently assigned to ${assignment.assignedTo}.` }));
  res.json(alerts);
});

app.get('/api/assets', async (_req, res) => {
  const records = await db.collection('assets').find().sort({ createdAt: -1 }).toArray();
  res.json(records.map(serialize));
});

app.post('/api/assets', async (req, res) => {
  const body = req.body || {};
  const required = ['assetId', 'brand', 'model', 'imei1'];
  const missing = required.filter(key => !cleanId(body[key]));
  if (missing.length) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  const record = {
    assetId: cleanId(body.assetId), brand: cleanId(body.brand), model: cleanId(body.model), imei1: cleanId(body.imei1), imei2: cleanId(body.imei2), serialNumber: cleanId(body.serialNumber),
    purchaseDate: cleanId(body.purchaseDate), purchaseVendor: cleanId(body.purchaseVendor), purchaseCost: Number(body.purchaseCost || 0), warrantyStartDate: cleanId(body.warrantyStartDate), warrantyEndDate: cleanId(body.warrantyEndDate),
    condition: cleanId(body.condition) || 'Good', status: cleanId(body.status) || 'Available', currentLocation: cleanId(body.currentLocation), remarks: cleanId(body.remarks), assignedTo: '', createdAt: new Date()
  };
  try {
    const result = await db.collection('assets').insertOne(record);
    res.status(201).json(serialize({ ...record, _id: result.insertedId }));
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({ error: error.code === 11000 ? 'Asset ID already exists.' : 'Could not save asset.' });
  }
});

app.get('/api/assignments', async (req, res) => {
  const filter = req.query.assetId ? { assetId: cleanId(req.query.assetId) } : {};
  const records = await db.collection('assignments').find(filter).sort({ createdAt: -1 }).toArray();
  res.json(records.map(serialize));
});

app.post('/api/assignments', async (req, res) => {
  const body = req.body || {};
  const required = ['assignmentId', 'assetId', 'assignedTo'];
  const missing = required.filter(key => !cleanId(body[key]));
  if (missing.length) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  const record = { assignmentId: cleanId(body.assignmentId), assetId: cleanId(body.assetId), assignedTo: cleanId(body.assignedTo), employeeId: cleanId(body.employeeId), department: cleanId(body.department), designation: cleanId(body.designation), assignmentDate: cleanId(body.assignmentDate), expectedReturnDate: cleanId(body.expectedReturnDate), actualReturnDate: cleanId(body.actualReturnDate), assignedBy: cleanId(body.assignedBy), status: cleanId(body.status) || 'Active', handoverRemarks: cleanId(body.handoverRemarks), createdAt: new Date() };
  const assets = db.collection('assets');
  const asset = await assets.findOne({ assetId: record.assetId });
  if (!asset) return res.status(404).json({ error: 'Asset ID was not found.' });
  try {
    if (record.status === 'Active') {
      await db.collection('assignments').updateMany({ assetId: record.assetId, status: 'Active' }, { $set: { status: 'Returned', actualReturnDate: record.assignmentDate || new Date().toISOString().slice(0, 10) } });
      await assets.updateOne({ assetId: record.assetId }, { $set: { status: 'Assigned', assignedTo: record.assignedTo } });
    }
    const result = await db.collection('assignments').insertOne(record);
    res.status(201).json(serialize({ ...record, _id: result.insertedId }));
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({ error: error.code === 11000 ? 'Assignment ID already exists.' : 'Could not save assignment.' });
  }
});

app.get('/api/sims', async (_req, res) => {
  res.json((await db.collection('sims').find().sort({ simId: 1 }).toArray()).map(serialize));
});

app.post('/api/sims', async (req, res) => {
  const body = req.body || {};
  const required = ['simId', 'phoneNumber', 'iccid', 'networkProvider'];
  const missing = required.filter(key => !cleanId(body[key]));
  if (missing.length) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  if (cleanId(body.currentAssetId) && !await db.collection('assets').findOne({ assetId: cleanId(body.currentAssetId) })) return res.status(404).json({ error: 'Current mobile asset ID was not found.' });
  const record = { simId: cleanId(body.simId), phoneNumber: cleanId(body.phoneNumber), iccid: cleanId(body.iccid), networkProvider: cleanId(body.networkProvider), simType: cleanId(body.simType) || 'Physical SIM', activationDate: cleanId(body.activationDate), status: cleanId(body.status) || 'Active', currentAssetId: cleanId(body.currentAssetId), assignedPerson: cleanId(body.assignedPerson), telecomCircle: cleanId(body.telecomCircle), ownership: cleanId(body.ownership) || 'Company', kycStatus: cleanId(body.kycStatus) || 'Pending', remarks: cleanId(body.remarks), createdAt: new Date() };
  try {
    const result = await db.collection('sims').insertOne(record);
    if (record.currentAssetId) await db.collection('simAssignments').insertOne({ relationshipId: `SMA-${Date.now()}`, simId: record.simId, assetId: record.currentAssetId, assignedPerson: record.assignedPerson, assignedFrom: record.activationDate || new Date().toISOString().slice(0, 10), assignedTo: '', status: 'Current', remarks: 'SIM linked during registration.', createdAt: new Date() });
    res.status(201).json(serialize({ ...record, _id: result.insertedId }));
  } catch (error) { res.status(error.code === 11000 ? 409 : 500).json({ error: error.code === 11000 ? 'SIM ID or mobile number already exists.' : 'Could not save SIM.' }); }
});

app.get('/api/sim-assignments', async (req, res) => {
  const filter = req.query.simId ? { simId: cleanId(req.query.simId) } : {};
  res.json((await db.collection('simAssignments').find(filter).sort({ createdAt: -1 }).toArray()).map(serialize));
});

app.post('/api/sim-assignments', async (req, res) => {
  const body = req.body || {};
  const record = { relationshipId: cleanId(body.relationshipId) || `SMA-${Date.now()}`, simId: cleanId(body.simId), assetId: cleanId(body.assetId), assignedPerson: cleanId(body.assignedPerson), assignedFrom: cleanId(body.assignedFrom), assignedTo: cleanId(body.assignedTo), status: 'Current', remarks: cleanId(body.remarks), createdAt: new Date() };
  if (!record.simId || !record.assetId) return res.status(400).json({ error: 'SIM ID and Asset ID are required.' });
  if (!await db.collection('sims').findOne({ simId: record.simId })) return res.status(404).json({ error: 'SIM ID was not found.' });
  if (!await db.collection('assets').findOne({ assetId: record.assetId })) return res.status(404).json({ error: 'Asset ID was not found.' });
  await db.collection('simAssignments').updateMany({ simId: record.simId, status: 'Current' }, { $set: { status: 'Previous', assignedTo: record.assignedFrom || new Date().toISOString().slice(0, 10) } });
  await db.collection('sims').updateOne({ simId: record.simId }, { $set: { currentAssetId: record.assetId, assignedPerson: record.assignedPerson } });
  const result = await db.collection('simAssignments').insertOne(record);
  res.status(201).json(serialize({ ...record, _id: result.insertedId }));
});

app.get('/api/recharges', async (_req, res) => {
  res.json((await db.collection('recharges').find().sort({ rechargeDate: -1 }).toArray()).map(enrichRecharge));
});

app.post('/api/recharges', async (req, res) => {
  const body = req.body || {};
  const rechargeDate = cleanId(body.rechargeDate) || new Date().toISOString().slice(0, 10);
  const validityDays = Number(body.validityDays || 28);
  const expiryDate = cleanId(body.expiryDate) || new Date(new Date(`${rechargeDate}T00:00:00Z`).getTime() + validityDays * 86400000).toISOString().slice(0, 10);
  const record = { rechargeId: cleanId(body.rechargeId) || `RCH-${Date.now()}`, simId: cleanId(body.simId), phoneNumber: cleanId(body.phoneNumber), amount: Number(body.amount || 0), rechargeDate, validityDays, expiryDate, plan: cleanId(body.plan), rechargeMode: cleanId(body.rechargeMode) || 'UPI', transactionId: cleanId(body.transactionId), paymentReference: cleanId(body.paymentReference), rechargeDoneBy: cleanId(body.rechargeDoneBy), receipt: cleanId(body.receipt), remarks: cleanId(body.remarks), status: 'Active', createdAt: new Date() };
  if (!record.simId || !record.amount) return res.status(400).json({ error: 'SIM and amount are required.' });
  const result = await db.collection('recharges').insertOne(record);
  res.status(201).json(enrichRecharge({ ...record, _id: result.insertedId }));
});

app.use(express.static(__dirname));

async function start() {
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'mobiTrack');
  await seed();
  app.listen(port, '0.0.0.0', () => console.log(`MobiTrack running at http://localhost:${port}`));
}

start().catch(error => { console.error('MobiTrack could not connect to MongoDB:', error.message); process.exit(1); });
