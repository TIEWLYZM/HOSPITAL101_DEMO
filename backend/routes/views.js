// backend/routes/views.js (patched)
import { Router } from "express";
import { q } from "../db.js";

const r = Router();

const VIEW_CONFIG = {
  rooms_by_department: {
    view: "rooms_by_department",
    filters: { department_id: "DEPARTMENT_ID" },
  },
  doctors_by_department: {
    view: "doctors_by_department",
    filters: { department_id: "DEPARTMENT_ID" },
  },
  patients_appointments_by_department: {
    view: "patients_appointments_by_department",
    filters: { department_id: "DEPARTMENT_ID" },
  },
  patients_by_doctor_name: {
    view: "patients_by_doctor_name",
    filters: { doctor_id: "DOCTOR_ID" },
  },
  appointment_status_history_view: {
    view: "appointment_status_history_view",
    filters: { appointment_id: "APPOINTMENT_ID", history_id: "HISTORY_ID" },
  },
  doctor_appointments_all_dates: {
    view: "doctor_appointments_all_dates",
    dateFilters: { appointment_date: "APPOINTMENT_DATE" },
  },
  patient_appointment_status: {
    view: "patient_appointment_status",
    filters: { patient_id: "PATIENT_ID" },
  },
  room_schedule: {
    view: "room_schedule",
    filters: { room_id: "ROOM_ID" },
  },
  appointments_confirmed: {
    view: "appointments_confirmed",
    filters: {},
  },
  appointments_cancelled: {
    view: "appointments_cancelled",
    filters: {},
  },
};

function buildDayRangeBinds(paramName, yyyy_mm_dd) {
  const [Y, M, D] = yyyy_mm_dd.split("-").map(Number);
  // Interpret date in local time (server) then oracledb maps to Oracle DATE correctly
  const start = new Date(Date.UTC(Y, M - 1, D, 0, 0, 0, 0));
  const end = new Date(Date.UTC(Y, M - 1, D + 1, 0, 0, 0, 0));
  return {
    where: `${paramName}_COL >= :${paramName}_start AND ${paramName}_COL < :${paramName}_end`,
    binds: {
      [paramName + "_start"]: start,
      [paramName + "_end"]: end,
    },
  };
}

r.get("/:name", async (req, res) => {
  const { name } = req.params;
  const cfg = VIEW_CONFIG[name];
  if (!cfg) return res.status(400).json({ ok: false, message: "Unknown view" });

  try {
    const whereParts = [];
    const binds = {};

    // equality filters (ids)
    if (cfg.filters) {
      for (const [qp, col] of Object.entries(cfg.filters)) {
        const val = req.query[qp];
        if (val !== undefined && val !== "") {
          whereParts.push(`${col} = :${qp}`);
          binds[qp] = val;
        }
      }
    }

    // date filters: compare by range to avoid ORA-01861/01843 and timezone issues
    if (cfg.dateFilters) {
      for (const [qp, col] of Object.entries(cfg.dateFilters)) {
        const val = req.query[qp];
        if (val) {
          const range = buildDayRangeBinds(qp, String(val));
          // swap placeholder column name with real column
          whereParts.push(range.where.replace(`${qp}_COL`, col));
          Object.assign(binds, range.binds);
        }
      }
    }

    const sql = `SELECT * FROM ${cfg.view}` + (whereParts.length ? ` WHERE ${whereParts.join(" AND ")}` : "");
    console.log("[views]", name, "SQL:", sql, "BINDS:", binds);

    const result = await q(sql, binds);
    res.json({ ok: true, rows: result.rows });
  } catch (e) {
    console.error("views error:", e);
    res.status(500).json({ ok: false, message: e.message });
  }
});

export default r;
