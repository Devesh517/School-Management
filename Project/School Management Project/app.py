"""
app.py  –  School Management System Backend
Flask REST API  ·  MySQL + Excel dual-sync
Updated: Added Student Portal, Notices System, Student Credentials
"""

import hashlib
import os
from datetime import date, datetime, timedelta
import excel_utils as xl
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from dotenv import load_dotenv
import db
import excel_utils as xl

load_dotenv()

app = Flask(__name__)
CORS(app, origins="*")


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def ok(data=None, message="success"):
    return jsonify({"status": "success", "message": message, "data": data}), 200

def err(message, code=400):
    return jsonify({"status": "error", "message": message}), code

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def calc_age(dob_str: str) -> int:
    dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
    today = date.today()
    age = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        age -= 1
    return age

def calc_grade(pct: float) -> str:
    if pct >= 90: return "A1"
    if pct >= 80: return "A2"
    if pct >= 70: return "B1"
    if pct >= 60: return "B2"
    if pct >= 50: return "C"
    if pct >= 40: return "D"
    return "E"

def _serialize(obj):
    """Make date/datetime/timedelta JSON-safe."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, date):
        return obj.isoformat()
    if isinstance(obj, timedelta):
        # MySQL TIME columns come back as timedelta; convert to HH:MM:SS string
        total = int(obj.total_seconds())
        h, rem = divmod(abs(total), 3600)
        m, s   = divmod(rem, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"
    return obj

def serialize_rows(rows):
    if rows is None:
        return None
    if isinstance(rows, dict):
        return {k: _serialize(v) for k, v in rows.items()}
    return [{k: _serialize(v) for k, v in row.items()} for row in rows]


# ─────────────────────────────────────────────────────────────────────────────
# AUTH  (supports admin / teacher / student)
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/login", methods=["POST"])
def login():
    body = request.json or {}
    username = (body.get("username") or "").strip()
    password = (body.get("password") or "").strip()

    if not username or not password:
        return err("Username and password required")

    hashed = hash_pw(password)

    # ── Director / Principal / Administrator login via users table ──
    user = db.query(
        "SELECT * FROM users WHERE username=%s AND password=%s AND role IN ('director','principal','administrator')",
        (username, hashed), fetchone=True,
    )
    if user:
        return ok({
            "name": username.capitalize(),
            "role": user["role"],
            "teacher_id": None,
            "staff_db_id": user.get("staff_db_id"),
            "student_info": None,
        })

    # ── Legacy admin fallback (director username=admin) ──
    if username.lower() == "admin" and password == "admin123":
        return ok({"name": "Admin", "role": "director", "teacher_id": None, "student_info": None})

    # ── Teacher login ──
    teacher = db.query(
        "SELECT teacher_id, name FROM teachers WHERE (LOWER(name)=LOWER(%s) OR email=LOWER(%s)) AND password=%s AND is_removed=0",
        (username, username, hashed), fetchone=True,
    )
    if teacher:
        return ok({
            "name": teacher["name"],
            "role": "teacher",
            "teacher_id": teacher["teacher_id"],
            "student_info": None,
        })

    # ── Student login ──
    suser = db.query(
        "SELECT * FROM users WHERE username=%s AND password=%s AND role='student'",
        (username, hashed), fetchone=True,
    )
    if suser:
        student = db.query(
            """SELECT s.id, s.student_id, s.name,
                      cl.class_name, sc.section_name,
                      s.class_id, s.section_id
               FROM students s
               JOIN classes cl ON cl.id = s.class_id
               JOIN sections sc ON sc.id = s.section_id
               WHERE s.id = %s""",
            (suser["student_db_id"],), fetchone=True,
        )
        if student:
            return ok({
                "name": student["name"],
                "role": "student",
                "teacher_id": None,
                "student_info": {
                    "student_id":    student["student_id"],
                    "student_db_id": student["id"],
                    "class_name":    student["class_name"],
                    "section_name":  student["section_name"],
                    "class_id":      student["class_id"],
                    "section_id":    student["section_id"],
                },
            })

    return err("Invalid credentials. Access denied.", 401)


# ─────────────────────────────────────────────────────────────────────────────
# STUDENT CREDENTIALS  (admin only)
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/student-credentials", methods=["POST"])
def create_student_credentials():
    """Admin creates login username/password for a student."""
    body       = request.json or {}
    student_db_id = body.get("student_db_id")
    username   = (body.get("username") or "").strip()
    password   = (body.get("password") or "").strip()

    if not all([student_db_id, username, password]):
        return err("student_db_id, username and password are required")

    # Check student exists
    student = db.query(
        "SELECT id, name FROM students WHERE id=%s", (student_db_id,), fetchone=True
    )
    if not student:
        return err("Student not found")

    # Check username not taken
    existing = db.query("SELECT id FROM users WHERE username=%s", (username,), fetchone=True)
    if existing:
        return err("Username already taken. Choose another.")

    db.query(
        """INSERT INTO users (username, password, role, student_db_id)
           VALUES (%s, %s, 'student', %s)""",
        (username, hash_pw(password), student_db_id),
        commit=True,
    )
    return ok({"username": username}, f"Login created for {student['name']}")


@app.route("/api/student-credentials/<int:student_db_id>", methods=["PUT"])
def update_student_credentials(student_db_id):
    """Admin resets a student's password."""
    body     = request.json or {}
    password = (body.get("password") or "").strip()
    username = (body.get("username") or "").strip()

    if not password:
        return err("New password required")

    user = db.query(
        "SELECT id FROM users WHERE student_db_id=%s AND role='student'",
        (student_db_id,), fetchone=True
    )
    if not user:
        return err("No login found for this student")

    updates = {"password": hash_pw(password)}
    if username:
        updates["username"] = username

    set_clause = ", ".join(f"{k}=%s" for k in updates)
    values = list(updates.values()) + [user["id"]]
    db.query(f"UPDATE users SET {set_clause} WHERE id=%s", values, commit=True)
    return ok(message="Credentials updated")


@app.route("/api/student-credentials/<int:student_db_id>", methods=["GET"])
def get_student_credentials(student_db_id):
    """Check if a student has login credentials (returns username only)."""
    user = db.query(
        "SELECT username FROM users WHERE student_db_id=%s AND role='student'",
        (student_db_id,), fetchone=True
    )
    if user:
        return ok({"has_login": True, "username": user["username"]})
    return ok({"has_login": False, "username": None})


# ─────────────────────────────────────────────────────────────────────────────
# STUDENT PORTAL — marks, exams, report card (student-facing)
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/student/my-marks", methods=["GET"])
def student_my_marks():
    """Return all marks for the logged-in student across all exams."""
    student_db_id = request.args.get("student_db_id")
    if not student_db_id:
        return err("student_db_id required")

    student = db.query(
        "SELECT id, name, class_id, section_id FROM students WHERE id=%s",
        (student_db_id,), fetchone=True
    )
    if not student:
        return err("Student not found", 404)

    exams = db.query(
        "SELECT id, exam_name, exam_date, max_marks FROM exams WHERE class_id=%s AND section_id=%s ORDER BY exam_date",
        (student["class_id"], student["section_id"])
    )

    results = []
    for exam in exams:
        marks_rows = db.query("""
            SELECT su.subject_name, m.marks_obtained
            FROM marks m
            JOIN subjects su ON su.id = m.subject_id
            WHERE m.exam_id=%s AND m.student_id=%s
            ORDER BY su.id
        """, (exam["id"], student["id"]))

        if not marks_rows:
            continue

        total     = sum(r["marks_obtained"] for r in marks_rows)
        max_total = exam["max_marks"] * len(marks_rows)
        pct       = round((total / max_total) * 100, 2) if max_total else 0

        results.append({
            "exam_name":  exam["exam_name"],
            "exam_date":  str(exam["exam_date"]) if exam["exam_date"] else None,
            "max_marks":  exam["max_marks"],
            "subjects":   serialize_rows(marks_rows),
            "total":      total,
            "max_total":  max_total,
            "percentage": pct,
            "grade":      calc_grade(pct),
        })

    return ok(results)


@app.route("/api/student/upcoming-exams", methods=["GET"])
def student_upcoming_exams():
    """Return future/all exam timetable for a student's class-section."""
    student_db_id = request.args.get("student_db_id")
    if not student_db_id:
        return err("student_db_id required")

    student = db.query(
        "SELECT class_id, section_id FROM students WHERE id=%s",
        (student_db_id,), fetchone=True
    )
    if not student:
        return err("Student not found", 404)

    rows = db.query("""
        SELECT e.exam_name, su.subject_name,
               e.exam_date, e.start_time, e.end_time, e.max_marks
        FROM exams e
        JOIN subjects su ON su.id = e.subject_id
        WHERE e.class_id=%s AND e.section_id=%s
        ORDER BY e.exam_date, e.start_time
    """, (student["class_id"], student["section_id"]))

    return ok(serialize_rows(rows))


