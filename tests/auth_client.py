# =============================================================================
# GIE Backend Test Client Helper
# =============================================================================
import os
import json
import requests
from typing import Dict, Any, Optional

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://fcrmykzlwfyxgepiygbo.supabase.co")
SUPABASE_ANON_KEY = os.environ.get(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjcm15a3psd2Z5eGdlcGl5Z2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzYxNjEsImV4cCI6MjA5MjM1MjE2MX0."
    "x3AFi49-SjdeTc1ORGZFbk68aiXM6VAQi0XVzRoG9Hs"
)

ROLE_CREDENTIALS = {
    "admin": {"email": "admin@gie.com", "password": "123asd", "role": "regente"},
    "regente": {"email": "admin@gie.com", "password": "123asd", "role": "regente"},
    "doe": {"email": "doe@gmail.com", "password": "123asd", "role": "doe"},
    "pat": {"email": "pat@gie.com", "password": "asd123", "role": "pat"},
    "docente": {"email": "docente@gie.com", "password": "asd123", "role": "docente"}
}

class GieTestClient:
    def __init__(self, role_name: Optional[str] = None):
        self.role_name = role_name
        self.session = requests.Session()
        self.jwt: Optional[str] = None
        self.user_id: Optional[str] = None
        self.perfil: Optional[Dict[str, Any]] = None

        if role_name and role_name in ROLE_CREDENTIALS:
            self._login(role_name)

    def _login(self, role_name: str):
        creds = ROLE_CREDENTIALS[role_name]
        url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
        }
        payload = {"email": creds["email"], "password": creds["password"]}
        res = self.session.post(url, json=payload, headers=headers, timeout=15)
        if res.status_code != 200:
            raise RuntimeError(f"Login failed for role {role_name} ({creds['email']}): {res.text}")
        data = res.json()
        self.jwt = data["access_token"]
        self.user_id = data["user"]["id"]

        # Fetch profile
        perfil_res = self.get("perfiles", params={"id": f"eq.{self.user_id}", "select": "*"})
        if perfil_res.status_code == 200 and perfil_res.json():
            self.perfil = perfil_res.json()[0]

    def _headers(self, custom: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        h = {
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        if self.jwt:
            h["Authorization"] = f"Bearer {self.jwt}"
        if custom:
            h.update(custom)
        return h

    def get(self, table: str, params: Optional[Dict[str, Any]] = None, custom_headers: Optional[Dict[str, str]] = None):
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        return self.session.get(url, params=params, headers=self._headers(custom_headers), timeout=15)

    def post(self, table: str, json_data: Any, params: Optional[Dict[str, Any]] = None, custom_headers: Optional[Dict[str, str]] = None):
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        return self.session.post(url, json=json_data, params=params, headers=self._headers(custom_headers), timeout=15)

    def patch(self, table: str, json_data: Any, params: Optional[Dict[str, Any]] = None, custom_headers: Optional[Dict[str, str]] = None):
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        return self.session.patch(url, json=json_data, params=params, headers=self._headers(custom_headers), timeout=15)

    def delete(self, table: str, params: Optional[Dict[str, Any]] = None, custom_headers: Optional[Dict[str, str]] = None):
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        return self.session.delete(url, params=params, headers=self._headers(custom_headers), timeout=15)

    def rpc(self, fn_name: str, payload: Dict[str, Any], custom_headers: Optional[Dict[str, str]] = None):
        url = f"{SUPABASE_URL}/rest/v1/rpc/{fn_name}"
        return self.session.post(url, json=payload, headers=self._headers(custom_headers), timeout=15)

    def get_next_report_number(self) -> int:
        admin_c = GieTestClient("admin") if self.role_name != "admin" else self
        res = admin_c.get("informes", params={"select": "numero", "order": "numero.desc", "limit": "1"})
        if res.status_code == 200 and res.json() and res.json()[0].get("numero") is not None:
            return int(res.json()[0]["numero"]) + 1
        return 202600600
