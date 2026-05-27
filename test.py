from db import conn

cur = conn.cursor()

cur.execute("""
            SELECT name
            FROM cell_lines
            """)

rows = cur.fetchall()
print(rows)