import { Router } from "express";
import { withConn } from "../db.js";

const r = Router();

function normalize(result) {
  // คืนเป็น array ของ object เสมอ (รองรับ oracledb)
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.rows) && Array.isArray(result.metaData)) {
    const cols = result.metaData.map(m => (m.name?.toLowerCase?.() ?? String(m.name)));
    return result.rows.map(row => {
      const o = {};
      row.forEach((v, i) => (o[cols[i]] = v));
      return o;
    });
  }
  if (Array.isArray(result.rows)) return result.rows;
  return result;
}

// ---- Department related ----
r.get("/department-doctor-counts", async (_req, res) => {
  try {
    const sql = `
      SELECT department_id, dept_name, total_doctors
      FROM department_doctor_counts
      ORDER BY total_doctors DESC, dept_name ASC`;
    const out = await withConn(async (c) => c.execute(sql));
    res.json(normalize(out));
  } catch (e) {
    res.status(500).json({ ok:false, message:"query failed", error:String(e) });
  }
});

r.get("/department-patient-counts", async (_req, res) => {
  try {
    const sql = `
      SELECT department_id, dept_name, total_patients
      FROM department_patient_counts
      ORDER BY total_patients DESC, dept_name ASC`;
    const out = await withConn(async (c) => c.execute(sql));
    res.json(normalize(out));
  } catch (e) {
    res.status(500).json({ ok:false, message:"query failed", error:String(e) });
  }
});

r.get("/department-most-doctors", async (_req, res) => {
  try {
    const sql = `
      SELECT department_id, dept_name, total_doctors
      FROM department_doctor_counts
      ORDER BY total_doctors DESC, dept_name ASC`;
    const out = await withConn(async (c) => c.execute(sql));
    res.json(normalize(out));
  } catch (e) {
    res.status(500).json({ ok:false, message:"query failed", error:String(e) });
  }
});

r.get("/department-most-patients", async (_req, res) => {
  try {
    const sql = `
      SELECT department_id, dept_name, total_patients
      FROM department_patient_counts
      ORDER BY total_patients DESC, dept_name ASC`;
    const out = await withConn(async (c) => c.execute(sql));
    res.json(normalize(out));
  } catch (e) {
    res.status(500).json({ ok:false, message:"query failed", error:String(e) });
  }
});

// ---- Simple view pass-throughs (ชื่อแบบขีดกลาง) ----
r.get("/rooms-by-department", async (_req, res) => {
  try {
    const sql = `
      SELECT department_id, dept_name, room_id, room_name, location_desc
      FROM rooms_by_department
      ORDER BY dept_name, room_name`;
    const out = await withConn(async (c) => c.execute(sql));
    res.json(normalize(out));
  } catch (e) {
    res.status(500).json({ ok:false, message:"query failed", error:String(e) });
  }
});

r.get("/doctors-by-department", async (_req, res) => {
  try {
    const sql = `
      SELECT department_id, dept_name, doctor_id, doctor_name, specialty
      FROM doctors_by_department
      ORDER BY dept_name, doctor_name`;
    const out = await withConn(async (c) => c.execute(sql));
    res.json(normalize(out));
  } catch (e) {
    res.status(500).json({ ok:false, message:"query failed", error:String(e) });
  }
});

r.get("/patients-appointments-by-department", async (_req, res) => {
  try {
    const sql = `
      SELECT department_id, dept_name, appointment_id, appointment_date, time_start, time_end, patient_id, patient_name
      FROM patients_appointments_by_department
      ORDER BY dept_name, appointment_date DESC, time_start DESC`;
    const out = await withConn(async (c) => c.execute(sql));
    res.json(normalize(out));
  } catch (e) {
    res.status(500).json({ ok:false, message:"query failed", error:String(e) });
  }
});

r.get("/patients-by-doctor-name", async (_req, res) => {
  try {
    const sql = `
      SELECT doctor_id, doctor_name, appointment_id, appointment_date, time_start, time_end, patient_id, patient_name
      FROM patients_by_doctor_name
      ORDER BY doctor_name, appointment_date DESC, time_start DESC`;
    const out = await withConn(async (c) => c.execute(sql));
    res.json(normalize(out));
  } catch (e) {
    res.status(500).json({ ok:false, message:"query failed", error:String(e) });
  }
});

r.get("/appointment-status-history", async (_req, res) => {
  try {
    const sql = `
      SELECT history_id, appointment_id, status_id, status_name, changed_by, changed_at, note
      FROM appointment_status_history_view
      ORDER BY changed_at DESC`;
    const out = await withConn(async (c) => c.execute(sql));
    res.json(normalize(out));
  } catch (e) {
    res.status(500).json({ ok:false, message:"query failed", error:String(e) });
  }
});

r.get("/appointments-completed", async (_req, res) => {
  try {
    const sql = `
      SELECT appointment_id, appointment_date, time_start, time_end, doctor_name, patient_name, dept_name, room_name
      FROM appointments_completed
      ORDER BY appointment_date DESC, time_start DESC`;
    const out = await withConn(async (c) => c.execute(sql));
    res.json(normalize(out));
  } catch (e) {
    res.status(500).json({ ok:false, message:"query failed", error:String(e) });
  }
});

r.get("/appointments-cancelled", async (_req, res) => {
  try {
    const sql = `
      SELECT appointment_id, appointment_date, time_start, time_end, doctor_name, patient_name, dept_name, room_name, cancel_reason
      FROM appointments_cancelled
      ORDER BY appointment_date DESC, time_start DESC`;
    const out = await withConn(async (c) => c.execute(sql));
    res.json(normalize(out));
  } catch (e) {
    res.status(500).json({ ok:false, message:"query failed", error:String(e) });
  }
});

/**
 * ---------- NEW: Dynamic view endpoint ----------
 * รองรับ GET /api/views/:view (ชื่อวิวแบบขีดล่าง)
 * ใช้ allow-list เพื่อความปลอดภัย
 * วาง route นี้ไว้ "ท้ายไฟล์" เพื่อไม่บัง route เฉพาะทางด้านบน
 */
const ALLOWED_VIEWS = new Set([
  "rooms_by_department",
  "doctors_by_department",
  "patients_appointments_by_department",
  "patients_by_doctor_name",
  "appointment_status_history_view",
  "department_doctor_counts",
  "department_patient_counts",
  "department_with_most_doctors",
  "department_with_most_patients",
  "appointments_completed",
  "appointments_cancelled",
]);

r.get("/:view", async (req, res) => {
  try {
    const view = String(req.params.view || "").trim();
    if (!ALLOWED_VIEWS.has(view)) {
      return res.status(404).json({ ok:false, message:`Unknown view: ${view}` });
    }
    const sql = `SELECT * FROM ${view}`;
    const out = await withConn(async (c) => c.execute(sql));
    res.json(normalize(out));
  } catch (e) {
    res.status(500).json({ ok:false, message:"query failed", error:String(e) });
  }
});

export default r;
