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

## ⚙️ SETUP INSTRUCTIONS

### Step 1 — Install MySQL

- **Windows**: Download MySQL Installer from https://dev.mysql.com/downloads/installer/
- **Linux**: `sudo apt install mysql-server`
- **Mac**: `brew install mysql`

Start the MySQL service and remember your root password.

---

### Step 2 — Create the Database

Open MySQL Workbench or the terminal and run:

```bash
# From terminal
mysql -u root -p < schema.sql

# OR open MySQL Workbench, open schema.sql, and click Run (⚡)
```

This creates:
- The `school_db` database
- All 12 tables
- Default admin user (username: `admin`, password: `admin123`)

---

### Step 3 — Configure the .env File

Edit `backend/.env` with your MySQL password:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_password_here
DB_NAME=school_db
FLASK_PORT=5000
FLASK_DEBUG=true
```

---

### Step 4 — Install Python Dependencies

Open terminal in the `backend/` folder:

```bash
# Create a virtual environment (recommended)
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install all packages
pip install -r requirements.txt
```

---

### Step 5 — Run the Backend

```bash
python app.py
```

You should see:
```
🚀  School Management API running on http://localhost:5000
```

---

### Step 6 — Set Up the Frontend

1. Copy `report.js` from `school_backend/` to your `frontend/JS/` folder.

2. Add this line to your `index.html` before the closing `</body>` tag  
   (after the other script tags):
   ```html
   <script src="JS/report.js"></script>
   ```

3. Open `index.html` in your browser:
   - Double-click the file, **OR**
   - Use a local server: `python -m http.server 8080` in the frontend folder,  
     then visit `http://localhost:8080`

---

## 🔐 Login Credentials

| Role    | Username | Password  |
|---------|----------|-----------|
| Admin   | admin    | admin123  |
| Teacher | (teacher's name or email) | (password set when adding teacher) |

---

## 📡 API Endpoints Reference

### Auth
| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/login` | Login (admin or teacher) |
| GET  | `/api/stats` | Dashboard counts |

### Classes
| Method | URL | Description |
|--------|-----|-------------|
| GET  | `/api/classes` | All classes |
| POST | `/api/classes` | Add class + section + subjects |
| DELETE | `/api/classes/:id` | Mark class inactive |
| GET  | `/api/classes/:id/sections` | Sections of a class |
| POST | `/api/classes/:id/sections` | Add a section |
| GET  | `/api/classes/:id/subjects` | Subjects of a class |

### Students
| Method | URL | Description |
|--------|-----|-------------|
| GET  | `/api/students?class_name=8&section_name=A` | Students of a section |
| POST | `/api/students` | Add student |
| PUT  | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Remove student |

### Teachers
| Method | URL | Description |
|--------|-----|-------------|
| GET  | `/api/teachers` | All active teachers |
| POST | `/api/teachers` | Add teacher |
| PUT  | `/api/teachers/:teacher_id` | Update teacher |
| DELETE | `/api/teachers/:teacher_id` | Remove teacher |

### Assignments
| Method | URL | Description |
|--------|-----|-------------|
| GET  | `/api/assignments` | All assignments |
| GET  | `/api/assignments?teacher_id=1001` | Assignments of one teacher |
| POST | `/api/assignments` | Assign teacher to class |

### Salary
| Method | URL | Description |
|--------|-----|-------------|
| GET  | `/api/salary?teacher_id=1001` | Salary history |
| POST | `/api/salary` | Calculate & save salary |
| GET  | `/api/salary/slip/:teacher_id/:month` | Download salary slip PDF |

### Attendance
| Method | URL | Description |
|--------|-----|-------------|
| GET  | `/api/attendance?class_name=8&section_name=A&date=2026-05-20` | View attendance |
| POST | `/api/attendance` | Mark attendance |

### Exams & Marks
| Method | URL | Description |
|--------|-----|-------------|
| GET  | `/api/exams?class_name=8&section_name=A` | List exams |
| POST | `/api/exams` | Create exam |
| GET  | `/api/marks?exam_id=1&student_id=1` | Get marks |
| POST | `/api/marks` | Save/update marks |

### Report Cards
| Method | URL | Description |
|--------|-----|-------------|
| GET  | `/api/report-card/preview/:student_id?class_name=8&section_name=A` | JSON preview |
| GET  | `/api/report-card/:student_id?class_name=8&section_name=A` | Download PDF |

---

## 📊 Excel File Sync

Every time you add/update/delete data via the web interface, the backend **automatically regenerates** the corresponding Excel file in `excel_exports/`. The folder structure mirrors the original CLI project exactly, so you can open these files in Excel/LibreOffice anytime.

| Action | Excel file updated |
|--------|--------------------|
| Add/edit/remove student | `Class_Management/Class_X/section_Y.xlsx` |
| Add/edit/remove class | `Class_Management/class_master.xlsx` |
| Add/edit/remove teacher | `Teacher_Management/teacher_details.xlsx` |
| Assign teacher | `Teacher_Management/teacher_assignments.xlsx` |
| Remove teacher | `Teacher_Management/removed_teachers.xlsx` |
| Process salary | `Teacher_Management/teacher_salary.xlsx` |
| Mark attendance | `Attendance/Class_X/section_Y.xlsx` |
| Enter marks | `Marks/Class_X/section_Y.xlsx` |
| Generate report card | `Report_Cards/Class_X/Section_Y/ReportCard_XY_N.pdf` |
| Generate salary slip | `Salary_Slips/SalarySlip_Name_Month.pdf` |

---

## 🐛 Troubleshooting

**`mysql.connector.errors.ProgrammingError: Table doesn't exist`**  
→ Run `schema.sql` in MySQL first.

**`Access denied for user 'root'`**  
→ Check your `.env` password matches your MySQL root password.

**Frontend shows "Cannot connect to server"**  
→ Make sure `python app.py` is running and shows port 5000.

**CORS error in browser console**  
→ Backend already has CORS enabled. If still failing, open `index.html`  
  via a local server (`python -m http.server 8080`) instead of double-click.

**`ModuleNotFoundError: No module named 'flask'`**  
→ Run `pip install -r requirements.txt` inside your activated venv.
