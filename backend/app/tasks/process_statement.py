import uuid
from app.tasks.celery_app import celery_app


@celery_app.task(bind=True, max_retries=3)
def process_statement(self, job_id: str):
    from app.db.session import SessionLocal
    from app.models.upload import UploadJob
    from app.models.transaction import Transaction
    from app.models.category import Category
    from app.core.storage import get_object
    from app.core.cache import cache_delete_pattern
    from app.analytics.etl import run_etl

    db = SessionLocal()
    try:
        job = db.query(UploadJob).filter(UploadJob.id == uuid.UUID(job_id)).first()
        if not job:
            return

        job.status = "PROCESSING"
        db.commit()

        content = get_object(job.storage_key)
        filename = job.storage_key.split("/")[-1]

        records, quarantine_count = run_etl(content, filename, str(job.user_id))

        # Resolve category names to IDs
        cat_cache: dict[str, uuid.UUID | None] = {}

        def get_or_create_category(name: str) -> uuid.UUID | None:
            if name in cat_cache:
                return cat_cache[name]
            cat = db.query(Category).filter(Category.name == name).first()
            if not cat:
                cat = Category(name=name, is_system=False)
                db.add(cat)
                db.flush()
            cat_cache[name] = cat.id
            return cat.id

        inserted = 0
        for rec in records:
            cat_id = get_or_create_category(rec.pop("category_name", "Uncategorized"))
            txn = Transaction(
                id=uuid.uuid4(),
                user_id=uuid.UUID(rec["user_id"]),
                account_id=uuid.UUID(rec["account_id"]) if rec.get("account_id") else None,
                category_id=cat_id,
                upload_job_id=job.id,
                txn_date=rec["txn_date"],
                amount=rec["amount"],
                direction=rec["direction"],
                merchant_raw=rec["merchant_raw"],
                merchant_norm=rec["merchant_norm"],
                description=rec["description"],
                txn_hash=rec["txn_hash"],
            )
            from sqlalchemy.exc import IntegrityError
            try:
                db.add(txn)
                db.flush()
                inserted += 1
            except IntegrityError:
                db.rollback()

        job.status = "DONE"
        job.rows_inserted = inserted
        db.commit()

        # Invalidate analytics cache for this user
        cache_delete_pattern(f"dashboard:{job.user_id}:*")
        cache_delete_pattern(f"categories:{job.user_id}:*")
        cache_delete_pattern(f"trends:{job.user_id}:*")

    except Exception as exc:
        db.rollback()
        job = db.query(UploadJob).filter(UploadJob.id == uuid.UUID(job_id)).first()
        if job:
            job.status = "FAILED"
            job.error = str(exc)
            db.commit()
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()
