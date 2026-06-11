import requests
import sqlite3

def check_db(ticket_id):
    conn = sqlite3.connect("road_damage.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, status, verification_status, user_verification_token FROM tickets WHERE id=?", (ticket_id,))
    row = cursor.fetchone()
    conn.close()
    return row

def fetch_all_tickets_from_api():
    try:
        r = requests.get("http://localhost:8000/tickets/")
        tickets = r.json()
        for t in tickets:
            print(f"API Ticket {t['id']}: status={t['status']}, verif={t['verification_status']}, token={t['user_verification_token']}")
    except Exception as e:
        print("API error:", e)

print("Tickets in API:")
fetch_all_tickets_from_api()
