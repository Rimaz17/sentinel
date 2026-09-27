"""What a normal week looks like: expected reports per district and symptom group.

The figures are invented but shaped by what is known: dengue concentrates in the
urban west and in Jaffna and barely reaches the cool hill country; leptospirosis
follows the paddy-farming wet zone (Ratnapura, Kegalle, Galle, Kurunegala);
influenza-like and gastrointestinal illness roughly follow population. Kandy's
dengue baseline is the project overview's worked example, 25 a week.

Counts are drawn from a Poisson distribution around these means, so a week with a
mean of 25 usually lands between 20 and 30, as the overview describes.
"""

from __future__ import annotations

DENGUE_LIKE = "DENGUE_LIKE"
INFLUENZA_LIKE = "INFLUENZA_LIKE"
GASTROINTESTINAL = "GASTROINTESTINAL"
LEPTOSPIROSIS_LIKE = "LEPTOSPIROSIS_LIKE"

SYMPTOM_GROUPS = (DENGUE_LIKE, INFLUENZA_LIKE, GASTROINTESTINAL, LEPTOSPIROSIS_LIKE)

# district code: (dengue-like, influenza-like, gastrointestinal, leptospirosis-like)
_WEEKLY = {
    "CMB": (40, 60, 30, 3),
    "GMP": (35, 55, 28, 5),
    "KLT": (18, 30, 16, 8),
    "KDY": (25, 35, 18, 4),
    "MTL": (8, 12, 7, 3),
    "NEL": (2, 18, 9, 3),
    "GAL": (14, 25, 14, 10),
    "MTR": (10, 18, 10, 6),
    "HMB": (6, 13, 8, 4),
    "JAF": (20, 14, 10, 1),
    "KIL": (3, 4, 3, 1),
    "MNR": (3, 3, 2, 1),
    "VAV": (3, 5, 3, 1),
    "MUL": (2, 3, 2, 1),
    "BTC": (12, 12, 9, 1),
    "AMP": (7, 15, 9, 3),
    "TRC": (8, 9, 6, 1),
    "KUR": (18, 35, 20, 9),
    "PTM": (12, 18, 10, 3),
    "ANU": (7, 18, 11, 5),
    "POL": (4, 8, 5, 3),
    "BDL": (5, 18, 10, 4),
    "MON": (3, 10, 6, 3),
    "RAT": (12, 22, 12, 14),
    "KEG": (12, 18, 10, 11),
}

WEEKLY_BASELINES: dict[str, dict[str, float]] = {
    district: dict(zip(SYMPTOM_GROUPS, means, strict=True)) for district, means in _WEEKLY.items()
}
