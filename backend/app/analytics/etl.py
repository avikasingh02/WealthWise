"""ETL pipeline — pure functions, no DB/HTTP dependencies."""
import hashlib
import io
import re
import uuid

import pandas as pd

from app.analytics.adapters import detect_adapter, CANONICAL
from app.analytics.categorizer import Categorizer


def _normalize_merchant(raw: str) -> str:
    if not raw:
        return ""
    s = str(raw).lower()
    s = re.sub(r"@\S+", "", s)           # remove UPI handles
    s = re.sub(r"\d{8,}", "", s)          # remove long ref numbers
    s = re.sub(r"[^a-z0-9\s]", " ", s)   # keep alphanum + spaces
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _compute_txn_hash(user_id: str, txn_date: str, amount: str, merchant_raw: str, description: str) -> str:
    raw = f"{user_id}|{txn_date}|{amount}|{merchant_raw}|{description}"
    return hashlib.sha256(raw.encode()).hexdigest()


def parse_file(content: bytes, filename: str) -> pd.DataFrame:
    """Read raw file bytes into a raw DataFrame."""
    if filename.endswith(".xlsx") or filename.endswith(".xls"):
        return pd.read_excel(io.BytesIO(content))
    return pd.read_csv(io.StringIO(content.decode("utf-8", errors="replace")))


def run_etl(content: bytes, filename: str, user_id: str, account_id: str | None = None) -> tuple[list[dict], int]:
    """
    Run the full ETL pipeline.
    Returns (list_of_transaction_dicts, quarantine_count).
    """
    raw_df = parse_file(content, filename)

    adapter = detect_adapter(list(raw_df.columns))
    df = adapter.to_canonical(raw_df)

    # --- Standardize dates ---
    df["txn_date"] = pd.to_datetime(df["txn_date"], dayfirst=True, errors="coerce")

    # --- Normalize amounts ---
    df["amount"] = pd.to_numeric(df["amount"].astype(str).str.replace(r"[₹,\s]", "", regex=True), errors="coerce").abs()

    # --- Fill missing ---
    df["merchant_raw"] = df["merchant_raw"].fillna("").astype(str)
    df["description"] = df["description"].fillna("").astype(str)

    # --- Quarantine invalid rows ---
    valid_mask = df["txn_date"].notna() & df["amount"].notna() & (df["amount"] > 0)
    quarantine_count = int((~valid_mask).sum())
    df = df[valid_mask].copy()

    # --- Merchant normalize ---
    df["merchant_norm"] = df["merchant_raw"].apply(_normalize_merchant)

    # --- Categorize ---
    categorizer = Categorizer()
    df["category_name"] = df.apply(lambda r: categorizer.predict(r["merchant_norm"], r["description"])[0], axis=1)

    # --- txn_hash ---
    df["txn_hash"] = df.apply(
        lambda r: _compute_txn_hash(
            user_id, str(r["txn_date"].date()), str(r["amount"]), r["merchant_raw"], r["description"]
        ),
        axis=1,
    )

    records = []
    for _, row in df.iterrows():
        records.append({
            "user_id": user_id,
            "account_id": account_id,
            "txn_date": row["txn_date"].date(),
            "amount": float(row["amount"]),
            "direction": str(row.get("direction", "debit")),
            "merchant_raw": row["merchant_raw"],
            "merchant_norm": row["merchant_norm"],
            "description": row["description"],
            "txn_hash": row["txn_hash"],
            "category_name": row["category_name"],
        })

    return records, quarantine_count
