# 🏫 School Management System — Full Stack

A full-stack upgrade of the CLI Python project.  
**Frontend**: HTML + CSS + JS (your existing files)  
**Backend**: Flask (Python) REST API  
**Database**: MySQL  
**Excel Sync**: openpyxl (same folder structure as CLI project)  
**PDF Generation**: ReportLab (salary slips + report cards)

---

## 📁 Project Folder Structure

```
school-management/
│
├── backend/                        ← This folder (school_backend)
│   ├── app.py                      ← Main Flask app (all API routes)
│   ├── db.py                       ← MySQL connection helper
│   ├── excel_utils.py              ← Excel + PDF generation
│   ├── schema.sql                  ← Run once to create DB tables
│   ├── requirements.txt            ← Python dependencies
│   ├── .env                        ← Your DB credentials (edit this)
│   └── excel_exports/              ← Auto-created Excel files go here
│       ├── Class_Management/
│       │   ├── class_master.xlsx
│       │   └── Class_8/
│       │       ├── subjects.xlsx
│       │       └── section_A.xlsx
│       ├── Teacher_Management/
│       │   ├── teacher_details.xlsx
│       │   ├── teacher_salary.xlsx
│       │   ├── teacher_assignments.xlsx
│       │   └── removed_teachers.xlsx
│       ├── Attendance/
│       │   └── Class_8/
│       │       └── section_A.xlsx
│       ├── Marks/
│       │   └── Class_8/
│       │       └── section_A.xlsx
│       ├── Report_Cards/
│       │   └── Class_8/Section_A/
│       │       └── ReportCard_8A_1.pdf
│       └── Salary_Slips/
│           └── SalarySlip_RamSharma_July-2026.pdf
│
└── frontend/                       ← Your existing HTML/CSS/JS files
    ├── index.html
    ├── CSS/style.css
    └── JS/
        ├── api.js
        ├── app.js
        ├── attendance.js
        ├── assignments.js
        ├── classes.js
        ├── dashboard.js
        ├── exams.js
        ├── salary.js
        ├── students.js
        ├── teachers.js
        ├── utils.js
        └── report.js              ← NEW — copy this from school_backend/
```

---

