import http from 'node:http';
import { Client } from 'pg';

const PORT = Number(process.env.PORT || 3001);
const DB_CONFIG = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'dockpilot',
  user: process.env.PGUSER || 'dockpilot',
  password: process.env.PGPASSWORD || 'dockpilot_local_dev',
};

const db = new Client(DB_CONFIG);

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
  res.end(JSON.stringify(payload));
};

const parseBody = async (req) => {
  if (req.method === 'GET' || req.method === 'DELETE' || req.method === 'OPTIONS') {
    return null;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
};

const ensureDbConnected = async () => {
  if (db._connected) return;
  await db.connect();
  db._connected = true;
  await ensureSchema();
};

const ensureSchema = async () => {
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS public.companies (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      contact_admin_email text NOT NULL,
      contact_name text,
      contact_address text,
      registration_no text,
      phone text,
      tba1 text,
      tba2 text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS public.credentials (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      full_name text NOT NULL,
      role text NOT NULL,
      login_name text NOT NULL,
      password_hash text NOT NULL,
      expiry text NOT NULL,
      access text[] NOT NULL DEFAULT '{}'::text[],
      must_change_password boolean NOT NULL DEFAULT false,
      password_updated_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT credentials_company_id_login_name_key UNIQUE (company_id, login_name)
    );

    CREATE TABLE IF NOT EXISTS public.vessel_registry (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      vessel_id text NOT NULL,
      vessel_name text NOT NULL,
      imo text,
      month_year_of_build text,
      yard_of_build text,
      flag text,
      class text,
      loa numeric,
      lbp numeric,
      breadth numeric,
      depth numeric,
      summer_draught numeric,
      dwt numeric,
      gt numeric,
      nt numeric,
      ga_plan_status text NOT NULL DEFAULT 'Pending',
      midship_plan_status text NOT NULL DEFAULT 'Pending',
      shell_exp_plan_status text NOT NULL DEFAULT 'Pending',
      docking_plan_status text NOT NULL DEFAULT 'Pending',
      pd_utm_status text NOT NULL DEFAULT 'Pending',
      pd_blr_boro_status text NOT NULL DEFAULT 'Pending',
      pd_ldm_status text NOT NULL DEFAULT 'Pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT vessel_registry_company_vessel_unique UNIQUE (company_id, vessel_id)
    );

    CREATE TABLE IF NOT EXISTS public.fleet_registration (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      matrix_key text NOT NULL DEFAULT 'default',
      main_header text NOT NULL DEFAULT 'Fleet Registration Matrix',
      sub_header_row_a jsonb NOT NULL DEFAULT '[]'::jsonb,
      sub_header_row_b jsonb NOT NULL DEFAULT '[]'::jsonb,
      row_labels jsonb NOT NULL DEFAULT '[]'::jsonb,
      matrix_data jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT fleet_registration_company_matrix_unique UNIQUE (company_id, matrix_key)
    );

    CREATE TABLE IF NOT EXISTS public.dd_job_matrix (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      matrix_key text NOT NULL DEFAULT 'default',
      matrix_header jsonb NOT NULL DEFAULT '[]'::jsonb,
      matrix_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT dd_job_matrix_company_key_unique UNIQUE (company_id, matrix_key)
    );

    CREATE TABLE IF NOT EXISTS public.project_frontpage_recall (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      project_key text NOT NULL,
      launch_date text,
      vessel_id text,
      vessel_name text,
      imo text,
      docking_criteria text,
      cap_survey text,
      est_release_date text,
      loceta_1_label text,
      loceta_1_date text,
      loceta_2_label text,
      loceta_2_date text,
      loceta_3_label text,
      loceta_3_date text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT project_frontpage_recall_company_project_unique UNIQUE (company_id, project_key)
    );

    CREATE TABLE IF NOT EXISTS public.project_frontpage_checkpoint_recall (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
      project_key text NOT NULL,
      checkpoint_index integer NOT NULL,
      checkpoint_label text,
      checkpoint_date_iso text,
      locked boolean NOT NULL DEFAULT false,
      roundel_green boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT project_frontpage_checkpoint_recall_company_project_checkpoint_unique UNIQUE (company_id, project_key, checkpoint_index)
    );
  `;
  try {
    await db.query(schemaSql);
  } catch (err) {
    console.error('[local-db-server] schema initialization warning:', err.message);
  }
};

const safeText = (value) => String(value ?? '').trim();

const poolQuery = async (sql, params = []) => {
  await ensureDbConnected();
  return db.query(sql, params);
};

const ensureCompanyExists = async (companyId) => {
  if (!companyId) return null;

  await poolQuery(
    `INSERT INTO public.companies (id, name, contact_admin_email)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [companyId, `Local Company ${companyId}`, `${companyId}@local.dockpilot`]
  );

  return companyId;
};

const batchUpsertVesselRows = async (companyId, rows = []) => {
  if (!companyId || !Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const inserted = [];
  for (const row of rows) {
    const values = [
      companyId,
      row.vesselId || row.vessel_id || '',
      row.vesselName || row.vessel_name || '',
      row.imo || '',
      row.monthYearOfBuild || row.month_year_of_build || '',
      row.yardOfBuild || row.yard_of_build || '',
      row.flag || '',
      row.class || '',
      row.loa ?? null,
      row.lbp ?? null,
      row.breadth ?? null,
      row.depth ?? null,
      row.summerDraught ?? row.summer_draught ?? null,
      row.dwt ?? null,
      row.gt ?? null,
      row.nt ?? null,
      row.gaPlanStatus || row.ga_plan_status || 'Pending',
      row.midshipPlanStatus || row.midship_plan_status || 'Pending',
      row.shellExpPlanStatus || row.shell_exp_plan_status || 'Pending',
      row.dockingPlanStatus || row.docking_plan_status || 'Pending',
      row.pdUtmStatus || row.pd_utm_status || 'Pending',
      row.pdBlrBoroStatus || row.pd_blr_boro_status || 'Pending',
      row.pdLdmStatus || row.pd_ldm_status || 'Pending'
    ];

    const sql = `
      INSERT INTO public.vessel_registry (
        company_id, vessel_id, vessel_name, imo, month_year_of_build, yard_of_build, flag, class,
        loa, lbp, breadth, depth, summer_draught, dwt, gt, nt,
        ga_plan_status, midship_plan_status, shell_exp_plan_status, docking_plan_status,
        pd_utm_status, pd_blr_boro_status, pd_ldm_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      ON CONFLICT (company_id, vessel_id)
      DO UPDATE SET
        vessel_name = EXCLUDED.vessel_name,
        imo = EXCLUDED.imo,
        month_year_of_build = EXCLUDED.month_year_of_build,
        yard_of_build = EXCLUDED.yard_of_build,
        flag = EXCLUDED.flag,
        class = EXCLUDED.class,
        loa = EXCLUDED.loa,
        lbp = EXCLUDED.lbp,
        breadth = EXCLUDED.breadth,
        depth = EXCLUDED.depth,
        summer_draught = EXCLUDED.summer_draught,
        dwt = EXCLUDED.dwt,
        gt = EXCLUDED.gt,
        nt = EXCLUDED.nt,
        ga_plan_status = EXCLUDED.ga_plan_status,
        midship_plan_status = EXCLUDED.midship_plan_status,
        shell_exp_plan_status = EXCLUDED.shell_exp_plan_status,
        docking_plan_status = EXCLUDED.docking_plan_status,
        pd_utm_status = EXCLUDED.pd_utm_status,
        pd_blr_boro_status = EXCLUDED.pd_blr_boro_status,
        pd_ldm_status = EXCLUDED.pd_ldm_status,
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await poolQuery(sql, values);
    inserted.push(result.rows[0]);
  }

  return inserted;
};

const route = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  const companyId = url.searchParams.get('company_id');

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  try {
    if (path === '/health') {
      await ensureDbConnected();
      const result = await poolQuery('SELECT 1 AS ok');
      sendJson(res, 200, { ok: true, db: result.rows[0].ok === 1 });
      return;
    }

    if (path === '/companies' && req.method === 'GET') {
      const result = await poolQuery('SELECT * FROM public.companies ORDER BY created_at DESC');
      sendJson(res, 200, { rows: result.rows });
      return;
    }

    if (path === '/credentials' && req.method === 'GET') {
      const result = await poolQuery('SELECT * FROM public.credentials ORDER BY created_at DESC');
      sendJson(res, 200, { rows: result.rows });
      return;
    }

    if (path === '/vessel-registry' && req.method === 'GET') {
      if (companyId) {
        const result = await poolQuery('SELECT * FROM public.vessel_registry WHERE company_id = $1 ORDER BY updated_at DESC', [companyId]);
        sendJson(res, 200, { rows: result.rows });
        return;
      }
      const result = await poolQuery('SELECT * FROM public.vessel_registry ORDER BY updated_at DESC');
      sendJson(res, 200, { rows: result.rows });
      return;
    }

    if (path === '/fleet-registration' && req.method === 'GET') {
      if (companyId) {
        const result = await poolQuery('SELECT * FROM public.fleet_registration WHERE company_id = $1 ORDER BY updated_at DESC', [companyId]);
        sendJson(res, 200, { rows: result.rows });
        return;
      }
      const result = await poolQuery('SELECT * FROM public.fleet_registration ORDER BY updated_at DESC');
      sendJson(res, 200, { rows: result.rows });
      return;
    }

    if (path === '/dd-job-matrix' && req.method === 'GET') {
      if (companyId) {
        const result = await poolQuery('SELECT * FROM public.dd_job_matrix WHERE company_id = $1 ORDER BY updated_at DESC', [companyId]);
        sendJson(res, 200, { rows: result.rows });
        return;
      }
      const result = await poolQuery('SELECT * FROM public.dd_job_matrix ORDER BY updated_at DESC');
      sendJson(res, 200, { rows: result.rows });
      return;
    }

    if (path === '/project-frontpage-recall' && req.method === 'GET') {
      const projectKey = url.searchParams.get('project_key');
      if (companyId && projectKey) {
        const result = await poolQuery('SELECT * FROM public.project_frontpage_recall WHERE company_id = $1 AND project_key = $2 ORDER BY updated_at DESC', [companyId, projectKey]);
        sendJson(res, 200, { rows: result.rows });
        return;
      }
      if (companyId) {
        const result = await poolQuery('SELECT * FROM public.project_frontpage_recall WHERE company_id = $1 ORDER BY updated_at DESC', [companyId]);
        sendJson(res, 200, { rows: result.rows });
        return;
      }
      const result = await poolQuery('SELECT * FROM public.project_frontpage_recall ORDER BY updated_at DESC');
      sendJson(res, 200, { rows: result.rows });
      return;
    }

    if (path === '/project-frontpage-checkpoint-recall' && req.method === 'GET') {
      const projectKey = url.searchParams.get('project_key');
      if (companyId && projectKey) {
        const result = await poolQuery('SELECT * FROM public.project_frontpage_checkpoint_recall WHERE company_id = $1 AND project_key = $2 ORDER BY checkpoint_index ASC', [companyId, projectKey]);
        sendJson(res, 200, { rows: result.rows });
        return;
      }
      if (projectKey) {
        const result = await poolQuery('SELECT * FROM public.project_frontpage_checkpoint_recall WHERE project_key = $1 ORDER BY checkpoint_index ASC', [projectKey]);
        sendJson(res, 200, { rows: result.rows });
        return;
      }
      if (companyId) {
        const result = await poolQuery('SELECT * FROM public.project_frontpage_checkpoint_recall WHERE company_id = $1 ORDER BY checkpoint_index ASC', [companyId]);
        sendJson(res, 200, { rows: result.rows });
        return;
      }
      const result = await poolQuery('SELECT * FROM public.project_frontpage_checkpoint_recall ORDER BY checkpoint_index ASC');
      sendJson(res, 200, { rows: result.rows });
      return;
    }

    if (path === '/vessel-registry' && req.method === 'POST') {
      const body = await parseBody(req);
      const resolvedCompanyId = body?.company_id || companyId;
      await ensureCompanyExists(resolvedCompanyId);
      const rows = Array.isArray(body?.rows) ? body.rows : [body];
      const result = await batchUpsertVesselRows(resolvedCompanyId, rows);
      sendJson(res, 200, { rows: result });
      return;
    }

    if (path === '/fleet-registration' && req.method === 'POST') {
      const body = await parseBody(req);
      const resolvedCompanyId = body?.company_id || companyId;
      await ensureCompanyExists(resolvedCompanyId);
      const sql = `
        INSERT INTO public.fleet_registration (
          company_id, matrix_key, main_header, sub_header_row_a, sub_header_row_b, row_labels, matrix_data
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (company_id, matrix_key)
        DO UPDATE SET
          main_header = EXCLUDED.main_header,
          sub_header_row_a = EXCLUDED.sub_header_row_a,
          sub_header_row_b = EXCLUDED.sub_header_row_b,
          row_labels = EXCLUDED.row_labels,
          matrix_data = EXCLUDED.matrix_data,
          updated_at = NOW()
        RETURNING *;
      `;

      const result = await poolQuery(sql, [
        resolvedCompanyId,
        body.matrix_key || 'default',
        body.main_header || 'Fleet Registration Matrix',
        JSON.stringify(body.sub_header_row_a || []),
        JSON.stringify(body.sub_header_row_b || []),
        JSON.stringify(body.row_labels || []),
        JSON.stringify(body.matrix_data || [])
      ]);

      sendJson(res, 200, { row: result.rows[0] });
      return;
    }

    if (path === '/dd-job-matrix' && req.method === 'POST') {
      const body = await parseBody(req);
      const resolvedCompanyId = body?.company_id || companyId;
      await ensureCompanyExists(resolvedCompanyId);
      const sql = `
        INSERT INTO public.dd_job_matrix (
          company_id, matrix_key, matrix_header, matrix_rows
        ) VALUES ($1,$2,$3,$4)
        ON CONFLICT (company_id, matrix_key)
        DO UPDATE SET
          matrix_header = EXCLUDED.matrix_header,
          matrix_rows = EXCLUDED.matrix_rows,
          updated_at = NOW()
        RETURNING *;
      `;

      const result = await poolQuery(sql, [
        resolvedCompanyId,
        body.matrix_key || 'default',
        JSON.stringify(Array.isArray(body.matrix_header) ? body.matrix_header : []),
        JSON.stringify(Array.isArray(body.matrix_rows) ? body.matrix_rows : [])
      ]);

      sendJson(res, 200, { row: result.rows[0] });
      return;
    }

    if (path === '/project-frontpage-recall' && req.method === 'POST') {
      const body = await parseBody(req);
      const resolvedCompanyId = body?.company_id || companyId;
      await ensureCompanyExists(resolvedCompanyId);
      const sql = `
        INSERT INTO public.project_frontpage_recall (
          company_id, project_key, launch_date, vessel_id, vessel_name, imo,
          docking_criteria, cap_survey, est_release_date,
          loceta_1_label, loceta_1_date, loceta_2_label, loceta_2_date,
          loceta_3_label, loceta_3_date
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (company_id, project_key)
        DO UPDATE SET
          launch_date = EXCLUDED.launch_date,
          vessel_id = EXCLUDED.vessel_id,
          vessel_name = EXCLUDED.vessel_name,
          imo = EXCLUDED.imo,
          docking_criteria = EXCLUDED.docking_criteria,
          cap_survey = EXCLUDED.cap_survey,
          est_release_date = EXCLUDED.est_release_date,
          loceta_1_label = EXCLUDED.loceta_1_label,
          loceta_1_date = EXCLUDED.loceta_1_date,
          loceta_2_label = EXCLUDED.loceta_2_label,
          loceta_2_date = EXCLUDED.loceta_2_date,
          loceta_3_label = EXCLUDED.loceta_3_label,
          loceta_3_date = EXCLUDED.loceta_3_date,
          updated_at = NOW()
        RETURNING *;
      `;

      const result = await poolQuery(sql, [
        resolvedCompanyId,
        body.project_key || '',
        body.launch_date || null,
        body.vessel_id || null,
        body.vessel_name || null,
        body.imo || null,
        body.docking_criteria || null,
        body.cap_survey || null,
        body.est_release_date || null,
        body.loceta_1_label || null,
        body.loceta_1_date || null,
        body.loceta_2_label || null,
        body.loceta_2_date || null,
        body.loceta_3_label || null,
        body.loceta_3_date || null
      ]);

      sendJson(res, 200, { row: result.rows[0] });
      return;
    }

    if (path === '/project-frontpage-checkpoint-recall' && req.method === 'POST') {
      const body = await parseBody(req);
      const rows = Array.isArray(body?.rows) ? body.rows : (body ? [body] : []);
      const saved = [];
      for (const row of rows) {
        const resolvedCompanyId = row?.company_id || body?.company_id || companyId;
        await ensureCompanyExists(resolvedCompanyId);
        const sql = `
          INSERT INTO public.project_frontpage_checkpoint_recall (
            company_id, project_key, checkpoint_index, checkpoint_label, checkpoint_date_iso, locked, roundel_green
          ) VALUES ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT (company_id, project_key, checkpoint_index)
          DO UPDATE SET
            checkpoint_label = EXCLUDED.checkpoint_label,
            checkpoint_date_iso = EXCLUDED.checkpoint_date_iso,
            locked = EXCLUDED.locked,
            roundel_green = EXCLUDED.roundel_green,
            updated_at = NOW()
          RETURNING *;
        `;

        const result = await poolQuery(sql, [
          resolvedCompanyId,
          row.project_key || body.project_key || '',
          Number(row.checkpoint_index ?? 0),
          row.checkpoint_label || null,
          row.checkpoint_date_iso || null,
          Boolean(row.locked),
          Boolean(row.roundel_green)
        ]);
        saved.push(result.rows[0]);
      }

      sendJson(res, 200, { rows: saved });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('[local-db-server]', error);
    sendJson(res, 500, { error: error.message || 'Internal server error' });
  }
};

const server = http.createServer(route);
server.listen(PORT, () => {
  console.log(`Local PostgreSQL API listening on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await db.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await db.end();
  process.exit(0);
});
