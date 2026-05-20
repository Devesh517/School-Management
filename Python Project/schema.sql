-- ============================================================
-- SCHOOL MANAGEMENT SYSTEM — MySQL Schema
-- Run this ONCE to set up your database
-- ============================================================

CREATE DATABASE IF NOT EXISTS school_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE school_db;

-- ─────────────────────────────────────────
-- USERS / AUTH TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(64)  NOT NULL,       -- SHA-256 hex
    role        ENUM('admin','teacher') NOT NULL DEFAULT 'teacher',
    teacher_id  INT NULL,                    -- FK set after teachers table
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default admin (password = admin123)
INSERT IGNORE INTO users (username, password, role)
VALUES ('admin', SHA2('admin123', 256), 'admin');

-- ─────────────────────────────────────────
-- CLASS MANAGEMENT
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    class_name      VARCHAR(20)  NOT NULL,
    status          ENUM('Active','Inactive') DEFAULT 'Active',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_class (class_name)
);

CREATE TABLE IF NOT EXISTS sections (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    class_id    INT NOT NULL,
    section_name VARCHAR(5) NOT NULL,
    UNIQUE KEY uq_section (class_id, section_name),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subjects (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    class_id    INT NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- STUDENT MANAGEMENT
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    student_id      INT NOT NULL,            -- sequential within section
    class_id        INT NOT NULL,
    section_id      INT NOT NULL,
    name            VARCHAR(150) NOT NULL,
    dob             DATE,
    age             INT,
    mother_name     VARCHAR(150),
    father_name     VARCHAR(150),
    address         TEXT,
    phone           VARCHAR(15),
    aadhar          VARCHAR(12),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id)   REFERENCES classes(id),
    FOREIGN KEY (section_id) REFERENCES sections(id)
);

-- ─────────────────────────────────────────
-- TEACHER MANAGEMENT
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id      INT NOT NULL UNIQUE,     -- auto-generated (starts at 1001)
    name            VARCHAR(150) NOT NULL,
    password        VARCHAR(64)  NOT NULL,   -- SHA-256 hex
    dob             DATE,
    age             INT,
    phone           VARCHAR(15) UNIQUE,
    email           VARCHAR(200) UNIQUE,
    address         TEXT,
    aadhar          VARCHAR(12) UNIQUE,
    account_number  VARCHAR(30) UNIQUE,
    bank_name       VARCHAR(100),
    is_removed      TINYINT DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS removed_teachers (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id      INT NOT NULL,
    name            VARCHAR(150),
    reason          TEXT,
    removed_date    DATE
);

CREATE TABLE IF NOT EXISTS teacher_assignments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id  INT NOT NULL,
    class_id    INT NOT NULL,
    section_id  INT NOT NULL,
    subject_id  INT NOT NULL,
    role        ENUM('Class Teacher','Subject Teacher') DEFAULT 'Subject Teacher',
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    FOREIGN KEY (class_id)   REFERENCES classes(id),
    FOREIGN KEY (section_id) REFERENCES sections(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- ─────────────────────────────────────────
-- SALARY
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_salary (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id          INT NOT NULL,
    month               VARCHAR(20) NOT NULL,
    basic               DECIMAL(10,2),
    incentive           DECIMAL(10,2),
    gross               DECIMAL(10,2),
    pf                  DECIMAL(10,2),
    professional_tax    DECIMAL(10,2),
    tds                 DECIMAL(10,2),
    total_deduction     DECIMAL(10,2),
    net_salary          DECIMAL(10,2),
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_salary (teacher_id, month),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- ─────────────────────────────────────────
-- ATTENDANCE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    student_id  INT NOT NULL,
    class_id    INT NOT NULL,
    section_id  INT NOT NULL,
    date        DATE NOT NULL,
    status      ENUM('P','A') NOT NULL DEFAULT 'P',
    UNIQUE KEY uq_att (student_id, date),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (class_id)   REFERENCES classes(id),
    FOREIGN KEY (section_id) REFERENCES sections(id)
);

-- ─────────────────────────────────────────
-- EXAMS & MARKS
-- ─────────────────────────────────────────
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
    FOREIGN KEY (class_id)
    REFERENCES classes(id),
    FOREIGN KEY (section_id)
    REFERENCES sections(id),
    FOREIGN KEY (subject_id)
    REFERENCES subjects(id),
    FOREIGN KEY (created_by_teacher)
    REFERENCES teachers(id)
);

CREATE TABLE IF NOT EXISTS marks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    marks_obtained FLOAT DEFAULT 0,
    UNIQUE KEY uq_marks
    (exam_id, student_id, subject_id),
    FOREIGN KEY (exam_id)
    REFERENCES exams(id)
    ON DELETE CASCADE,
    FOREIGN KEY (student_id)
    REFERENCES students(id)
    ON DELETE CASCADE,
    FOREIGN KEY (subject_id)
    REFERENCES subjects(id)
    ON DELETE CASCADE
);
