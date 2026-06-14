# EduManage — School Management System
## Role-Based Access Control (5 Roles)

### 👑 Director
- **Full access** to everything in the system
- **Create/manage** multiple Principal and Administrator accounts
- **Set custom permissions** for each account
- **Salary overview** — view all staff salaries (teachers + principal + administrators)
- **Fee collection** — view total fee collected, due, recent payments
- All academic and management features

### 🎓 Principal
- **Academic overview** — classes, sections, student counts, teacher workload
- **Assign class teacher** to sections
- **Manage timetable** — create/edit weekly timetable for all classes
- **Assign teachers** to classes and subjects
- **View & generate** marks, report cards, attendance
- Read access to student and teacher records
- Post notices

### 🗂️ Administrator
- **Add classes** and sections
- **Manage students** (add, edit, remove)
- **Manage teachers** (add, edit, remove)
- **Generate student credentials** (username + password) individually or in bulk
- **Generate teacher credentials** (username + password)
- Post notices

### 👩‍🏫 Teacher
- **Mark attendance** for their classes
- **Enter exam marks** for their subjects
- **View report cards**
- **View timetable** (their weekly schedule)
- View notices

### 👨‍🎓 Student (via student.html)
- **View marks** for all exams
- **View timetable** (class weekly schedule)
- **View report card** (download PDF)
- **View attendance** summary
- View notices

---

## Default Credentials

| Role          | Username  | Password     |
|---------------|-----------|--------------|
| Director      | director  | director123  |
| Admin (legacy)| admin     | admin123     |

---

## Setup

```bash
pip install -r requirements.txt
# Configure DB in .env: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
mysql -u root -p < schema.sql
python app.py
```

## New Database Tables
- `staff` — principal and administrator records with salary info
- `staff_salary` — salary records for principal/administrator
- `fee_payments` — individual fee payment transactions
- `timetable` — weekly class timetable (day, period, subject, teacher)

Students table now has `total_fee`, `fee_paid`, `fee_due` columns.
