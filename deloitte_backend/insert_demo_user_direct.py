import sqlite3
from datetime import datetime
from passlib.context import CryptContext

DB_PATH = 'ai_analyzer/sentinel.db'
EMAIL = 'arshitasinha2005@gmail.com'
PASSWORD = 'DemoPass!23'  # change if you want

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
hashed = pwd_context.hash(PASSWORD)

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
# Ensure table exists
c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
if not c.fetchone():
    print('ERROR: users table not found in', DB_PATH)
else:
    c.execute('SELECT id FROM users WHERE email=?', (EMAIL,))
    if c.fetchone():
        print('User already exists:', EMAIL)
    else:
        created_at = datetime.utcnow().isoformat(' ')
        c.execute('INSERT INTO users (email, hashed_password, created_at) VALUES (?, ?, ?)', (EMAIL, hashed, created_at))
        conn.commit()
        print('Inserted demo user:', EMAIL, 'password:', PASSWORD)
conn.close()