@app.route("/api/student/report-card/<int:student_db_id>", methods=["GET"])
def student_report_card_pdf(student_db_id):
    """Student downloads their own report card PDF."""
    student = db.query(
        """SELECT s.id, s.student_id, s.name,
                  cl.class_name, sc.section_name,
                  s.class_id, s.section_id
           FROM students s
           JOIN classes cl ON cl.id = s.class_id
           JOIN sections sc ON sc.id = s.section_id
           WHERE s.id=%s""",
        (student_db_id,), fetchone=True
    )
    if not student:
        return err("Student not found", 404)

    exams = db.query(
        "SELECT id, exam_name, exam_date, max_marks FROM exams WHERE class_id=%s AND section_id=%s",
        (student["class_id"], student["section_id"])
    )

    exam_results = []
    for exam in exams:
        marks_rows = db.query("""
            SELECT su.subject_name, m.marks_obtained
            FROM marks m
            JOIN subjects su ON su.id = m.subject_id
            WHERE m.exam_id=%s AND m.student_id=%s
        """, (exam["id"], student["id"]))

        if not marks_rows:
            continue

        subjects_list = [{"subject_name": r["subject_name"], "marks_obtained": r["marks_obtained"]} for r in marks_rows]
        total     = sum(r["marks_obtained"] for r in marks_rows)
        max_total = exam["max_marks"] * len(marks_rows)
        pct       = round((total / max_total) * 100, 2) if max_total else 0

        exam_results.append({
            "exam_name":  exam["exam_name"],
            "start_date": str(exam["exam_date"]) if exam["exam_date"] else "",
            "max_marks":  exam["max_marks"],
            "subjects":   subjects_list,
            "total":      total,
            "max_total":  max_total,
            "percentage": pct,
            "grade":      calc_grade(pct),
        })

    if not exam_results:
        return err("No results found yet", 404)

    pdf_path = xl.generate_report_card_pdf(
        student["class_name"], student["section_name"],
        student["student_id"], student["name"],
        exam_results
    )
    return send_file(pdf_path, as_attachment=True)


@app.route("/api/student/timetable-pdf", methods=["GET"])
def student_timetable_pdf():
    """Student downloads exam timetable PDF for their class."""
    student_db_id = request.args.get("student_db_id")
    exam_name     = request.args.get("exam_name")

    if not student_db_id or not exam_name:
        return err("student_db_id and exam_name required")

    student = db.query(
        """SELECT cl.class_name, sc.section_name
           FROM students s
           JOIN classes cl ON cl.id = s.class_id
           JOIN sections sc ON sc.id = s.section_id
           WHERE s.id=%s""",
        (student_db_id,), fetchone=True
    )
    if not student:
        return err("Student not found", 404)

    rows = db.query("""
        SELECT su.subject_name, e.exam_date, e.start_time, e.end_time
        FROM exams e
        JOIN subjects su ON su.id = e.subject_id
        JOIN classes cl ON cl.id = e.class_id
        JOIN sections sc ON sc.id = e.section_id
        WHERE cl.class_name=%s AND sc.section_name=%s AND e.exam_name=%s
        ORDER BY e.exam_date
    """, (student["class_name"], student["section_name"], exam_name))

    if not rows:
        return err("No timetable found", 404)

    pdf_path = xl.generate_exam_timetable_pdf(
        student["class_name"], student["section_name"], exam_name, rows
    )
    return send_file(pdf_path, as_attachment=True)


@app.route("/api/student/attendance", methods=["GET"])
def student_attendance():
    """Return attendance summary for a student."""
    student_db_id = request.args.get("student_db_id")
    if not student_db_id:
        return err("student_db_id required")

    rows = db.query("""
        SELECT date, status FROM attendance
        WHERE student_id=%s
        ORDER BY date DESC
    """, (student_db_id,))

    total   = len(rows)
    present = sum(1 for r in rows if r["status"] == "P")
    absent  = total - present
    pct     = round((present / total) * 100, 1) if total else 0

    return ok({
        "records":  serialize_rows(rows),
        "total":    total,
        "present":  present,
        "absent":   absent,
        "percentage": pct,
    })


# ─────────────────────────────────────────────────────────────────────────────
# NOTICES
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/notices", methods=["GET"])
def get_notices():
    """
    ?target=all|teachers|students|teacher_view|student_view
    teacher_view  → notices for teachers + all
    student_view  → notices for students + all
    """
    target = request.args.get("target", "all").strip()

    if target == "teacher_view":
        rows = db.query(
            "SELECT * FROM notices WHERE target IN ('teachers','all') ORDER BY created_at DESC"
        )
    elif target == "student_view":
        rows = db.query(
            "SELECT * FROM notices WHERE target IN ('students','all') ORDER BY created_at DESC"
        )
    elif target in ("all", "teachers", "students"):
        rows = db.query(
            "SELECT * FROM notices WHERE target=%s ORDER BY created_at DESC",
            (target,)
        )
    else:
        rows = db.query("SELECT * FROM notices ORDER BY created_at DESC")

    return ok(serialize_rows(rows))


@app.route("/api/notices", methods=["POST"])
def create_notice():
    body    = request.json or {}
    title   = (body.get("title") or "").strip()
    content = (body.get("content") or "").strip()
    target  = (body.get("target") or "all").strip()
    created_by = (body.get("created_by") or "admin").strip()

    if not title or not content:
        return err("title and content required")

    if target not in ("teachers", "students", "all"):
        return err("target must be 'teachers', 'students', or 'all'")

    notice_id = db.query(
        "INSERT INTO notices (title, content, target, created_by) VALUES (%s,%s,%s,%s)",
        (title, content, target, created_by),
        commit=True,
    )
    return ok({"notice_id": notice_id}, "Notice posted successfully")


@app.route("/api/notices/<int:notice_id>", methods=["DELETE"])
def delete_notice(notice_id):
    db.query("DELETE FROM notices WHERE id=%s", (notice_id,), commit=True)
    return ok(message="Notice deleted")


# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD STATS
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/stats", methods=["GET"])
def stats():
    total_students = db.query("SELECT COUNT(*) AS c FROM students", fetchone=True)["c"]
    total_teachers = db.query("SELECT COUNT(*) AS c FROM teachers WHERE is_removed=0", fetchone=True)["c"]
    total_classes  = db.query("SELECT COUNT(*) AS c FROM classes WHERE status='Active'", fetchone=True)["c"]
    total_exams    = db.query("SELECT COUNT(*) AS c FROM exams", fetchone=True)["c"]
    return ok({
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes":  total_classes,
        "total_exams":    total_exams,
    })


# ─────────────────────────────────────────────────────────────────────────────
# CLASS MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/classes", methods=["GET"])
def get_classes():
    rows = db.query("""
        SELECT c.id, c.class_name, c.status,
               COUNT(DISTINCT s.id) AS total_sections
        FROM   classes c
        LEFT JOIN sections s ON s.class_id = c.id
        GROUP BY c.id
        ORDER BY c.class_name
    """)
    return ok(serialize_rows(rows))


@app.route("/api/classes", methods=["POST"])
def add_class():
    body = request.json or {}
    class_name   = (body.get("class_name") or "").strip()
    section_name = (body.get("section_name") or "").strip().upper()
    subjects     = body.get("subjects") or []

    if not class_name or not section_name or not subjects:
        return err("class_name, section_name and subjects are required")

    existing = db.query("SELECT id FROM classes WHERE class_name=%s", (class_name,), fetchone=True)
    if existing:
        return err(f"Class {class_name} already exists")

    class_id = db.query("INSERT INTO classes (class_name) VALUES (%s)", (class_name,), commit=True)
    db.query("INSERT INTO sections (class_id, section_name) VALUES (%s,%s)",
             (class_id, section_name), commit=True)

    for subj in subjects:
        subj = subj.strip()
        if subj:
            db.query("INSERT INTO subjects (class_id, subject_name) VALUES (%s,%s)",
                     (class_id, subj), commit=True)

    _sync_class_excel()
    return ok({"class_id": class_id}, "Class created successfully")


@app.route("/api/classes/<int:class_id>/sections", methods=["GET"])
def get_sections(class_id):
    rows = db.query("SELECT id, section_name FROM sections WHERE class_id=%s ORDER BY section_name",
                    (class_id,))
    return ok(serialize_rows(rows))


