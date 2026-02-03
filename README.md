# 🏫 School Management System (Python)

A **console-based School Management System** built using **Python**, **OpenPyXL**, and **ReportLab**.  
This project helps manage **students, teachers, classes, attendance, marks, salary, and report cards** using Excel files and PDF generation.

---

## 📌 Features

### 👨‍🎓 Student Management
- Add single or multiple students
- Update student details (name, DOB, address, phone)
- View individual student or complete class list
- Remove students safely
- Automatic age calculation from DOB

---

### 🏫 Class Management
- Create classes with sections and subjects
- Add or remove sections
- Remove entire classes (soft delete)
- Maintain class master records
- Prevent duplicate classes or sections

---

### 👩‍🏫 Teacher Management
- Add and remove teachers
- Auto-generate unique Teacher IDs
- Assign teachers as **Class Teacher** or **Subject Teacher**
- View teachers by class or subject
- Update teacher profile details

---

### 💰 Salary Management
- Automatic salary calculation
- Role-based salary (Class Teacher / Subject Teacher)
- Deductions: PF, Professional Tax, TDS
- Store salary records in Excel
- Generate **professionally styled Salary Slip PDFs**

---

### 📝 Attendance Management
- Automatic attendance file creation
- Mark daily attendance (P/A)
- Class-wise attendance tracking

---

### 📊 Marks & Exam Management
- Create exams with subjects
- Enter or update marks
- Auto-calculate total, percentage, and grade
- Grade system (A1 to E)
- Generate **professionally styled Report Card PDFs**

---

### 🔐 Authentication
- Admin login (fixed credentials)
- Teacher login using stored credentials
- Role-based access control

---

## 🧾 PDF Generation
- Salary Slip PDF
- Report Card PDF
- Clean layout with tables, spacing, and highlights
- Generated using **ReportLab**

---

## 🛠️ Technologies Used

- **Python 3**
- **OpenPyXL** – Excel file handling
- **ReportLab** – PDF generation
- **OS Module** – File and folder management
- **Datetime** – Age, attendance, and salary date handling

---
