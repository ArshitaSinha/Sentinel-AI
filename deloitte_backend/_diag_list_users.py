import sqlite3
conn = sqlite3.connect('sentinel.db')
rows = list(conn.execute("SELECT id,email,created_at FROM users"))
print('USERS:', rows)
conn.close()
