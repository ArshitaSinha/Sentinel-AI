import sqlite3
conn = sqlite3.connect('ai_analyzer/sentinel.db')
rows = list(conn.execute("SELECT id,email,created_at FROM users"))
print('USERS_IN_AI_ANALYZER_DB:', rows)
conn.close()
