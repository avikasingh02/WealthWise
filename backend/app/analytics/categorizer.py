"""Rule-based categorization engine (Tier 1)."""
import re

RULES: list[tuple[str, str, int]] = [
    # (pattern, category_name, priority)
    (r"swiggy|zomato|domino|pizz|burger|kfc|mcdonal|food|restaurant|cafe|hotel", "Food & Dining", 10),
    (r"uber|ola|rapido|irctc|railways|metro|petrol|fuel|bpcl|hpcl|iocl", "Transport", 20),
    (r"amazon|flipkart|myntra|snapdeal|meesho|ajio|shop|store|mart", "Shopping", 30),
    (r"netflix|spotify|hotstar|prime|disney|youtube premium|subscription|renewal", "Entertainment", 40),
    (r"electricity|water|gas|broadband|internet|airtel|jio|vodafone|bsnl|bill|recharge", "Utilities", 50),
    (r"apollo|pharmacy|medical|hospital|doctor|clinic|health|medicine", "Healthcare", 60),
    (r"college|school|tuition|udemy|coursera|education|book|stationery", "Education", 70),
    (r"rent|pg|hostel|landlord|maintenance|society", "Housing", 80),
    (r"salary|credit|income|cashback|refund|interest|dividend", "Income", 5),
    (r"emi|loan|mortgage|repayment|credit card", "Debt Payments", 15),
    (r"insurance|lic|hdfc life|sbi life|star health", "Insurance", 25),
    (r"travel|hotel|flight|makemytrip|goibibo|cleartrip|oyo|booking", "Travel", 35),
    (r"atm|cash withdrawal|withdraw", "Cash Withdrawal", 45),
    (r"invest|mutual fund|sip|stocks|zerodha|groww|upstox|nps|ppf", "Investments", 55),
]

_COMPILED = [(re.compile(pat, re.IGNORECASE), cat, pri) for pat, cat, pri in RULES]


class Categorizer:
    def predict(self, merchant_norm: str, description: str) -> tuple[str, float]:
        text = f"{merchant_norm} {description}".lower()
        best: tuple[str, float] | None = None
        best_priority = 9999

        for pattern, category, priority in _COMPILED:
            if pattern.search(text):
                if priority < best_priority:
                    best_priority = priority
                    best = (category, 1.0)

        return best if best else ("Uncategorized", 0.0)
