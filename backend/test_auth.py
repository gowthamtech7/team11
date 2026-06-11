import requests

API_URL = "http://127.0.0.1:8000"

print("Registering user...")
res = requests.post(f"{API_URL}/register", json={"name": "Test User", "email": "test@example.com", "password": "password123"})
print(res.status_code, res.text)

print("Logging in...")
res = requests.post(f"{API_URL}/login", json={"email": "test@example.com", "password": "password123"})
print(res.status_code, res.text)

if res.status_code == 200:
    token = res.json()["access_token"]
    print(f"Got token: {token}")
    
    print("Fetching my tickets...")
    res2 = requests.get(f"{API_URL}/my-tickets", headers={"Authorization": f"Bearer {token}"})
    print(res2.status_code, res2.text)
