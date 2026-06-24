"""Bank-format adapters: detect column layout, return canonical DataFrame."""
import re
from typing import Protocol
import pandas as pd


CANONICAL = ["txn_date", "amount", "direction", "merchant_raw", "description"]


class BankAdapter(Protocol):
    def matches(self, columns: list[str]) -> bool: ...
    def to_canonical(self, df: pd.DataFrame) -> pd.DataFrame: ...


class HDFCAdapter:
    def matches(self, columns: list[str]) -> bool:
        cols = {c.lower().strip() for c in columns}
        return {"date", "withdrawal amt.", "deposit amt.", "narration"}.issubset(cols) or \
               {"date", "withdrawal amt", "deposit amt", "narration"}.issubset(cols)

    def to_canonical(self, df: pd.DataFrame) -> pd.DataFrame:
        df.columns = [c.lower().strip() for c in df.columns]
        out = pd.DataFrame()
        out["txn_date"] = df.get("date", df.get("value dt"))
        withdrawal_col = next((c for c in df.columns if "withdrawal" in c), None)
        deposit_col = next((c for c in df.columns if "deposit" in c), None)
        out["_withdrawal"] = pd.to_numeric(df[withdrawal_col].astype(str).str.replace(",", ""), errors="coerce").fillna(0) if withdrawal_col else 0
        out["_deposit"] = pd.to_numeric(df[deposit_col].astype(str).str.replace(",", ""), errors="coerce").fillna(0) if deposit_col else 0
        out["amount"] = out[["_withdrawal", "_deposit"]].max(axis=1)
        out["direction"] = out.apply(lambda r: "debit" if r["_withdrawal"] > 0 else "credit", axis=1)
        out["merchant_raw"] = df.get("narration", "")
        out["description"] = df.get("narration", "")
        return out[CANONICAL]


class ICICIAdapter:
    def matches(self, columns: list[str]) -> bool:
        cols = {c.lower().strip() for c in columns}
        return {"transaction date", "debit", "credit", "remarks"}.issubset(cols)

    def to_canonical(self, df: pd.DataFrame) -> pd.DataFrame:
        df.columns = [c.lower().strip() for c in df.columns]
        out = pd.DataFrame()
        out["txn_date"] = df["transaction date"]
        debit = pd.to_numeric(df["debit"].astype(str).str.replace(",", ""), errors="coerce").fillna(0)
        credit = pd.to_numeric(df["credit"].astype(str).str.replace(",", ""), errors="coerce").fillna(0)
        out["amount"] = debit.combine(credit, max)
        out["direction"] = debit.apply(lambda x: "debit" if x > 0 else "credit")
        out["merchant_raw"] = df.get("remarks", "")
        out["description"] = df.get("remarks", "")
        return out[CANONICAL]


class GenericAdapter:
    """Fuzzy fallback — tries to detect date, amount, direction columns."""

    def matches(self, columns: list[str]) -> bool:
        return True  # always matches as last resort

    def to_canonical(self, df: pd.DataFrame) -> pd.DataFrame:
        df.columns = [c.lower().strip() for c in df.columns]
        out = pd.DataFrame()

        date_col = next((c for c in df.columns if re.search(r"date|dt", c)), None)
        out["txn_date"] = df[date_col] if date_col else None

        amount_col = next((c for c in df.columns if re.search(r"amount|amt|sum|value", c)), None)
        if amount_col:
            raw_amt = df[amount_col].astype(str).str.replace(r"[₹,\s]", "", regex=True)
            out["amount"] = pd.to_numeric(raw_amt, errors="coerce").abs()
        else:
            debit_col = next((c for c in df.columns if "debit" in c or "dr" == c), None)
            credit_col = next((c for c in df.columns if "credit" in c or "cr" == c), None)
            debit = pd.to_numeric(df[debit_col].astype(str).str.replace(",", ""), errors="coerce").fillna(0) if debit_col else pd.Series([0]*len(df))
            credit = pd.to_numeric(df[credit_col].astype(str).str.replace(",", ""), errors="coerce").fillna(0) if credit_col else pd.Series([0]*len(df))
            out["amount"] = debit.combine(credit, max)
            out["direction"] = debit.apply(lambda x: "debit" if x > 0 else "credit")

        if "direction" not in out.columns:
            dir_col = next((c for c in df.columns if re.search(r"type|cr.?dr|direction", c)), None)
            if dir_col:
                out["direction"] = df[dir_col].str.lower().map(
                    lambda x: "debit" if any(w in str(x) for w in ["dr", "debit", "withdrawal"]) else "credit"
                )
            else:
                out["direction"] = "debit"

        desc_col = next((c for c in df.columns if re.search(r"desc|narr|remark|particular|detail", c)), None)
        out["merchant_raw"] = df[desc_col] if desc_col else ""
        out["description"] = out["merchant_raw"]
        return out[CANONICAL]


ADAPTERS: list[BankAdapter] = [HDFCAdapter(), ICICIAdapter(), GenericAdapter()]


def detect_adapter(columns: list[str]) -> BankAdapter:
    for adapter in ADAPTERS:
        if adapter.matches(columns):
            return adapter
    return GenericAdapter()
