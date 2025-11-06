import { Router } from "express";
import { q } from "../db.js";
const r = Router();

const ALLOW = new Set([
  "rooms_by_department",
  "doctors_by_department",
  "patients_appointments_by_department",
  "patients_by_doctor_name",
  "appointment_status_history_view",
  "doctor_appointments_all_dates",
  "patient_appointment_status",
  "room_schedule",
  "appointments_confirmed",
  "appointments_cancelled"
]);

r.get("/:view", async (req, res) => {
  const view = (req.params.view || "").toLowerCase();
  if (!ALLOW.has(view)) return res.status(400).json({ ok: false, message: "ไม่อนุญาตหรือไม่มีวิว" });
  const data = await q(`SELECT * FROM ${view} FETCH FIRST 500 ROWS ONLY`);
  res.json({ ok: true, rows: data.rows });
});

export default r;
