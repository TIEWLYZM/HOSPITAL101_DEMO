import { Router } from "express";
import { q } from "../db.js";
const r = Router();

r.get("/", async (_req, res) => {
  const [pat, doc, appt, next2h, grp] = await Promise.all([
    q(`SELECT COUNT(*) c FROM patients`),
    q(`SELECT COUNT(*) c FROM doctors`),
    q(`SELECT COUNT(*) c FROM appointments`),
    q(
      `SELECT COUNT(*) c
         FROM appointments
        WHERE appointment_date = TRUNC(SYSDATE)
          AND time_start IS NOT NULL
          AND TO_DATE(appointment_date||' '||time_start,'YYYY-MM-DD HH24:MI')
              BETWEEN SYSTIMESTAMP AND (SYSTIMESTAMP + INTERVAL '2' HOUR)`
    ),
    q(
      `SELECT s.status_name, COUNT(*) c
         FROM appointments a JOIN appointment_statuses s ON s.status_id=a.status_id
        GROUP BY s.status_name`
    )
  ]);

  const total = Number(appt.rows[0].C || 0);
  const byStatus = Object.fromEntries(grp.rows.map(r => [r.STATUS_NAME, Number(r.C)]));
  const pct = total > 0 ? {
    complete: Math.round(((byStatus.Completed || 0) / total) * 100),
    cancel: Math.round(((byStatus.Cancelled || 0) / total) * 100)
  } : { complete: 0, cancel: 0 };

  res.json({
    patients: Number(pat.rows[0].C || 0),
    doctors: Number(doc.rows[0].C || 0),
    appointments: total,
    upcoming_2h: Number(next2h.rows[0].C || 0),
    percent_complete: pct.complete,
    percent_cancel: pct.cancel
  });
});

export default r;
