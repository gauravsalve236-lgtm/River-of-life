import requests
import json

base_url = "http://127.0.0.1:7880"

# 1. Request OTP for +918208287971
print("Requesting OTP for +918208287971...")
res = requests.post(f"{base_url}/api/auth/request-otp", json={
    "phone": "+918208287971"
})
data = res.json()
print("Request OTP response:", data)

otp_code = data.get("devOtp")
print(f"Captured devOtp: {otp_code}")

# 2. Verify OTP with new Full Name 'Gaurav Salve' and Username 'gaurav_salve'
print("Verifying OTP with new Full Name 'Gaurav Salve' & Username 'gaurav_salve'...")
verify_res = requests.post(f"{base_url}/api/auth/verify-otp", json={
    "phone": "+918208287971",
    "otp": otp_code,
    "fullName": "Gaurav Salve",
    "username": "gaurav_salve"
})
verify_data = verify_res.json()
print("Verify OTP response user object:", verify_data.get("user"))
