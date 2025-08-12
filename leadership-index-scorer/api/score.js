export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const input = req.body;

  const stripZws = s => String(s ?? '').replace(/[\u200B\u200C\u200D\uFEFF\u00A0]/g, '');

  function normalizeLevel(txt = '') {
    const t = txt.toLowerCase();
    if (t.includes('entry')) return 'level_entry';
    if (t.includes('mid')) return 'level_mid';
    if (t.includes('senior')) return 'level_senior';
    if (t.includes('exec')) return 'level_exec';
    return 'level_mid';
  }

  function normalizeSector(txt = '') {
    const t = txt.toLowerCase();
    if (t.includes('health')) return 'healthcare';
    if (t.includes('govern')) return 'government';
    if (t.includes('corp') || t.includes('private')) return 'corporate';
    if (t.includes('non')) return 'nonprofit';
    return 'other';
  }

  function extractPct(s) {
    if (!s) return null;
    const m = String(s).match(/(\d{1,3})\s*%/);
    return m ? Number(m[1]) : null;
  }

  const buckets = { dm: [], comm: [], rm: [], sm: [], pm: [], si: [] };
  const answers = Array.isArray(input.answers) ? input.answers : [];

  for (const a of answers) {
    const score = extractPct(a);
    if (score == null) continue;
    const lower = String(a).toLowerCase();
    if (lower.includes('dm_')) buckets.dm.push(score);
    else if (lower.includes('comm_')) buckets.comm.push(score);
    else if (lower.includes('rm_')) buckets.rm.push(score);
    else if (lower.includes('sm_')) buckets.sm.push(score);
    else if (lower.includes('pm_')) buckets.pm.push(score);
    else if (lower.includes('si_')) buckets.si.push(score);
  }

  const avg = arr => arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : null;

  const dm_raw = avg(buckets.dm);
  const comm_raw = avg(buckets.comm);
  const rm_raw = avg(buckets.rm);
  const sm_raw = avg(buckets.sm);
  const pm_raw = avg(buckets.pm);
  const si_raw = avg(buckets.si);

  const mult = {
    level_entry: 1.10,
    level_mid: 1.00,
    level_senior: 0.95,
    level_exec: 0.90
  };

  const role_level = normalizeLevel(input.role_level_raw || '');
  const sector = normalizeSector(input.sector_raw || '');
  const levelMult = mult[role_level] || 1.0;

  const cap = v => (v == null ? null : Math.min(100, Math.round(v * levelMult)));

  const dm_adj = cap(dm_raw);
  const comm_adj = cap(comm_raw);
  const rm_adj = cap(rm_raw);
  const sm_adj = cap(sm_raw);
  const pm_adj = cap(pm_raw);
  const si_adj = cap(si_raw);

  const present = [dm_adj, comm_adj, rm_adj, sm_adj, pm_adj, si_adj].filter(v => v != null);
  const overall = present.length ? Math.round(present.reduce((s, n) => s + n, 0) / present.length) : null;

  const output = {
    timestamp: new Date().toISOString(),
    email: input.email || '',
    role_level,
    sector,
    selected_competencies: input.selected_competencies_raw || '',
    dm_score_raw: dm_raw,
    comm_score_raw: comm_raw,
    rm_score_raw: rm_raw,
    sm_score_raw: sm_raw,
    pm_score_raw: pm_raw,
    si_score_raw: si_raw,
    dm_score_adj: dm_adj,
    comm_score_adj: comm_adj,
    rm_score_adj: rm_adj,
    sm_score_adj: sm_adj,
    pm_score_adj: pm_adj,
    si_score_adj: si_adj,
    overall_score: overall,
    level_adjustment_used: levelMult,
    record_id: input.record_id || ''
  };

  res.status(200).json(output);
}