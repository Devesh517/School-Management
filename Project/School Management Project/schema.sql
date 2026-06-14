-- ============================================================
-- SCHOOL MANAGEMENT SYSTEM - COMPLETE DATABASE SCHEMA
-- Roles: director, principal, administrator, teacher, student
-- ============================================================

CREATE DATABASE IF NOT EXISTS school_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE school_db;

-- ============================================================
-- USERS / AUTH
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(64) NOT NULL, -- SHA256
    role ENUM('director','principal','administrator','teacher','student') NOT NULL DEFAULT 'teacher',

    -- Link to staff/student tables
    teacher_id INT NULL,
    staff_db_id INT NULL,       -- for principal / administrator

    student_db_id INT NULL,
    student_class_id INT NULL,
    student_section_id INT NULL,

    -- Permission overrides set by director
    custom_permissions JSON NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default director account
INSERT IGNORE INTO users (username, password, role)
VALUES (
    'director',
    SHA2('director123', 256),
    'director'
);

-- ============================================================
-- STAFF  (principal / administrator — non-teaching roles)
-- ============================================================

CREATE TABLE IF NOT EXISTS staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    password VARCHAR(64) NOT NULL,
    role ENUM('principal','administrator') NOT NULL,
    phone VARCHAR(15),
    email VARCHAR(200) UNIQUE,
    address TEXT,
    aadhar VARCHAR(12),
    account_number VARCHAR(30),
    bank_name VARCHAR(100),
    basic_salary DECIMAL(10,2) DEFAULT 0,
    is_removed TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- CLASS MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_name VARCHAR(20) NOT NULL,
    status ENUM('Active','Inactive') DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_class(class_name)
);

CREATE TABLE IF NOT EXISTS sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    section_name VARCHAR(5) NOT NULL,
    class_teacher_id INT NULL,          -- assigned class teacher
    UNIQUE KEY uq_section(class_id, section_name),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- ============================================================
-- STUDENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    section_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    dob DATE,
    age INT,
    mother_name VARCHAR(150),
    father_name VARCHAR(150),
    address TEXT,
    phone VARCHAR(15),
    aadhar VARCHAR(12),

    -- Fee tracking
    total_fee DECIMAL(10,2) DEFAULT 0,
    fee_paid DECIMAL(10,2) DEFAULT 0,
    fee_due DECIMAL(10,2) GENERATED ALWAYS AS (total_fee - fee_paid) STORED,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (section_id) REFERENCES sections(id)
);

-- ============================================================
-- FEE PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS fee_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'Cash',
    receipt_no VARCHAR(50),
    remarks TEXT,
    collected_by VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ============================================================
-- TEACHERS
-- ============================================================

CREATE TABLE IF NOT EXISTS teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    password VARCHAR(64) NOT NULL,
    dob DATE,
    age INT,
    phone VARCHAR(15) UNIQUE,
    email VARCHAR(200) UNIQUE,
    address TEXT,
    aadhar VARCHAR(12) UNIQUE,
    account_number VARCHAR(30) UNIQUE,
    bank_name VARCHAR(100),
    is_removed TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS removed_teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    name VARCHAR(150),
    reason TEXT,
    removed_date DATE
);

CREATE TABLE IF NOT EXISTS teacher_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    class_id INT NOT NULL,
    section_id INT NOT NULL,
    subject_id INT NOT NULL,
    role ENUM('Class Teacher','Subject Teacher') DEFAULT 'Subject Teacher',
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (section_id) REFERENCES sections(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- ============================================================
-- TEACHER SALARY
-- ============================================================

CREATE TABLE IF NOT EXISTS teacher_salary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    month VARCHAR(20) NOT NULL,
    basic DECIMAL(10,2),
    incentive DECIMAL(10,2),
    gross DECIMAL(10,2),
    pf DECIMAL(10,2),
    professional_tax DECIMAL(10,2),
    tds DECIMAL(10,2),
    total_deduction DECIMAL(10,2),
    net_salary DECIMAL(10,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_salary(teacher_id, month),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- Salary for staff (principal/administrator)
CREATE TABLE IF NOT EXISTS staff_salary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    month VARCHAR(20) NOT NULL,
    basic DECIMAL(10,2),
    incentive DECIMAL(10,2),
    gross DECIMAL(10,2),
    pf DECIMAL(10,2),
    professional_tax DECIMAL(10,2),
    tds DECIMAL(10,2),
    total_deduction DECIMAL(10,2),
    net_salary DECIMAL(10,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_staff_salary(staff_id, month),
    FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- ============================================================
-- TIMETABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS timetable (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    section_id INT NOT NULL,
    day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
    period_no INT NOT NULL,
    subject_id INT NOT NULL,
    teacher_id INT NOT NULL,
    start_time TIME,
    end_time TIME,
    UNIQUE KEY uq_period(class_id, section_id, day_of_week, period_no),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (section_id) REFERENCES sections(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- ============================================================
-- STUDENT ATTENDANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    section_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('P','A') NOT NULL DEFAULT 'P',
    UNIQUE KEY uq_att(student_id, date),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (section_id) REFERENCES sections(id)
);

-- ============================================================
-- EXAMS
-- ============================================================

CREATE TABLE IF NOT EXISTS exams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    section_id INT NOT NULL,
    subject_id INT NOT NULL,
    exam_name VARCHAR(100),
    exam_date DATE,
    start_time TIME,
    end_time TIME,
    max_marks INT DEFAULT 100,
    created_by_teacher INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (section_id) REFERENCES sections(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (created_by_teacher) REFERENCES teachers(id)
);

-- ============================================================
-- MARKS
-- ============================================================

CREATE TABLE IF NOT EXISTS marks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    marks_obtained FLOAT DEFAULT 0,
    UNIQUE KEY uq_marks(exam_id, student_id, subject_id),
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- ============================================================
-- NOTICES
-- ============================================================

CREATE TABLE IF NOT EXISTS notices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target ENUM('teachers','students','all') NOT NULL DEFAULT 'all',
    created_by VARCHAR(100) NOT NULL DEFAULT 'director',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- FOREIGN KEYS FOR USERS
-- ============================================================

ALTER TABLE users
ADD CONSTRAINT fk_user_teacher
FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

ALTER TABLE users
ADD CONSTRAINT fk_user_student
FOREIGN KEY (student_db_id) REFERENCES students(id) ON DELETE SET NULL;

ALTER TABLE users
ADD CONSTRAINT fk_user_class
FOREIGN KEY (student_class_id) REFERENCES classes(id) ON DELETE SET NULL;

ALTER TABLE users
ADD CONSTRAINT fk_user_section
FOREIGN KEY (student_section_id) REFERENCES sections(id) ON DELETE SET NULL;

ALTER TABLE sections
ADD CONSTRAINT fk_section_classteacher
FOREIGN KEY (class_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
