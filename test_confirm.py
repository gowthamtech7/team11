import requests

ticket_id = 16
token = "924dfd34-f75d-4579-b7c6-2ee07eedc25e"
url = f"http://localhost:8000/tickets/{ticket_id}/confirm_resolution?token={token}&resolved=true"

print(f"Hitting {url}")
r = requests.get(url)
print("Status Code:", r.status_code)

print("Fetching API again...")
tickets = requests.get("http://localhost:8000/tickets/").json()
for t in tickets:
    if t["id"] == ticket_id:
        print(f"API Ticket {t['id']}: status={t['status']}, verif={t['verification_status']}")
