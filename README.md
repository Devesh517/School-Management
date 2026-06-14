# 🏫 School Management System — Full Stack

A comprehensive role-based School Management System developed using modern web technologies.

**Frontend:** HTML5, CSS3, JavaScript
**Backend:** Flask (Python) REST API
**Database:** MySQL
**Excel Integration:** OpenPyXL
**PDF Generation:** ReportLab

The system provides complete management of students, teachers, classes, examinations, attendance, fees, salaries, notices, report cards, and timetables through separate role-based dashboards.

---

# 🚀 Features

## 👑 Director Dashboard

* Full system access
* Manage Principals and Administrators
* View salary overview of all staff
* Monitor fee collection statistics
* Access all academic and administrative modules

## 🎓 Principal Dashboard

* Academic management
* Assign class teachers
* Manage timetables
* Generate report cards
* Monitor attendance and examination records
* Publish notices

## 🗂️ Administrator Dashboard

* Student management
* Teacher management
* Class and section management
* Generate login credentials
* Publish notices

## 👩‍🏫 Teacher Dashboard

* Mark attendance
* Enter examination marks
* View assigned timetable
* Access notices
* Generate student reports

## 👨‍🎓 Student Portal

* View attendance
* View examination results
* Download report cards
* Access timetable
* Read notices

---

# 📁 Project Folder Structure

```text
School Management Project/
│
├── app.py                     # Flask Backend Application
├── db.py                      # Database Connection Module
├── excel_utils.py             # Excel Export Utilities
├── schema.sql                 # MySQL Database Schema
├── requirements.txt           # Project Dependencies
│
├── index.html                 # Main Dashboard/Login
├── student.html               # Student Portal
│
├── CSS/
│   ├── style.css
│   ├── student.css
│   └── js-inline-overrides.css
│
├── JS/
│   ├── api.js
│   ├── app.js
│   ├── dashboard.js
│   ├── administrator.js
│   ├── principal.js
│   ├── director.js
│   ├── teachers.js
│   ├── students.js
│   ├── classes.js
│   ├── attendance.js
│   ├── exams.js
│   ├── timetable.js
│   ├── salary.js
│   ├── fees.js
│   ├── notices.js
│   ├── assignments.js
│   ├── report.js
│   ├── student_app.js
│   ├── student_marks.js
│   ├── student_exams.js
│   ├── student_notices.js
│   ├── student_access.js
│   ├── mobile-sidebar.js
│   └── utils.js
│
├── excel_exports/
│   │
│   ├── Class_Management/
│   │   ├── class_master.xlsx
│   │   └── Class_9/
│   │       ├── section_A.xlsx
│   │       └── subjects.xlsx
│   │
│   ├── Teacher_Management/
│   │   ├── teacher_details.xlsx
│   │   ├── teacher_assignments.xlsx
│   │   ├── teacher_salary.xlsx
│   │   └── removed_teachers.xlsx
│   │
│   ├── Marks/
│   │   └── Class_9/
│   │       └── section_A.xlsx
│   │
│   ├── Report_Cards/
│   │   └── Class_9/
│   │       └── Section_A/
│   │           └── ReportCard_9A_1.pdf
│   │
│   └── Exam_Timetables/
│       ├── Unit 1_9_A.pdf
│       └── Half Yearly_9_A.pdf
│
└── README.md
```

---

# 🛠️ Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript (ES6)

### Backend

* Python
* Flask
* Flask-CORS

### Database

* MySQL

### Libraries

* OpenPyXL
* ReportLab
* PyMySQL
* python-dotenv

---

# 📊 Core Modules

### Student Management

* Add Students
* Edit Student Records
* Remove Students
* Student Credential Generation

### Teacher Management

* Add Teachers
* Edit Teachers
* Teacher Salary Management
* Teacher Assignment Management

### Class Management

* Class Creation
* Section Management
* Subject Allocation

### Attendance Management

* Daily Attendance
* Attendance Reports

### Examination Management

* Marks Entry
* Exam Scheduling
* Result Generation

### Timetable Management

* Weekly Timetable
* Teacher Allocation
* Class Scheduling

### Fee Management

* Fee Collection Tracking
* Due Amount Monitoring
* Payment Records

### Salary Management

* Staff Salary Tracking
* Salary Overview

### Notice Board

* Publish Notices
* Role-Based Notice Access

### Report Cards

* PDF Report Card Generation
* Student Result Summary

---

# 🔐 Role-Based Access Control

| Role          | Access Level                  |
| ------------- | ----------------------------- |
| Director      | Complete System Access        |
| Principal     | Academic Management           |
| Administrator | Student & Teacher Management  |
| Teacher       | Attendance & Marks Management |
| Student       | Personal Academic Dashboard   |

---

# ⚙️ Installation

## 1. Clone Repository

```bash
git clone <repository-url>
cd School-Management-System
```

## 2. Install Dependencies

```bash
pip install -r requirements.txt
```

## 3. Configure Database

Create MySQL database:

```sql
CREATE DATABASE school_db;
```

Import schema:

```bash
mysql -u root -p school_db < schema.sql
```

## 4. Configure Environment

Update database credentials inside the project configuration.

## 5. Run Application

```bash
python app.py
```

Open:

```text
http://localhost:5000
```

---

# 📄 Default Credentials

| Role           | Username | Password    |
| -------------- | -------- | ----------- |
| Director       | director | director123 |
| Admin (Legacy) | admin    | admin123    |

---

# 📈 Future Enhancements

* Parent Portal
* SMS & Email Notifications
* Online Fee Payment Gateway
* Assignment Submission System
* Student Performance Analytics
* Mobile Application
* Multi-School Support

---

---


This project is developed for educational and portfolio purposes.
