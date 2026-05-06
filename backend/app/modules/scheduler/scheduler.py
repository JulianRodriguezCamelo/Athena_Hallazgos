import os
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = BackgroundScheduler(timezone="America/Bogota")


def init_scheduler(app):
    enabled = app.config.get("SCHEDULER_ENABLED", os.environ.get("SCHEDULER_ENABLED", "false"))
    if str(enabled).lower() != "true":
        return

    def _job_alertas_vencimiento():
        with app.app_context():
            try:
                from datetime import date, timedelta
                from app.models.hallazgo import Hallazgo
                from app.models.actividad import Actividad
                from app.modules.notifcations.service import NotificationService

                hoy = date.today()
                limite = hoy + timedelta(days=7)
                hallazgos = Hallazgo.query.filter(
                    Hallazgo.fecha_cierre_proyectada.between(hoy, limite),
                    ~Hallazgo.estado.ilike("%cerrad%"),
                ).all()
                for h in hallazgos:
                    NotificationService.alerta_vencimiento_automatica(h, "hallazgo")
                actividades = Actividad.query.filter(
                    Actividad.fecha_compromiso.between(hoy, limite),
                    ~Actividad.estado_accion.ilike("%cerrad%"),
                ).all()
                for a in actividades:
                    NotificationService.alerta_vencimiento_automatica(a, "actividad")
            except Exception as e:
                app.logger.error(f"[scheduler] alertas_vencimiento: {e}")

    def _job_resumen_semanal():
        with app.app_context():
            try:
                from app.modules.notifcations.service import NotificationService
                NotificationService.enviar_resumen_semanal_a_todos()
            except Exception as e:
                app.logger.error(f"[scheduler] resumen_semanal: {e}")

    def _job_alertas_nota_mensual():
        with app.app_context():
            try:
                from app.models.actividad import Actividad
                from app.modules.notifcations.service import NotificationService

                actividades = Actividad.query.filter(
                    ~Actividad.estado_accion.ilike("%cerrad%"),
                    ~Actividad.estado_accion.ilike("%completad%"),
                    ~Actividad.estado_accion.ilike("%cumplid%"),
                ).all()
                for a in actividades:
                    if a.sin_nota_mensual:
                        NotificationService.alerta_nota_mensual(a)
            except Exception as e:
                app.logger.error(f"[scheduler] alertas_nota_mensual: {e}")

    scheduler.add_job(
        _job_alertas_vencimiento,
        CronTrigger(hour=8, minute=0),
        id="alertas_vencimiento",
        replace_existing=True,
    )
    scheduler.add_job(
        _job_resumen_semanal,
        CronTrigger(day_of_week="mon", hour=8, minute=0),
        id="resumen_semanal",
        replace_existing=True,
    )
    scheduler.add_job(
        _job_alertas_nota_mensual,
        CronTrigger(day_of_week="mon", hour=8, minute=30),
        id="alertas_nota_mensual",
        replace_existing=True,
    )

    if not scheduler.running:
        scheduler.start()
