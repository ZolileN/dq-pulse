-- Aurum DQA Monitoring Platform schema
-- Rate indicators are NEVER stored; rollup views only sum counts.

CREATE TABLE IF NOT EXISTS facilities (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  district text,
  sub_district text
);

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('dqm', 'merl_officer')),
  password_hash text NOT NULL
);

CREATE TABLE IF NOT EXISTS entries (
  id bigserial PRIMARY KEY,
  facility_id int NOT NULL REFERENCES facilities(id),
  period_date date NOT NULL,
  data_type text NOT NULL,
  age_group text NOT NULL,
  indicator text NOT NULL,
  source text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('before', 'after')),
  value numeric NOT NULL,
  entry_method text NOT NULL CHECK (entry_method IN ('web_form', 'excel_upload', 'correction')),
  is_correction boolean NOT NULL DEFAULT false,
  correction_of_period_date date,
  captured_by int REFERENCES users(id),
  captured_at timestamptz NOT NULL DEFAULT now(),
  comments text
);

CREATE INDEX IF NOT EXISTS entries_facility_period_idx ON entries (facility_id, period_date);

CREATE TABLE IF NOT EXISTS facility_month_status (
  facility_id int NOT NULL REFERENCES facilities(id),
  period_date date NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed_locked', 'exported')),
  locked_by int REFERENCES users(id),
  locked_at timestamptz,
  activity text,
  tb_type text,
  staff_name text,
  date_of_visit date,
  authority text,
  mismatches jsonb DEFAULT '[]'::jsonb,
  PRIMARY KEY (facility_id, period_date)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  entity text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  performed_by int REFERENCES users(id),
  performed_at timestamptz NOT NULL DEFAULT now(),
  detail jsonb
);

-- Rollup views: always sum from entries; never from each other.
CREATE OR REPLACE VIEW v_monthly AS
SELECT facility_id,
       date_trunc('month', period_date)::date AS period,
       data_type, age_group, indicator, source, stage,
       sum(value) AS value
FROM entries
GROUP BY 1, 2, 3, 4, 5, 6, 7;

CREATE OR REPLACE VIEW v_quarterly AS
SELECT facility_id,
       date_trunc('quarter', period_date)::date AS period,
       data_type, age_group, indicator, source, stage,
       sum(value) AS value
FROM entries
GROUP BY 1, 2, 3, 4, 5, 6, 7;

CREATE OR REPLACE VIEW v_yearly AS
SELECT facility_id,
       date_trunc('year', period_date)::date AS period,
       data_type, age_group, indicator, source, stage,
       sum(value) AS value
FROM entries
GROUP BY 1, 2, 3, 4, 5, 6, 7;
