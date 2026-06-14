"""
db.py  –  MySQL connection helper
"""
import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "school_db"),
        autocommit=False,
    )

def query(sql, params=(), fetchone=False, commit=False):
    """
    Execute a query and return rows as list-of-dicts (or a single dict).
    Pass commit=True for INSERT / UPDATE / DELETE.
    Returns lastrowid when commit=True.
    """
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params)
        if commit:
            conn.commit()
            return cur.lastrowid
        if fetchone:
            return cur.fetchone()
        return cur.fetchall()
    finally:
        conn.close()

def execute_many(sql, rows):
    """Bulk insert helper."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.executemany(sql, rows)
        conn.commit()
    finally:
        conn.close()