@app.route("/api/classes/<int:class_id>/sections", methods=["POST"])
def add_section(class_id):
    body = request.json or {}
    section_name = (body.get("section_name") or "").strip().upper()
    if not section_name:
        return err("section_name required")

    existing = db.query(
        "SELECT id FROM sections WHERE class_id=%s AND section_name=%s",
        (class_id, section_name), fetchone=True
    )
    if existing:
        return err("Section already exists")

    db.query("INSERT INTO sections (class_id, section_name) VALUES (%s,%s)",
             (class_id, section_name), commit=True)
    _sync_class_excel()
    return ok(message="Section added")


@app.route("/api/classes/<int:class_id>/subjects", methods=["GET"])
def get_subjects(class_id):
    rows = db.query("SELECT id, subject_name FROM subjects WHERE class_id=%s", (class_id,))
    return ok(serialize_rows(rows))


@app.route("/api/classes/<int:class_id>", methods=["DELETE"])
def remove_class(class_id):
    db.query("UPDATE classes SET status='Inactive' WHERE id=%s", (class_id,), commit=True)
    _sync_class_excel()
    return ok(message="Class marked inactive")


def _sync_class_excel():
    classes = db.query("""
        SELECT c.id, c.class_name, c.status,
               COUNT(DISTINCT s.id) AS total_sections
        FROM   classes c
        LEFT JOIN sections s ON s.class_id = c.id
        GROUP BY c.id
    """)
    xl.sync_class_master(serialize_rows(classes))
    for cls in classes:
        cn = cls["class_name"]
        subjects = db.query("SELECT subject_name FROM subjects WHERE class_id=%s", (cls["id"],))
        xl.sync_subjects(cn, subjects)
        sections = db.query("SELECT id, section_name FROM sections WHERE class_id=%s", (cls["id"],))
        for sec in sections:
            students = db.query("""
                SELECT s.student_id, s.name, s.dob, s.age,
                       s.mother_name, s.father_name, s.address, s.phone, s.aadhar
                FROM students s WHERE s.class_id=%s AND s.section_id=%s
                ORDER BY s.student_id""",
                (cls["id"], sec["id"])
            )
            xl.sync_section_students(cn, sec["section_name"], serialize_rows(students))


# ─────────────────────────────────────────────────────────────────────────────
# STUDENT MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/students", methods=["GET"])
def get_students():
    class_name   = request.args.get("class_name", "").strip()
    section_name = request.args.get("section_name", "").strip().upper()

    if not class_name or not section_name:
        return err("class_name and section_name query params required")

    sec_rows = db.query("""
        SELECT st.id, st.student_id, st.name, st.dob, st.age,
               st.mother_name, st.father_name, st.address, st.phone, st.aadhar
        FROM   students st
        JOIN   sections sc ON sc.id = st.section_id
        JOIN   classes  cl ON cl.id = st.class_id
        WHERE  (cl.class_name=%s OR cl.class_name=UPPER(%s))
          AND  sc.section_name=%s
        ORDER BY st.student_id
    """, (class_name, class_name, section_name))

    return ok(serialize_rows(sec_rows))


@app.route("/api/students", methods=["POST"])
def add_student():
    body = request.json or {}
    class_name   = (body.get("class_name") or "").strip()
    section_name = (body.get("section_name") or "").strip().upper()
    name         = (body.get("name") or "").strip().title()
    dob          = body.get("dob", "")
    phone        = (body.get("phone") or "").strip()
    mother_name  = (body.get("mother_name") or "").strip().title()
    father_name  = (body.get("father_name") or "").strip().title()
    address      = (body.get("address") or "").strip()
    aadhar       = (body.get("aadhar") or "").strip()

    if not class_name or not section_name or not name:
        return err("class_name, section_name and name are required")

    cls = db.query("SELECT id FROM classes WHERE class_name=%s AND status='Active'",
                   (class_name,), fetchone=True)
    if not cls:
        return err(f"Class {class_name} not found or inactive")

    sec = db.query("SELECT id FROM sections WHERE class_id=%s AND section_name=%s",
                   (cls["id"], section_name), fetchone=True)
    if not sec:
        return err(f"Section {section_name} not found")

    result = db.query(
        "SELECT COALESCE(MAX(student_id),0)+1 AS next_id FROM students WHERE section_id=%s",
        (sec["id"],), fetchone=True
    )
    student_id = result["next_id"]
    age = calc_age(dob) if dob else None

    db.query("""
        INSERT INTO students
          (student_id, class_id, section_id, name, dob, age,
           mother_name, father_name, address, phone, aadhar)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (student_id, cls["id"], sec["id"], name, dob or None, age,
          mother_name, father_name, address, phone, aadhar), commit=True)

    _sync_section_excel(cls["id"], class_name, sec["id"], section_name)
    return ok({"student_id": student_id}, "Student added")


@app.route("/api/students/<int:student_db_id>", methods=["PUT"])
def update_student(student_db_id):
    body = request.json or {}
    allowed = {"name", "dob", "address", "phone"}
    updates = {k: v for k, v in body.items() if k in allowed and v}

    if not updates:
        return err("Provide at least one field to update")

    if "dob" in updates:
        updates["age"] = calc_age(updates["dob"])

    set_clause = ", ".join(f"{k}=%s" for k in updates)
    values = list(updates.values()) + [student_db_id]
    db.query(f"UPDATE students SET {set_clause} WHERE id=%s", values, commit=True)

    row = db.query("SELECT class_id, section_id FROM students WHERE id=%s",
                   (student_db_id,), fetchone=True)
    if row:
        cls = db.query("SELECT class_name FROM classes WHERE id=%s", (row["class_id"],), fetchone=True)
        sec = db.query("SELECT section_name FROM sections WHERE id=%s", (row["section_id"],), fetchone=True)
        if cls and sec:
            _sync_section_excel(row["class_id"], cls["class_name"], row["section_id"], sec["section_name"])
    return ok(message="Student updated")


@app.route("/api/students/<int:student_db_id>", methods=["DELETE"])
def remove_student(student_db_id):
    row = db.query("SELECT class_id, section_id FROM students WHERE id=%s",
                   (student_db_id,), fetchone=True)
    # Also remove any login credentials
    db.query("DELETE FROM users WHERE student_db_id=%s AND role='student'",
             (student_db_id,), commit=True)
    db.query("DELETE FROM students WHERE id=%s", (student_db_id,), commit=True)
    if row:
        cls = db.query("SELECT class_name FROM classes WHERE id=%s", (row["class_id"],), fetchone=True)
        sec = db.query("SELECT section_name FROM sections WHERE id=%s", (row["section_id"],), fetchone=True)
        if cls and sec:
            _sync_section_excel(row["class_id"], cls["class_name"], row["section_id"], sec["section_name"])
    return ok(message="Student removed")


def _sync_section_excel(class_id, class_name, section_id, section_name):
    students = db.query("""
        SELECT student_id, name, dob, age, mother_name, father_name,
               address, phone, aadhar
        FROM students WHERE class_id=%s AND section_id=%s ORDER BY student_id
    """, (class_id, section_id))
    xl.sync_section_students(class_name, section_name, serialize_rows(students))


# ─────────────────────────────────────────────────────────────────────────────
# TEACHER MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/teachers", methods=["GET"])
def get_teachers():
    rows = db.query("""
        SELECT id, teacher_id, name, dob, age, phone, email,
               address, aadhar, account_number, bank_name
        FROM teachers WHERE is_removed=0 ORDER BY teacher_id
    """)
    return ok(serialize_rows(rows))


@app.route("/api/teachers", methods=["POST"])
def add_teacher():
    body = request.json or {}
    required = ["name", "password", "dob", "phone", "email",
                "address", "aadhar", "account_number", "bank_name"]
    for f in required:
        if not body.get(f):
            return err(f"Field '{f}' is required")

    phone   = body["phone"].strip()
    email   = body["email"].strip().lower()
    aadhar  = body["aadhar"].strip()
    account = body["account_number"].strip()

    for col, val, label in [
        ("phone", phone, "Phone"),
        ("email", email, "Email"),
        ("aadhar", aadhar, "Aadhar"),
        ("account_number", account, "Account number"),
    ]:
        if db.query(f"SELECT id FROM teachers WHERE {col}=%s AND is_removed=0",
                    (val,), fetchone=True):
            return err(f"{label} already exists")

    result = db.query(
        "SELECT COALESCE(MAX(teacher_id), 1000)+1 AS next_id FROM teachers", fetchone=True
    )
    tid = result["next_id"]
    age = calc_age(body["dob"])

    db.query("""
        INSERT INTO teachers
          (teacher_id, name, password, dob, age, phone, email,
           address, aadhar, account_number, bank_name)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (tid, body["name"].strip().title(), hash_pw(body["password"]),
          body["dob"], age, phone, email,
          body["address"].strip(), aadhar, account,
          body["bank_name"].strip().title()), commit=True)

    _sync_teacher_excel()
    return ok({"teacher_id": tid}, "Teacher added")


