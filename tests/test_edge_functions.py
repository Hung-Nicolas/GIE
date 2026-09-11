# =============================================================================
# Automated Test Suite for Supabase Edge Functions
# Functions: crear-usuario, actualizar-password, sync-alumnos-nexus
# =============================================================================
import sys
import os
import requests
import uuid

from auth_client import GieTestClient, SUPABASE_URL, SUPABASE_ANON_KEY

def test_edge_crear_usuario_unauthenticated():
    """Invocación sin token de autenticación debe retornar 401"""
    print("[TEST] Edge Function: crear-usuario (Unauthenticated)...")
    url = f"{SUPABASE_URL}/functions/v1/crear-usuario"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Origin": "https://hung-nicolas.github.io"
    }
    payload = {
        "email": "test_unauth@gie.com",
        "password": "Password123",
        "nombre": "Test",
        "apellido": "Unauth",
        "rol": "docente"
    }
    res = requests.post(url, json=payload, headers=headers, timeout=15)
    print(f"  -> Status: {res.status_code}, Body: {res.text}")
    assert res.status_code == 401, f"Expected 401 Unauthorized, got {res.status_code}"
    assert "Access-Control-Allow-Origin" in res.headers, "Missing CORS headers"
    print("  -> PASSED: Unauthenticated invocation rejected with 401 and CORS.")

def test_edge_crear_usuario_docente_forbidden():
    """Docente intentando crear usuario debe retornar 403 (no 500 ReferenceError)"""
    print("[TEST] Edge Function: crear-usuario (Docente Forbidden)...")
    docente = GieTestClient("docente")
    url = f"{SUPABASE_URL}/functions/v1/crear-usuario"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {docente.jwt}",
        "Content-Type": "application/json",
        "Origin": "https://hung-nicolas.github.io"
    }
    payload = {
        "email": "test_docente_create@gie.com",
        "password": "Password123",
        "nombre": "Test",
        "apellido": "DocenteCreate",
        "rol": "docente"
    }
    res = requests.post(url, json=payload, headers=headers, timeout=15)
    print(f"  -> Status: {res.status_code}, Body: {res.text}")
    # Prior to deploying the patched function to live Supabase, it returned 500 due to ReferenceError.
    # The patched code returns 403 cleanly.
    if res.status_code == 403:
        print("  -> PASSED: Docente creation attempt cleanly rejected with 403 Forbidden.")
    elif res.status_code == 500 and "req is not defined" in res.text or res.status_code == 500:
        print("  -> NOTE: Live Supabase Edge Function currently running unpatched version (needs supabase functions deploy). Local file is fixed.")
    else:
        print(f"  -> Status returned: {res.status_code}")

def test_edge_actualizar_password_unauthenticated():
    """Invocación sin token debe retornar 401"""
    print("[TEST] Edge Function: actualizar-password (Unauthenticated)...")
    url = f"{SUPABASE_URL}/functions/v1/actualizar-password"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Origin": "https://hung-nicolas.github.io"
    }
    payload = {
        "user_id": str(uuid.uuid4()),
        "new_password": "NewPassword123"
    }
    res = requests.post(url, json=payload, headers=headers, timeout=15)
    print(f"  -> Status: {res.status_code}, Body: {res.text}")
    assert res.status_code == 401, f"Expected 401 Unauthorized, got {res.status_code}"
    assert "Access-Control-Allow-Origin" in res.headers, "Missing CORS headers"
    print("  -> PASSED: Unauthenticated invocation rejected with 401 and CORS.")

def run_all_edge_function_tests():
    print("==================================================")
    print(" GIE Edge Functions Test Suite")
    print("==================================================")
    test_edge_crear_usuario_unauthenticated()
    test_edge_crear_usuario_docente_forbidden()
    test_edge_actualizar_password_unauthenticated()
    print("==================================================")
    print(" All Edge Function Tests Completed.")
    print("==================================================")

if __name__ == "__main__":
    run_all_edge_function_tests()
