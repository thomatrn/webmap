"""Exporte les tables de l'ancienne base SQLite en JSON (pour scripts/import-sqlite.ts)."""
import json, sqlite3, sys

con = sqlite3.connect(sys.argv[1])
con.row_factory = sqlite3.Row
out = {t: [dict(r) for r in con.execute(f'SELECT * FROM "{t}"')] for t in ["AdminUser", "Zone", "Marker", "AuditLog"]}
json.dump(out, sys.stdout, ensure_ascii=False)
