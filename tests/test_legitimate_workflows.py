# =============================================================================
# Automated Legitimate Workflows Test Suite
# Tests: Flujo 1 (Derivación/Intervención) & Flujo 2 (Rechazo/Corrección)
# =============================================================================
import sys
import os
import uuid
import datetime

from auth_client import GieTestClient

def test_flujo1_circuito_derivacion_doe():
    """Flujo completo Docente -> Regente (Deriva) -> DOE (Interviene y Devuelve) -> Regente (Cierre)"""
    print("[TEST] Flujo 1: Circuito Completo Docente -> Regente -> DOE -> Regente...")
    docente = GieTestClient("docente")
    regente = GieTestClient("regente")
    doe = GieTestClient("doe")

    # 1. Obtener un alumno y categoría
    alumnos_res = docente.get("alumnos", params={"limit": "1"})
    assert alumnos_res.status_code == 200 and alumnos_res.json(), "No se pudo obtener alumno para la prueba"
    alumno_id = alumnos_res.json()[0]["id"]

    cat_res = docente.get("categorias", params={"limit": "1"})
    cat_id = cat_res.json()[0]["id"] if cat_res.status_code == 200 and cat_res.json() else None

    # 2. Docente crea informe
    next_num = docente.get_next_report_number()
    nuevo_informe = {
        "numero": next_num,
        "alumno_id": alumno_id,
        "categoria_id": cat_id,
        "tipo_falta": "Conducta",
        "instancia": "grave",
        "titulo": f"Prueba Automatizada de Circuito DOE N°{next_num}",
        "resumen": "Prueba de verificación de flujo institucional",
        "estado": "pendiente",
        "creado_por": docente.user_id
    }
    create_res = docente.post("informes", nuevo_informe)
    assert create_res.status_code in (200, 201), f"Fallo al crear informe: {create_res.text}"
    inf_id = create_res.json()[0]["id"]
    print(f"  [Paso 1] Docente creó informe {inf_id} (N°{next_num}, estado: pendiente)")

    try:
        # 3. Regente deriva al DOE
        deriv_res = regente.patch("informes", {"estado": "derivado", "derivado_a": doe.user_id}, params={"id": f"eq.{inf_id}"})
        assert deriv_res.status_code == 200, f"Fallo al derivar informe: {deriv_res.text}"
        print(f"  [Paso 2] Regente derivó al DOE ({doe.user_id})")

        # 4. DOE registra observación
        obs_res = doe.post("historial_informes", {
            "informe_id": inf_id,
            "usuario_id": doe.user_id,
            "accion": "Intervencion DOE",
            "detalle": "Intervención de prueba automatizada completada"
        })
        print(f"  [Paso 3] DOE registró intervención")

        # 5. DOE devuelve a pendiente vía RPC
        rpc_res = doe.rpc("devolver_informe_a_pendiente", {"p_informe_id": inf_id})
        assert rpc_res.status_code in (200, 204), f"Fallo en RPC devolución: {rpc_res.text}"
        print(f"  [Paso 4] DOE devolvió informe a Regencia vía RPC")

        # 6. Regente archiva el informe
        archive_res = regente.patch("informes", {"estado": "archivado"}, params={"id": f"eq.{inf_id}"})
        assert archive_res.status_code == 200, f"Fallo al archivar informe: {archive_res.text}"
        print(f"  [Paso 5] Regente archivó informe exitosamente")
        print("  -> PASSED: Flujo 1 completado exitosamente.")

    finally:
        # Limpieza de informe de prueba
        regente.delete("informes", params={"id": f"eq.{inf_id}"})

def test_flujo2_rechazo_y_correccion():
    """Flujo Docente crea -> Regente anula con motivo -> Docente envía corrección -> Regente aprueba (revisado)"""
    print("[TEST] Flujo 2: Circuito de Rechazo, Corrección y Aprobación...")
    docente = GieTestClient("docente")
    regente = GieTestClient("regente")

    alumnos_res = docente.get("alumnos", params={"limit": "1"})
    alumno_id = alumnos_res.json()[0]["id"]
    cat_res = docente.get("categorias", params={"limit": "1"})
    cat_id = cat_res.json()[0]["id"] if cat_res.status_code == 200 and cat_res.json() else None

    # 1. Docente crea informe preliminar
    next_num1 = docente.get_next_report_number()
    inf_res1 = docente.post("informes", {
        "numero": next_num1,
        "alumno_id": alumno_id,
        "categoria_id": cat_id,
        "tipo_falta": "Pedagogica",
        "instancia": "leve",
        "titulo": f"Informe preliminar con omisión N°{next_num1}",
        "resumen": "Faltan datos",
        "estado": "pendiente",
        "creado_por": docente.user_id
    })
    assert inf_res1.status_code in (200, 201), f"Fallo creando informe: {inf_res1.text}"
    inf_id1 = inf_res1.json()[0]["id"]

    inf_id2 = None
    try:
        # 2. Regente anula/rechaza con motivo
        rechazo_res = regente.patch("informes", {
            "estado": "anulado",
            "motivo_rechazo": "Por favor ampliar el resumen y adjuntar descargo",
            "revisado_por": regente.user_id
        }, params={"id": f"eq.{inf_id1}"})
        assert rechazo_res.status_code == 200, f"Fallo al rechazar: {rechazo_res.text}"
        print("  [Paso 1] Regente anuló informe con motivo formal")

        # 3. Docente envía versión corregida
        next_num2 = docente.get_next_report_number()
        inf_res2 = docente.post("informes", {
            "numero": next_num2,
            "alumno_id": alumno_id,
            "categoria_id": cat_id,
            "tipo_falta": "Pedagogica",
            "instancia": "leve",
            "titulo": f"Informe corregido y completo N°{next_num2}",
            "resumen": "Resumen completo corregido con observaciones detalladas",
            "descargo": "Descargo del estudiante registrado formalmente",
            "estado": "pendiente",
            "creado_por": docente.user_id
        })
        assert inf_res2.status_code in (200, 201), f"Fallo al enviar corrección: {inf_res2.text}"
        inf_id2 = inf_res2.json()[0]["id"]
        print(f"  [Paso 2] Docente remitió versión corregida N°{next_num2}")

        # 4. Regente aprueba formalmente (estado: revisado)
        aprob_res = regente.patch("informes", {
            "estado": "revisado",
            "revisado_por": regente.user_id,
            "fecha_revision": datetime.datetime.now().isoformat()
        }, params={"id": f"eq.{inf_id2}"})
        assert aprob_res.status_code == 200, f"Fallo al aprobar: {aprob_res.text}"
        print("  [Paso 3] Regente aprobó informe corregido (estado: revisado)")
        print("  -> PASSED: Flujo 2 completado exitosamente.")

    finally:
        regente.delete("informes", params={"id": f"eq.{inf_id1}"})
        if inf_id2:
            regente.delete("informes", params={"id": f"eq.{inf_id2}"})

def run_all_workflow_tests():
    print("==================================================")
    print(" GIE Legitimate Workflows Test Suite")
    print("==================================================")
    test_flujo1_circuito_derivacion_doe()
    test_flujo2_rechazo_y_correccion()
    print("==================================================")
    print(" All Workflow Tests Executed Successfully.")
    print("==================================================")

if __name__ == "__main__":
    run_all_workflow_tests()