@app.route("/api/teachers/<int:tid>", methods=["PUT"])
def update_teacher(tid):
    body = request.json or {}
    allowed = {"name", "phone", "email", "address", "password", "bank_name"}
    updates = {k: v for k, v in body.items() if k in allowed and v}

    if not updates:
        return err("Provide at least one field")

    if "password" in updates:
        updates["password"] = hash_pw(updates["password"])

    set_clause = ", ".join(f"{k}=%s" for k in updates)
    values = list(updates.values()) + [tid]
    db.query(f"UPDATE teachers SET {set_clause} WHERE teacher_id=%s AND is_removed=0",
             values, commit=True)
    _sync_teacher_excel()
    return ok(message="Teacher updated")


@app.route("/api/teachers/<int:tid>", methods=["DELETE"])
def remove_teacher(tid):
    body   = request.json or {}
    reason = body.get("reason", "Not specified")

    teacher = db.query(
        "SELECT name FROM teachers WHERE teacher_id=%s AND is_removed=0", (tid,), fetchone=True
    )
    if not teacher:
        return err("Teacher not found")

    db.query("UPDATE teachers SET is_removed=1 WHERE teacher_id=%s", (tid,), commit=True)
    db.query("""
        INSERT INTO removed_teachers (teacher_id, name, reason, removed_date)
        VALUES (%s,%s,%s,%s)
    """, (tid, teacher["name"], reason, date.today().isoformat()), commit=True)

    _sync_teacher_excel()
    return ok(message="Teacher removed")


def _sync_teacher_excel():
    teachers = db.query("""
        SELECT teacher_id, name, password, dob, age, phone, email,
               address, aadhar, account_number, bank_name
        FROM teachers WHERE is_removed=0 ORDER BY teacher_id
    """)
    xl.sync_teacher_details(serialize_rows(teachers))

    assignments = db.query("""
        SELECT ta.id, t.teacher_id, t.name AS teacher_name,
               cl.class_name, sc.section_name, su.subject_name, ta.role
        FROM teacher_assignments ta
        JOIN teachers t  ON t.id   = ta.teacher_id
        JOIN classes  cl ON cl.id  = ta.class_id
        JOIN sections sc ON sc.id  = ta.section_id
        JOIN subjects su ON su.id  = ta.subject_id
    """)
    xl.sync_teacher_assignments(serialize_rows(assignments))

    removed = db.query("SELECT teacher_id, name, reason, removed_date FROM removed_teachers")
    xl.sync_removed_teachers(serialize_rows(removed))


# ─────────────────────────────────────────────────────────────────────────────
# TEACHER ASSIGNMENTS
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/assignments", methods=["GET"])
def get_assignments():
    teacher_id = request.args.get("teacher_id")
    if teacher_id:
        rows = db.query("""
            SELECT ta.id, t.teacher_id, t.name AS teacher_name,
                   cl.class_name, sc.section_name, su.subject_name, ta.role
            FROM teacher_assignments ta
            JOIN teachers t  ON t.id   = ta.teacher_id
            JOIN classes  cl ON cl.id  = ta.class_id
            JOIN sections sc ON sc.id  = ta.section_id
            JOIN subjects su ON su.id  = ta.subject_id
            WHERE t.teacher_id=%s
        """, (teacher_id,))
    else:
        rows = db.query("""
            SELECT ta.id, t.teacher_id, t.name AS teacher_name,
                   cl.class_name, sc.section_name, su.subject_name, ta.role
            FROM teacher_assignments ta
            JOIN teachers t  ON t.id   = ta.teacher_id
            JOIN classes  cl ON cl.id  = ta.class_id
            JOIN sections sc ON sc.id  = ta.section_id
            JOIN subjects su ON su.id  = ta.subject_id
            ORDER BY cl.class_name, sc.section_name
        """)
    return ok(serialize_rows(rows))


@app.route("/api/assignments", methods=["POST"])
def assign_teacher():
    body = request.json or {}
    teacher_id = body.get("teacher_id")
    class_id   = body.get("class_id")
    section_id = body.get("section_id")
    subject_id = body.get("subject_id")
    role       = body.get("role", "Subject Teacher")

    if not all([teacher_id, class_id, section_id, subject_id]):
        return err("teacher_id, class_id, section_id, subject_id required")

    teacher_db = db.query(
        "SELECT id FROM teachers WHERE teacher_id=%s AND is_removed=0", (teacher_id,), fetchone=True
    )
    if not teacher_db:
        return err("Teacher not found")

    if role == "Class Teacher":
        existing = db.query("""
            SELECT id FROM teacher_assignments
            WHERE class_id=%s AND section_id=%s AND role='Class Teacher'
        """, (class_id, section_id), fetchone=True)
        if existing:
            return err("This class/section already has a Class Teacher")

        existing2 = db.query("""
            SELECT id FROM teacher_assignments
            WHERE teacher_id=%s AND role='Class Teacher'
        """, (teacher_db["id"],), fetchone=True)
        if existing2:
            return err("Teacher is already a Class Teacher of another section")

    db.query("""
        INSERT INTO teacher_assignments
          (teacher_id, class_id, section_id, subject_id, role)
        VALUES (%s,%s,%s,%s,%s)
    """, (teacher_db["id"], class_id, section_id, subject_id, role), commit=True)

    _sync_teacher_excel()
    return ok(message="Teacher assigned successfully")


# ─────────────────────────────────────────────────────────────────────────────
# SALARY MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/salary", methods=["GET"])
def get_salary():
    tid = request.args.get("teacher_id")
    if not tid:
        return err("teacher_id required")
    rows = db.query("""
        SELECT ts.*, t.name
        FROM teacher_salary ts
        JOIN teachers t ON t.id = ts.teacher_id
        WHERE t.teacher_id=%s
        ORDER BY ts.id DESC
    """, (tid,))
    return ok(serialize_rows(rows))


