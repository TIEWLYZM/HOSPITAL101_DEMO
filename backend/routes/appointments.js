// backend/routes/appointments.js
import { Router } from "express";
import { withConn } from "../db.js";
import { randomUUID } from "crypto";
const r = Router();

function addMinutesHHMM(hhmm, minutes) {
  if (!hhmm) return null;
  const [H, M] = hhmm.split(":").map(Number);
  const base = new Date(2000, 0, 1, H, M);
  const end = new Date(base.getTime() + minutes * 60000);
  const hh = String(end.getHours()).padStart(2, "0");
  const mm = String(end.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const FINAL_STATUS = new Set(["S002", "S003"]); // Completed, Cancelled
const CONFIRM_STATUS = "S004"; // Confirmed

// สร้างใบนัด
r.post("/", async (req, res) => {
  const {
    patient_id, doctor_id, department_id, room_id, type_id,
    appointment_date, time_start, duration_min = 0, notes, room_no
  } = req.body;

  // ✅ กันข้อมูลหาย (จะได้ไม่ NULL ไปชน constraint)
  const missing = [];
  if (!patient_id) missing.push("patient_id");
  if (!doctor_id) missing.push("doctor_id");
  if (!department_id) missing.push("department_id");
  if (!type_id) missing.push("type_id");
  if (!appointment_date) missing.push("appointment_date");
  if (!time_start) missing.push("time_start");
  if (missing.length) {
    return res.status(400).json({ ok: false, message: "ข้อมูลไม่ครบ", missing });
  }

  try {
    const result = await withConn(async (conn) => {
      // ดึง default duration จากประเภทนัด
      const t = await conn.execute(
        `SELECT default_duration_min FROM appointment_types WHERE type_id = :tid`,
        { tid: type_id },
        { outFormat: 4002 }
      );
      if (t.rows.length === 0) throw new Error("invalid type_id");

      const defDur = Number(t.rows[0].DEFAULT_DURATION_MIN);
      const totalDur = defDur + Number(duration_min || 0);
      const time_end = time_start ? addMinutesHHMM(time_start, totalDur) : null;

      const appointment_id = randomUUID();

      // บันทึกใบนัด
      await conn.execute(
        `INSERT INTO appointments (
           appointment_id, patient_id, doctor_id, department_id, room_id, type_id, status_id,
           appointment_date, time_start, time_end, duration_min, notes, room_no, created_by
         ) VALUES (
           :id, :pid, :did, :dept, :rid, :tid, 'S001',
           TO_DATE(:adate,'YYYY-MM-DD'), :tstart, :tend, :dur, :notes, :roomno, :created_by
         )`,
        {
          id: appointment_id, pid: patient_id, did: doctor_id, dept: department_id, rid: room_id || null, tid: type_id,
          adate: appointment_date, tstart: time_start, tend: time_end, dur: totalDur,
          notes: notes || null, roomno: room_no || null, created_by: doctor_id
        }
      );

      // ประวัติสถานะเริ่มต้น
      await conn.execute(
        `INSERT INTO appointment_status_history (appointment_id, status_id, changed_by, note)
         VALUES (:id, 'S001', :changed_by, 'Created')`,
        { id: appointment_id, changed_by: doctor_id }
      );

      await conn.commit();
      return { appointment_id, time_end, totalDur };
    });

    res.json({ ok: true, message: "บันทึกสำเร็จ", data: result });
  } catch (err) {
    res.status(400).json({ ok: false, message: "บันทึกล้มเหลว", error: String(err.message || err) });
  }
});

// เปลี่ยนสถานะใบนัด
r.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { new_status_id, changed_by, cancel_reason } = req.body;

  if (!new_status_id) {
    return res.status(400).json({ ok: false, message: "ต้องระบุ new_status_id" });
  }

  try {
    const out = await withConn(async (conn) => {
      const cur = await conn.execute(
        `SELECT status_id, time_start, time_end, duration_min, type_id
           FROM appointments WHERE appointment_id = :id`,
        { id }, { outFormat: 4002 }
      );
      if (cur.rows.length === 0) throw new Error("ไม่พบใบนัด");
      const curr = cur.rows[0];
      if (FINAL_STATUS.has(curr.STATUS_ID)) {
        throw new Error("นัดนี้ถูกปิดแล้ว (Completed/Cancelled) แก้ไขไม่ได้");
      }

      let time_end = curr.TIME_END;

      // ถ้า Confirm ครั้งแรกและยังไม่มี time_end ให้คำนวณให้
      if (new_status_id === CONFIRM_STATUS && !time_end && curr.TIME_START) {
        const t = await conn.execute(
          `SELECT default_duration_min FROM appointment_types WHERE type_id=:tid`,
          { tid: curr.TYPE_ID }, { outFormat: 4002 }
        );
        const defDur = Number(t.rows[0].DEFAULT_DURATION_MIN);
        const totalDur = defDur + Number(curr.DURATION_MIN || 0);
        time_end = addMinutesHHMM(curr.TIME_START, totalDur);

        await conn.execute(
          `UPDATE appointments SET time_end=:tend WHERE appointment_id=:id`,
          { tend: time_end, id }
        );
      }

      // อัปเดตสถานะ (บันทึกเหตุผลยกเลิกเฉพาะ Cancel)
      await conn.execute(
        `UPDATE appointments
            SET status_id=:st,
                cancel_reason=:cr
          WHERE appointment_id=:id`,
        { st: new_status_id, cr: new_status_id === "S003" ? (cancel_reason || "") : null, id }
      );

      // ประวัติสถานะ
      await conn.execute(
        `INSERT INTO appointment_status_history (appointment_id, status_id, changed_by, note)
         VALUES (:id, :st, :changed_by, :note)`,
        { id, st: new_status_id, changed_by: changed_by || null, note: cancel_reason || null }
      );

      await conn.commit();
      return { time_end };
    });

    res.json({ ok: true, message: "อัพเดตสถานะสำเร็จ", data: out });
  } catch (err) {
    res.status(400).json({ ok: false, message: "อัพเดตสถานะล้มเหลว", error: String(err.message || err) });
  }
});

export default r;
