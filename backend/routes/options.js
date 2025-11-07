// backend/routes/options.js
import { Router } from "express";
import { q } from "../db.js";

const r = Router();

r.get("/", async (_req, res) => {
  try {
    const [deps, docs, pats, rooms, types, statuses] = await Promise.all([
      q(`SELECT department_id, dept_name
           FROM departments
           ORDER BY dept_name`),

      // มี department_id อยู่แล้ว
      q(`SELECT doctor_id, full_name, department_id
           FROM doctors
           ORDER BY full_name`),

      // กัน null และ trim ช่องว่างเล็กน้อย
      q(`SELECT patient_id,
                TRIM(NVL(first_name,'')||' '||NVL(last_name,'')) AS full_name
           FROM patients
           ORDER BY first_name, last_name`),

      // ✅ ดึงจากวิว rooms_by_department เพื่อให้มี department_id แน่นอน
      q(`SELECT room_id, room_name, department_id
           FROM rooms_by_department
           ORDER BY room_name`),

      q(`SELECT type_id, type_name, default_duration_min
           FROM appointment_types
           ORDER BY type_name`),

      q(`SELECT status_id, status_name
           FROM appointment_statuses
           ORDER BY sort_order`)
    ]);

    res.json({
      departments: deps.rows,
      doctors: docs.rows,
      patients: pats.rows,
      rooms: rooms.rows,         // ตอนนี้ rooms มี department_id แล้ว
      types: types.rows,
      statuses: statuses.rows
    });
  } catch (e) {
    console.error("OPTIONS ERR:", e);
    res.status(500).json({ ok:false, message: e.message });
  }
});

export default r;
