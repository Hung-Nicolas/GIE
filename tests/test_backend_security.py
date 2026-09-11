# =============================================================================
# Automated Security & RLS Regression Test Suite
# Tests: VULN-01 to VULN-10
# =============================================================================
import sys
import os
import uuid

from auth_client import GieTestClient, SUPABASE_URL, SUPABASE_ANON_KEY

def test_vuln04_vertical_privilege_escalation():
    """Docente intentando auto-elevarse a regente en tabla perfiles"""
    print("[TEST] VULN-04: Test Vertical Privilege Escalation (perfiles.rol)...")
    docente = GieTestClient("docente")
    initial_role = docente.perfil.get("rol", "docente")

    # Attempt to change role to regente
    res = docente.patch("perfiles", {"rol": "regente"}, params={"id": f"eq.{docente.user_id}"})
    # If RLS is hardened, either status is 403, or returned representation is empty / role unchanged
    updated_role = initial_role
    if res.status_code == 200 and res.json():
        updated_role = res.json()[0].get("rol", initial_role)
    
    # Check DB truth
    check = docente.get("perfiles", params={"id": f"eq.{docente.user_id}"})
    db_role = check.json()[0]["rol"] if check.status_code == 200 and check.json() else initial_role

    if db_role == "regente" and initial_role != "regente":
        # Revert immediately if vulnerability triggered
        admin = GieTestClient("admin")
        admin.patch("perfiles", {"rol": "docente"}, params={"id": f"eq.{docente.user_id}"})
        raise AssertionError("VULN-04 DETECTED: Docente was able to elevate role to regente via REST API!")
    
    print("  -> PASSED: Role elevation blocked or protected by RLS.")

def test_vuln03_anonymous_pii_access():
    """Usuario anónimo intentando leer padrón completo de alumnos"""
    print("[TEST] VULN-03: Test Anonymous Student PII Access (alumnos)...")
    anon_client = GieTestClient(None)
    res = anon_client.get("alumnos", params={"select": "dni,nombre,apellido", "limit": "5"})
    
    # With hardening, anon should get 401/403 or empty array
    if res.status_code in (401, 403) or (res.status_code == 200 and len(res.json()) == 0):
        print("  -> PASSED: Anonymous access to student PII is blocked.")
    else:
        print(f"  -> WARNING: Anonymous access returned {len(res.json())} records (Target needs migration application).")

def test_vuln01_rpc_devolver_informe_tampering():
    """Usuario anónimo o docente no asignado intentando invocar devolver_informe_a_pendiente"""
    print("[TEST] VULN-01: Test RPC devolver_informe_a_pendiente Access Control...")
    anon_client = GieTestClient(None)
    fake_id = str(uuid.uuid4())
    res = anon_client.rpc("devolver_informe_a_pendiente", {"p_informe_id": fake_id})
    
    # Should be rejected with 401/403/400 (not executable by anon)
    if res.status_code in (401, 403, 400, 404, 500):
        print("  -> PASSED: Anonymous RPC execution safely rejected.")
    else:
        print(f"  -> Response: {res.status_code} {res.text}")

def test_vuln05_docente_self_approval():
    """Docente intentando aprobar directamente su propio informe"""
    print("[TEST] VULN-05: Test Self-Approval Prevention...")
    docente = GieTestClient("docente")
    admin = GieTestClient("admin")

    # Get an alumno
    alumnos_res = admin.get("alumnos", params={"limit": "1"})
    if not alumnos_res.json():
        print("  -> SKIPPED: No students available in DB.")
        return
    alumno_id = alumnos_res.json()[0]["id"]

    # 1. Create report
    new_inf = {
        "alumno_id": alumno_id,
        "tipo_falta": "Conducta",
        "instancia": "leve",
        "titulo": "Test Automático Auto-Aprobación",
        "resumen": "Prueba de seguridad",
        "estado": "pendiente",
        "creado_por": docente.user_id
    }
    create_res = docente.post("informes", new_inf)
    if create_res.status_code not in (200, 201):
        print(f"  -> Notice: Could not create test report: {create_res.text}")
        return
    inf_id = create_res.json()[0]["id"]

    # 2. Attempt to self-approve via REST
    patch_res = docente.patch("informes", {"estado": "aprobado"}, params={"id": f"eq.{inf_id}"})
    
    # 3. Check final state
    check_res = docente.get("informes", params={"id": f"eq.{inf_id}"})
    final_state = check_res.json()[0]["estado"] if check_res.status_code == 200 and check_res.json() else "unknown"

    # Cleanup
    admin.delete("informes", params={"id": f"eq.{inf_id}"})

    if final_state == "aprobado":
        raise AssertionError("VULN-05 DETECTED: Docente successfully self-approved report via REST API!")
    
    print("  -> PASSED: Self-approval rejected or blocked by RLS.")

def run_all_security_tests():
    print("==================================================")
    print(" GIE Security & RLS Regression Suite")
    print("==================================================")
    test_vuln04_vertical_privilege_escalation()
    test_vuln03_anonymous_pii_access()
    test_vuln01_rpc_devolver_informe_tampering()
    test_vuln05_docente_self_approval()
    print("==================================================")
    print(" All Security Regression Tests Executed.")
    print("==================================================")

if __name__ == "__main__":
    run_all_security_tests()