@app.route("/api/salary", methods=["POST"])
def calc_salary():
    body       = request.json or {}
    teacher_id = body.get("teacher_id")
    month      = (body.get("month") or "").strip()

    if not teacher_id or not month:
        return err("teacher_id and month required")

    teacher_db = db.query(
        "SELECT id, name FROM teachers WHERE teacher_id=%s AND is_removed=0",
        (teacher_id,), fetchone=True
    )
    if not teacher_db:
        return err("Teacher not found")

    dup = db.query(
        "SELECT id FROM teacher_salary WHERE teacher_id=%s AND month=%s",
        (teacher_db["id"], month), fetchone=True
    )
    if dup:
        return err(f"Salary for {month} already processed")

    is_ct = db.query("""
        SELECT id FROM teacher_assignments
        WHERE teacher_id=%s AND role='Class Teacher'
    """, (teacher_db["id"],), fetchone=True)

    basic     = 55000 if is_ct else 40000
    incentive = 10000
    gross     = basic + incentive
    pf        = round(basic * 0.12, 2)
    pt        = 200
    tds       = round(gross * 0.05, 2)
    total_ded = round(pf + pt + tds, 2)
    net       = round(gross - total_ded, 2)

    db.query("""
        INSERT INTO teacher_salary
          (teacher_id, month, basic, incentive, gross,
           pf, professional_tax, tds, total_deduction, net_salary)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (teacher_db["id"], month, basic, incentive, gross,
          pf, pt, tds, total_ded, net), commit=True)

    record = {
        "teacher_id": teacher_id, "name": teacher_db["name"],
        "month": month, "basic": basic, "incentive": incentive,
        "gross": gross, "pf": pf, "professional_tax": pt,
        "tds": tds, "total_deduction": total_ded, "net_salary": net,
    }
    xl.sync_salary(teacher_id, teacher_db["name"], [record])
    return ok(record, "Salary calculated")


@app.route("/api/salary/slip/<int:teacher_id>/<path:month>", methods=["GET"])
def salary_slip(teacher_id, month):
    teacher_db = db.query(
        "SELECT id, name FROM teachers WHERE teacher_id=%s", (teacher_id,), fetchone=True
    )
    if not teacher_db:
        return err("Teacher not found", 404)

    record = db.query("""
        SELECT ts.*, t.name, t.teacher_id AS tid
        FROM teacher_salary ts
        JOIN teachers t ON t.id = ts.teacher_id
        WHERE t.teacher_id=%s AND ts.month=%s
    """, (teacher_id, month), fetchone=True)

    if not record:
        return err("Salary record not found", 404)

    rec = serialize_rows(record)
    rec["teacher_id"] = teacher_id
    path = xl.generate_salary_slip_pdf(rec)
    return send_file(path, as_attachment=True)


@app.route("/api/salary/slip/staff/<int:staff_id>/<path:month>", methods=["GET"])
def staff_salary_slip(staff_id, month):
    """Download salary slip PDF for a staff member (administrator/principal)."""
    staff_db = db.query(
        "SELECT id, name, staff_id, role FROM staff WHERE id=%s", (staff_id,), fetchone=True
    )
    if not staff_db:
        return err("Staff member not found", 404)

    record = db.query("""
        SELECT ss.*, s.name, s.staff_id AS sid, s.role
        FROM staff_salary ss
        JOIN staff s ON s.id = ss.staff_id
        WHERE ss.staff_id=%s AND ss.month=%s
    """, (staff_id, month), fetchone=True)

    if not record:
        return err("Salary record not found for this month", 404)

    rec = serialize_rows(record)
    # Reuse the same PDF generator — map fields
    rec["teacher_id"] = f"{staff_db['role'].title()} — {staff_db['staff_id']}"
    path = xl.generate_salary_slip_pdf(rec)
    return send_file(path, as_attachment=True,
                     download_name=f"SalarySlip_{rec['name'].replace(' ','_')}_{month.replace(' ','_')}.pdf")


# ─────────────────────────────────────────────────────────────────────────────
# ATTENDANCE
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/attendance", methods=["GET"])
def get_attendance():
    class_name   = request.args.get("class_name", "").strip()
    section_name = request.args.get("section_name", "").strip().upper()
    att_date     = request.args.get("date", "").strip()

    if not all([class_name, section_name, att_date]):
        return err("class_name, section_name, date required")

    rows = db.query("""
        SELECT st.student_id, st.name,
               COALESCE(a.status, 'Not Marked') AS status
        FROM   students st
        JOIN   sections sc ON sc.id = st.section_id
        JOIN   classes  cl ON cl.id = st.class_id
        LEFT JOIN attendance a ON a.student_id = st.id AND a.date=%s
        WHERE  cl.class_name=%s AND sc.section_name=%s
        ORDER BY st.student_id
    """, (att_date, class_name, section_name))
    return ok(serialize_rows(rows))


@app.route("/api/attendance", methods=["POST"])
def mark_attendance():
    body         = request.json or {}
    class_name   = (body.get("class_name") or "").strip()
    section_name = (body.get("section_name") or "").strip().upper()
    att_date     = body.get("date", "")
    records      = body.get("records") or []

    if not class_name or not section_name or not att_date or not records:
        return err("class_name, section_name, date, records required")

    cls = db.query("SELECT id FROM classes WHERE class_name=%s", (class_name,), fetchone=True)
    sec = db.query("SELECT id FROM sections WHERE class_id=%s AND section_name=%s",
                   (cls["id"] if cls else 0, section_name), fetchone=True)

    if not cls or not sec:
        return err("Class or section not found")

    for rec in records:
        student_db = db.query(
            "SELECT id FROM students WHERE student_id=%s AND class_id=%s AND section_id=%s",
            (rec["student_id"], cls["id"], sec["id"]), fetchone=True
        )
        if not student_db:
            continue
        db.query("""
            INSERT INTO attendance (student_id, class_id, section_id, date, status)
            VALUES (%s,%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE status=%s
        """, (student_db["id"], cls["id"], sec["id"], att_date,
              rec["status"], rec["status"]), commit=True)

    xl.sync_attendance(class_name, section_name, att_date, records)
    return ok(message="Attendance saved")


# ─────────────────────────────────────────────────────────────────────────────
# EXAMS & MARKS
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/exams", methods=["GET"])
def get_exams():
    class_name   = request.args.get("class_name", "").strip()
    section_name = request.args.get("section_name", "").strip().upper()

    rows = db.query("""
        SELECT e.id, e.exam_name, e.exam_date, e.max_marks,
               e.subject_id, su.subject_name, cl.class_name, sc.section_name
        FROM exams e
        JOIN classes  cl ON cl.id = e.class_id
        JOIN sections sc ON sc.id = e.section_id
        JOIN subjects su ON su.id = e.subject_id
        WHERE cl.class_name=%s AND sc.section_name=%s
        ORDER BY e.exam_date
    """, (class_name, section_name))
    return ok(serialize_rows(rows))


@app.route("/api/exams/timetable", methods=["POST"])
def create_exam_timetable():
    body         = request.json or {}
    teacher_id   = body.get("teacher_id")
    exam_name    = body.get("exam_name")
    class_name   = body.get("class_name")
    section_name = body.get("section_name")
    subjects     = body.get("subjects") or []

    # For principal/director, teacher_id may be null — only subjects/class/section/exam_name required
    sender_role = body.get("sender_role", "")
    is_privileged = sender_role in ("principal", "director", "administrator")

    if is_privileged:
        if not all([exam_name, class_name, section_name, subjects]):
            return err("exam_name, class_name, section_name and subjects are required")
    else:
        if not all([teacher_id, exam_name, class_name, section_name, subjects]):
            return err("All fields required")

    cls = db.query("SELECT id FROM classes WHERE class_name=%s", (class_name,), fetchone=True)
    if not cls:
        return err("Class not found")

    sec = db.query("SELECT id FROM sections WHERE class_id=%s AND section_name=%s",
                   (cls["id"], section_name), fetchone=True)
    if not sec:
        return err("Section not found")

    if not is_privileged:
        teacher = db.query("SELECT id FROM teachers WHERE teacher_id=%s", (teacher_id,), fetchone=True)
        if not teacher:
            return err("Teacher not found")

        assignment = db.query("""
            SELECT id FROM teacher_assignments
            WHERE teacher_id=%s AND class_id=%s AND section_id=%s AND role='Class Teacher'
        """, (teacher["id"], cls["id"], sec["id"]), fetchone=True)

        if not assignment:
            return err("Only assigned class teacher can create timetable", 403)

    for sub in subjects:
        subject_name = sub.get("subject_name")
        exam_date    = sub.get("exam_date")
        start_time   = sub.get("start_time")
        end_time     = sub.get("end_time")
        max_marks    = sub.get("max_marks", 100)

        subject = db.query("""
            SELECT id FROM subjects
            WHERE class_id=%s AND LOWER(subject_name)=LOWER(%s)
        """, (cls["id"], subject_name), fetchone=True)

        if not subject:
            return err(f"Subject '{subject_name}' not found")

        created_by = teacher["id"] if not is_privileged else None

        db.query("""
            INSERT INTO exams
              (class_id, section_id, subject_id, exam_name,
               exam_date, start_time, end_time, max_marks, created_by_teacher)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (cls["id"], sec["id"], subject["id"], exam_name,
              exam_date, start_time, end_time, max_marks, created_by), commit=True)

    return ok(message="Exam timetable created successfully")


@app.route("/api/exams/timetable/pdf", methods=["GET"])
def generate_exam_timetable_pdf_route():
    class_name   = request.args.get("class_name")
    section_name = request.args.get("section_name")
    exam_name    = request.args.get("exam_name")

    if not all([class_name, section_name, exam_name]):
        return err("Missing parameters")

    rows = db.query("""
        SELECT su.subject_name, e.exam_date, e.start_time, e.end_time
        FROM exams e
        JOIN subjects su ON su.id = e.subject_id
        JOIN classes  cl ON cl.id = e.class_id
        JOIN sections sc ON sc.id = e.section_id
        WHERE cl.class_name=%s AND sc.section_name=%s AND e.exam_name=%s
        ORDER BY e.exam_date
    """, (class_name, section_name, exam_name))

    if not rows:
        return err("No timetable found")

    pdf_path = xl.generate_exam_timetable_pdf(class_name, section_name, exam_name, rows)
    return send_file(pdf_path, as_attachment=True)


@app.route("/api/exams", methods=["POST"])
def create_exam():
    body         = request.json or {}
    teacher_id   = body.get("teacher_id")
    class_name   = (body.get("class_name") or "").strip()
    section_name = (body.get("section_name") or "").strip().upper()
    exam_name    = (body.get("exam_name") or "").strip()
    subject_id   = body.get("subject_id")
    max_marks    = int(body.get("max_marks") or 100)
    exam_date    = body.get("exam_date") or body.get("start_date")

    if not all([teacher_id, class_name, section_name, exam_name, subject_id, exam_date]):
        return err("All fields required")

    cls = db.query("SELECT id FROM classes WHERE class_name=%s", (class_name,), fetchone=True)
    if not cls:
        return err("Class not found")

    sec = db.query("SELECT id FROM sections WHERE class_id=%s AND section_name=%s",
                   (cls["id"], section_name), fetchone=True)
    if not sec:
        return err("Section not found")

    teacher = db.query("SELECT id FROM teachers WHERE teacher_id=%s", (teacher_id,), fetchone=True)
    if not teacher:
        return err("Teacher not found")

    assignment = db.query("""
        SELECT id FROM teacher_assignments
        WHERE teacher_id=%s AND class_id=%s AND section_id=%s AND role='Class Teacher'
    """, (teacher["id"], cls["id"], sec["id"]), fetchone=True)

    if not assignment:
        return err("Only assigned class teacher can create exam", 403)

    exam_id = db.query("""
        INSERT INTO exams (class_id, section_id, subject_id, exam_name, exam_date, max_marks)
        VALUES (%s,%s,%s,%s,%s,%s)
    """, (cls["id"], sec["id"], subject_id, exam_name, exam_date, max_marks), commit=True)

    return ok({"exam_id": exam_id}, "Exam timetable created successfully")


@app.route("/api/marks", methods=["GET"])
def get_marks():
    exam_id    = request.args.get("exam_id")
    student_id = request.args.get("student_id")
    if not exam_id or not student_id:
        return err("exam_id and student_id required")

    rows = db.query("""
        SELECT m.subject_id, su.subject_name, m.marks_obtained
        FROM   marks m
        JOIN   subjects su ON su.id = m.subject_id
        WHERE  m.exam_id=%s AND m.student_id=%s
        ORDER BY su.id
    """, (exam_id, student_id))
    return ok(serialize_rows(rows))


@app.route("/api/marks", methods=["POST"])
def save_marks():
    body       = request.json or {}
    exam_id    = body.get("exam_id")
    student_id = body.get("student_id")
    marks_list = body.get("marks") or []

    if not exam_id or not student_id or not marks_list:
        return err("exam_id, student_id, marks required")

    exam_row = db.query("SELECT class_id, section_id FROM exams WHERE id=%s",
                        (exam_id,), fetchone=True)
    student_db = db.query(
        "SELECT id FROM students WHERE student_id=%s AND class_id=%s AND section_id=%s",
        (student_id, exam_row["class_id"], exam_row["section_id"]), fetchone=True
    )
    if not student_db:
        return err("Student not found in this class/section")

    for m in marks_list:
        db.query("""
            INSERT INTO marks (exam_id, student_id, subject_id, marks_obtained)
            VALUES (%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE marks_obtained=%s
        """, (exam_id, student_db["id"], m["subject_id"], m["marks_obtained"],
              m["marks_obtained"]), commit=True)

    _sync_marks_excel(exam_id)
    return ok(message="Marks saved")


def _sync_marks_excel(exam_id):
    exam = db.query("""
        SELECT e.exam_name, e.exam_date, e.max_marks,
               cl.class_name, sc.section_name
        FROM exams e
        JOIN classes  cl ON cl.id = e.class_id
        JOIN sections sc ON sc.id = e.section_id
        WHERE e.id=%s
    """, (exam_id,), fetchone=True)
    if not exam:
        return

    subjects  = db.query(
        "SELECT subject_name FROM subjects WHERE class_id=(SELECT class_id FROM exams WHERE id=%s)",
        (exam_id,)
    )
    all_marks = db.query("""
        SELECT st.student_id, st.name, su.subject_name, m.marks_obtained
        FROM marks m
        JOIN students st ON st.id = m.student_id
        JOIN subjects su ON su.id = m.subject_id
        WHERE m.exam_id=%s
        ORDER BY st.student_id
    """, (exam_id,))

    student_map = {}
    for row in all_marks:
        sid = row["student_id"]
        if sid not in student_map:
            student_map[sid] = {"student_id": sid, "name": row["name"], "marks": {}}
        student_map[sid]["marks"][row["subject_name"]] = row["marks_obtained"]

    max_marks = exam["max_marks"]
    sub_count = len(subjects)
    students_marks = []
    for s in student_map.values():
        total = sum(s["marks"].get(sub["subject_name"], 0) for sub in subjects)
        pct   = round((total / (max_marks * sub_count)) * 100, 2) if sub_count else 0
        s["total"] = total
        s["percentage"] = pct
        s["grade"] = calc_grade(pct)
        students_marks.append(s)

    xl.sync_marks(
        exam["class_name"], exam["section_name"],
        exam["exam_name"], str(exam["exam_date"] or ""),
        max_marks, subjects, students_marks
    )


# ─────────────────────────────────────────────────────────────────────────────
# REPORT CARD PDF  (teacher/admin)
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/report-card/<int:student_id>", methods=["GET"])
def report_card(student_id):
    class_name   = request.args.get("class_name", "").strip()
    section_name = request.args.get("section_name", "").strip().upper()

    cls = db.query("SELECT id FROM classes WHERE class_name=%s", (class_name,), fetchone=True)
    sec = db.query("SELECT id FROM sections WHERE class_id=%s AND section_name=%s",
                   (cls["id"] if cls else 0, section_name), fetchone=True)

    if not cls or not sec:
        return err("Class or section not found", 404)

    student = db.query(
        "SELECT id, name FROM students WHERE student_id=%s AND class_id=%s AND section_id=%s",
        (student_id, cls["id"], sec["id"]), fetchone=True
    )
    if not student:
        return err("Student not found", 404)

    exams = db.query(
        "SELECT id, exam_name, exam_date, max_marks FROM exams WHERE class_id=%s AND section_id=%s",
        (cls["id"], sec["id"])
    )

    exam_results = []
    for exam in exams:
        marks_rows = db.query("""
            SELECT su.subject_name, m.marks_obtained
            FROM marks m
            JOIN subjects su ON su.id = m.subject_id
            WHERE m.exam_id=%s AND m.student_id=%s ORDER BY su.id
        """, (exam["id"], student["id"]))

        if not marks_rows:
            continue

        subjects_list = [{"subject_name": r["subject_name"], "marks_obtained": r["marks_obtained"]} for r in marks_rows]
        total     = sum(r["marks_obtained"] for r in marks_rows)
        max_total = exam["max_marks"] * len(marks_rows)
        pct       = round((total / max_total) * 100, 2) if max_total else 0

        exam_results.append({
            "exam_name":  exam["exam_name"],
            "start_date": str(exam["exam_date"] or ""),
            "max_marks":  exam["max_marks"],
            "subjects":   subjects_list,
            "total":      total,
            "max_total":  max_total,
            "percentage": pct,
            "grade":      calc_grade(pct),
        })

    if not exam_results:
        return err("No exam results found for this student", 404)

    pdf_path = xl.generate_report_card_pdf(
        class_name, section_name, student_id, student["name"], exam_results
    )
    return send_file(pdf_path, as_attachment=True)


@app.route("/api/report-card/preview/<int:student_id>", methods=["GET"])
def report_card_preview(student_id):
    class_name   = request.args.get("class_name", "").strip()
    section_name = request.args.get("section_name", "").strip().upper()

    cls = db.query("SELECT id FROM classes WHERE class_name=%s", (class_name,), fetchone=True)
    sec = db.query("SELECT id FROM sections WHERE class_id=%s AND section_name=%s",
                   (cls["id"] if cls else 0, section_name), fetchone=True)

    if not cls or not sec:
        return err("Class or section not found", 404)

    student = db.query(
        "SELECT id, name FROM students WHERE student_id=%s AND class_id=%s AND section_id=%s",
        (student_id, cls["id"], sec["id"]), fetchone=True
    )
    if not student:
        return err("Student not found", 404)

    exams = db.query(
        "SELECT id, exam_name, exam_date, max_marks FROM exams WHERE class_id=%s AND section_id=%s",
        (cls["id"], sec["id"])
    )

    exam_results = []
    combined_total = 0
    combined_max   = 0

    for exam in exams:
        marks_rows = db.query("""
            SELECT su.subject_name, m.marks_obtained
            FROM marks m
            JOIN subjects su ON su.id = m.subject_id
            WHERE m.exam_id=%s AND m.student_id=%s
        """, (exam["id"], student["id"]))

        if not marks_rows:
            continue

        total     = sum(r["marks_obtained"] for r in marks_rows)
        max_total = exam["max_marks"] * len(marks_rows)
        pct       = round((total / max_total) * 100, 2) if max_total else 0
        combined_total += total
        combined_max   += max_total

        exam_results.append({
            "exam_name":  exam["exam_name"],
            "start_date": str(exam["exam_date"] or ""),
            "max_marks":  exam["max_marks"],
            "subjects":   serialize_rows(marks_rows),
            "total":      total,
            "max_total":  max_total,
            "percentage": pct,
            "grade":      calc_grade(pct),
        })

    final_pct   = round((combined_total / combined_max) * 100, 2) if combined_max else 0
    final_grade = calc_grade(final_pct)

    return ok({
        "student_id":    student_id,
        "student_name":  student["name"],
        "class_name":    class_name,
        "section_name":  section_name,
        "exam_results":  exam_results,
        "final_total":   combined_total,
        "final_max":     combined_max,
        "final_percent": final_pct,
        "final_grade":   final_grade,
        "result":        "FAIL" if final_grade == "E" else "PASS",
    })



# ─────────────────────────────────────────────────────────────────────────────
# DIRECTOR — manage admins, set permissions
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/director/users", methods=["GET"])
def director_list_users():
    """Director: list all non-student, non-director users."""
    rows = db.query("""
        SELECT u.id, u.username, u.role, u.created_at,
               s.name AS staff_name, s.phone, s.email
        FROM users u
        LEFT JOIN staff s ON s.id = u.staff_db_id
        WHERE u.role IN ('principal','administrator')
        ORDER BY u.role, u.username
    """)
    return ok(serialize_rows(rows))


@app.route("/api/director/users", methods=["POST"])
def director_create_user():
    """Director: create a principal or administrator account."""
    body     = request.json or {}
    username = (body.get("username") or "").strip()
    password = (body.get("password") or "").strip()
    role     = (body.get("role") or "").strip()
    name     = (body.get("name") or "").strip()
    phone    = (body.get("phone") or "").strip()
    email    = (body.get("email") or "").strip()
    basic    = body.get("basic_salary", 0)

    if role not in ("principal", "administrator"):
        return err("role must be 'principal' or 'administrator'")
    if not username or not password or not name:
        return err("username, password, name are required")

    existing = db.query("SELECT id FROM users WHERE username=%s", (username,), fetchone=True)
    if existing:
        return err("Username already taken")

    # Create staff record
    last_staff = db.query("SELECT MAX(staff_id) AS m FROM staff", fetchone=True)
    new_staff_id = (last_staff["m"] or 2000) + 1

    staff_db_id = db.query(
        "INSERT INTO staff (staff_id, name, password, role, phone, email, basic_salary) VALUES (%s,%s,%s,%s,%s,%s,%s)",
        (new_staff_id, name, hash_pw(password), role, phone, email, basic),
        commit=True,
    )

    db.query(
        "INSERT INTO users (username, password, role, staff_db_id) VALUES (%s,%s,%s,%s)",
        (username, hash_pw(password), role, staff_db_id),
        commit=True,
    )
    return ok({"staff_id": new_staff_id}, f"{role.capitalize()} '{username}' created")


@app.route("/api/director/users/<int:user_id>", methods=["DELETE"])
def director_delete_user(user_id):
    """Director: remove a principal or administrator."""
    user = db.query("SELECT role, staff_db_id FROM users WHERE id=%s", (user_id,), fetchone=True)
    if not user or user["role"] not in ("principal", "administrator"):
        return err("User not found or cannot be deleted", 404)
    db.query("DELETE FROM users WHERE id=%s", (user_id,), commit=True)
    if user["staff_db_id"]:
        db.query("UPDATE staff SET is_removed=1 WHERE id=%s", (user["staff_db_id"],), commit=True)
    return ok(message="User removed")


@app.route("/api/director/users/<int:user_id>/permissions", methods=["PUT"])
def director_set_permissions(user_id):
    """Director: override permissions for a user."""
    body = request.json or {}
    perms = body.get("permissions")
    if perms is None:
        return err("permissions (JSON object) required")
    import json
    db.query("UPDATE users SET custom_permissions=%s WHERE id=%s",
             (json.dumps(perms), user_id), commit=True)
    return ok(message="Permissions updated")


# ─────────────────────────────────────────────────────────────────────────────
# DIRECTOR — salary overview for all staff
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/director/salary-overview", methods=["GET"])
def director_salary_overview():
    """Director: total salary paid, due, by role."""
    month = request.args.get("month", "").strip()

    teacher_q = """
        SELECT 'teacher' AS staff_type, t.name, t.teacher_id AS staff_id,
               ts.month, ts.basic, ts.total_deduction, ts.net_salary,
               NULL AS db_id
        FROM teacher_salary ts
        JOIN teachers t ON t.id = ts.teacher_id
        WHERE (%s = '' OR ts.month = %s)
    """
    staff_q = """
        SELECT s.role AS staff_type, s.name, s.staff_id,
               ss.month, ss.basic, ss.total_deduction, ss.net_salary,
               ss.staff_id AS db_id
        FROM staff_salary ss
        JOIN staff s ON s.id = ss.staff_id
        WHERE (%s = '' OR ss.month = %s)
    """
    teachers = db.query(teacher_q, (month, month))
    staffs   = db.query(staff_q, (month, month))

    all_records = serialize_rows(teachers or []) + serialize_rows(staffs or [])
    total = sum(float(r["net_salary"] or 0) for r in all_records)

    return ok({"records": all_records, "total_payout": round(total, 2)})


# ─────────────────────────────────────────────────────────────────────────────
# STAFF — list all staff members (administrator / principal)
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/staff", methods=["GET"])
def get_staff():
    """Return all staff members (administrators, principals, directors)."""
    rows = db.query(
        "SELECT id, staff_id, name, role, phone, email, basic_salary FROM staff ORDER BY role, name"
    )
    return ok(serialize_rows(rows or []))


# ─────────────────────────────────────────────────────────────────────────────
# STAFF SALARY — create salary record for administrator / principal
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/staff-salary", methods=["POST"])
def calc_staff_salary():
    """Calculate and save salary for a staff member (administrator/principal)."""
    body     = request.json or {}
    staff_id = body.get("staff_id")   # staff.id (DB primary key)
    month    = body.get("month")

    if not staff_id or not month:
        return err("staff_id and month are required")

    staff_db = db.query("SELECT id, name, basic_salary FROM staff WHERE id=%s", (staff_id,), fetchone=True)
    if not staff_db:
        return err("Staff member not found")

    existing = db.query(
        "SELECT id FROM staff_salary WHERE staff_id=%s AND month=%s",
        (staff_db["id"], month), fetchone=True
    )
    if existing:
        return err(f"Salary for {month} already calculated")

    basic     = float(staff_db["basic_salary"] or 0)
    incentive = float(body.get("incentive", 0))
    gross     = basic + incentive
    pf        = round(gross * 0.12, 2)
    pt        = 200.0
    tds       = round(gross * 0.05, 2)
    total_ded = round(pf + pt + tds, 2)
    net       = round(gross - total_ded, 2)

    record = {
        "basic": basic, "incentive": incentive, "gross": gross,
        "pf": pf, "professional_tax": pt, "tds": tds,
        "total_deduction": total_ded, "net_salary": net, "month": month
    }

    db.query("""
        INSERT INTO staff_salary
           (staff_id, month, basic, incentive, gross, pf, professional_tax,
            tds, total_deduction, net_salary)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (staff_db["id"], month, basic, incentive, gross, pf, pt, tds, total_ded, net),
         commit=True)

    return ok({**record, "name": staff_db["name"]}, "Staff salary calculated successfully")


@app.route("/api/staff-salary", methods=["GET"])
def get_staff_salary():
    """Get salary history for a staff member."""
    staff_id = request.args.get("staff_id")
    if not staff_id:
        return err("staff_id required")
    rows = db.query("""
        SELECT ss.*, s.name
        FROM staff_salary ss
        JOIN staff s ON s.id = ss.staff_id
        WHERE ss.staff_id=%s ORDER BY ss.created_at DESC
    """, (staff_id,))
    return ok(serialize_rows(rows or []))


# ─────────────────────────────────────────────────────────────────────────────
# DIRECTOR — fee collection overview
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/director/fee-overview", methods=["GET"])
def director_fee_overview():
    """Director: total fee collected vs due."""
    summary = db.query("""
        SELECT SUM(total_fee) AS total_fee,
               SUM(fee_paid) AS total_paid,
               SUM(fee_due)  AS total_due,
               COUNT(*)      AS total_students
        FROM students
    """, fetchone=True)

    recent = db.query("""
        SELECT fp.id, s.name, s.student_id,
               cl.class_name, sc.section_name,
               fp.amount, fp.payment_date, fp.payment_mode, fp.receipt_no
        FROM fee_payments fp
        JOIN students s  ON s.id  = fp.student_id
        JOIN classes  cl ON cl.id = s.class_id
        JOIN sections sc ON sc.id = s.section_id
        ORDER BY fp.payment_date DESC
        LIMIT 50
    """)

    return ok({
        "summary":        serialize_rows(summary) if summary else {},
        "recent_payments": serialize_rows(recent or []),
    })


@app.route("/api/fee-payments", methods=["GET"])
def get_fee_payments():
    student_db_id = request.args.get("student_db_id")
    if not student_db_id:
        return err("student_db_id required")
    rows = db.query("""
        SELECT * FROM fee_payments WHERE student_id=%s ORDER BY payment_date DESC
    """, (student_db_id,))
    return ok(serialize_rows(rows or []))


@app.route("/api/fee-payments", methods=["POST"])
def add_fee_payment():
    body           = request.json or {}
    student_db_id  = body.get("student_db_id")
    amount         = body.get("amount")
    payment_date   = body.get("payment_date") or str(date.today())
    payment_mode   = body.get("payment_mode", "Cash")
    receipt_no     = body.get("receipt_no", "")
    remarks        = body.get("remarks", "")
    collected_by   = body.get("collected_by", "")

    if not student_db_id or not amount:
        return err("student_db_id and amount are required")

    db.query(
        """INSERT INTO fee_payments (student_id, amount, payment_date, payment_mode, receipt_no, remarks, collected_by)
           VALUES (%s,%s,%s,%s,%s,%s,%s)""",
        (student_db_id, amount, payment_date, payment_mode, receipt_no, remarks, collected_by),
        commit=True,
    )
    db.query(
        "UPDATE students SET fee_paid = fee_paid + %s WHERE id=%s",
        (amount, student_db_id), commit=True,
    )
    return ok(message="Payment recorded")


@app.route("/api/students/<int:student_db_id>/fee", methods=["PUT"])
def set_student_fee(student_db_id):
    body = request.json or {}
    total_fee = body.get("total_fee")
    if total_fee is None:
        return err("total_fee required")
    db.query("UPDATE students SET total_fee=%s WHERE id=%s", (total_fee, student_db_id), commit=True)
    return ok(message="Fee updated")


# ─────────────────────────────────────────────────────────────────────────────
# PRINCIPAL — assign class teacher, manage timetable
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/timetable", methods=["GET"])
def get_timetable():
    class_id   = request.args.get("class_id")
    section_id = request.args.get("section_id")
    if not class_id or not section_id:
        return err("class_id and section_id required")
    rows = db.query("""
        SELECT tt.id, tt.day_of_week, tt.period_no,
               su.subject_name, t.name AS teacher_name,
               tt.start_time, tt.end_time
        FROM timetable tt
        JOIN subjects  su ON su.id = tt.subject_id
        JOIN teachers  t  ON t.id  = tt.teacher_id
        WHERE tt.class_id=%s AND tt.section_id=%s
        ORDER BY FIELD(tt.day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'),
                 tt.period_no
    """, (class_id, section_id))
    return ok(serialize_rows(rows or []))


@app.route("/api/timetable", methods=["POST"])
def save_timetable_entry():
    body       = request.json or {}
    class_id   = body.get("class_id")
    section_id = body.get("section_id")
    day        = body.get("day_of_week")
    period     = body.get("period_no")
    subject_id = body.get("subject_id")
    teacher_id = body.get("teacher_id")
    start_time = body.get("start_time")
    end_time   = body.get("end_time")

    if not all([class_id, section_id, day, period, subject_id, teacher_id]):
        return err("class_id, section_id, day_of_week, period_no, subject_id, teacher_id required")

    db.query("""
        INSERT INTO timetable (class_id, section_id, day_of_week, period_no,
                               subject_id, teacher_id, start_time, end_time)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        ON DUPLICATE KEY UPDATE subject_id=%s, teacher_id=%s, start_time=%s, end_time=%s
    """, (class_id, section_id, day, period, subject_id, teacher_id, start_time, end_time,
          subject_id, teacher_id, start_time, end_time), commit=True)
    return ok(message="Timetable entry saved")


@app.route("/api/timetable/<int:entry_id>", methods=["DELETE"])
def delete_timetable_entry(entry_id):
    db.query("DELETE FROM timetable WHERE id=%s", (entry_id,), commit=True)
    return ok(message="Entry deleted")


@app.route("/api/principal/assign-class-teacher", methods=["POST"])
def assign_class_teacher():
    body       = request.json or {}
    section_id = body.get("section_id")
    teacher_id = body.get("teacher_id")  # teachers.id (db id)
    if not section_id or not teacher_id:
        return err("section_id and teacher_id required")
    db.query("UPDATE sections SET class_teacher_id=%s WHERE id=%s",
             (teacher_id, section_id), commit=True)
    return ok(message="Class teacher assigned")


@app.route("/api/principal/academic-summary", methods=["GET"])
def principal_academic_summary():
    """Principal: overview of classes, teachers, student counts."""
    classes = db.query("""
        SELECT c.id, c.class_name, c.status,
               COUNT(DISTINCT s.id)  AS total_students,
               COUNT(DISTINCT sec.id) AS total_sections
        FROM classes c
        LEFT JOIN sections sec ON sec.class_id = c.id
        LEFT JOIN students s   ON s.class_id   = c.id
        WHERE c.status='Active'
        GROUP BY c.id
        ORDER BY c.class_name
    """)
    teachers = db.query("""
        SELECT t.id, t.teacher_id, t.name,
               COUNT(DISTINCT ta.class_id) AS classes_assigned
        FROM teachers t
        LEFT JOIN teacher_assignments ta ON ta.teacher_id = t.id
        WHERE t.is_removed=0
        GROUP BY t.id
        ORDER BY t.name
    """)
    return ok({
        "classes":  serialize_rows(classes or []),
        "teachers": serialize_rows(teachers or []),
    })


# ─────────────────────────────────────────────────────────────────────────────
# ADMINISTRATOR — generate IDs/passwords for students & teachers
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/administrator/generate-teacher-credentials", methods=["POST"])
def generate_teacher_credentials():
    """Administrator creates/resets teacher login in users table."""
    body      = request.json or {}
    teacher_db_id = body.get("teacher_db_id")  # teachers.id
    username  = (body.get("username") or "").strip()
    password  = (body.get("password") or "").strip()

    if not teacher_db_id or not username or not password:
        return err("teacher_db_id, username, password required")

    teacher = db.query("SELECT id FROM teachers WHERE id=%s AND is_removed=0",
                       (teacher_db_id,), fetchone=True)
    if not teacher:
        return err("Teacher not found")

    existing_user = db.query("SELECT id FROM users WHERE teacher_id=%s", (teacher_db_id,), fetchone=True)
    if existing_user:
        db.query("UPDATE users SET username=%s, password=%s WHERE teacher_id=%s",
                 (username, hash_pw(password), teacher_db_id), commit=True)
        return ok(message="Teacher credentials updated")

    db.query(
        "INSERT INTO users (username, password, role, teacher_id) VALUES (%s,%s,'teacher',%s)",
        (username, hash_pw(password), teacher_db_id), commit=True,
    )
    return ok(message="Teacher login created")


@app.route("/api/administrator/bulk-generate", methods=["POST"])
def bulk_generate_credentials():
    """Administrator: auto-generate username/password for all students in a section."""
    body       = request.json or {}
    class_id   = body.get("class_id")
    section_id = body.get("section_id")
    prefix     = (body.get("prefix") or "STU").strip()

    if not class_id or not section_id:
        return err("class_id and section_id required")

    students = db.query(
        "SELECT id, student_id, name FROM students WHERE class_id=%s AND section_id=%s",
        (class_id, section_id)
    )
    created = []
    for s in (students or []):
        username = f"{prefix}{s['student_id']}"
        password = f"Pass{s['student_id']}!"
        existing = db.query("SELECT id FROM users WHERE student_db_id=%s AND role='student'",
                            (s["id"],), fetchone=True)
        if not existing:
            dup = db.query("SELECT id FROM users WHERE username=%s", (username,), fetchone=True)
            if not dup:
                db.query(
                    "INSERT INTO users (username, password, role, student_db_id) VALUES (%s,%s,'student',%s)",
                    (username, hash_pw(password), s["id"]), commit=True,
                )
                created.append({"name": s["name"], "username": username, "password": password})

    return ok({"created": created, "count": len(created)}, f"{len(created)} credentials generated")



# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port  = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    print(f"🚀  School Management API running on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)