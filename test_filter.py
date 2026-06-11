import requests

try:
    r = requests.get("http://localhost:8000/tickets/", params={"status": "AwaitingUserInput"})
    tickets = r.json()
    print(f"Found {len(tickets)} tickets awaiting user input.")
    for t in tickets:
         print(f"Ticket {t['id']}: verif={t['verification_status']}")
except Exception as e:
    print("Error:", e)
