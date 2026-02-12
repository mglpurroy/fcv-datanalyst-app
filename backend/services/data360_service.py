"""
Data360 Service
Fetches World Bank population series from Data360 API and prepares a join-ready dataframe.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import re

import pandas as pd
import requests


@dataclass
class PopulationFetchResult:
    df_pop: pd.DataFrame
    warnings: List[str]


class Data360Service:
    BASE_URL = "https://data360api.worldbank.org/data360/data"
    DATABASE_ID = "WB_WDI"
    INDICATOR = "WB_WDI_SP_POP_TOTL"
    REQUEST_TIMEOUT_SECONDS = 25
    PAGE_SIZE = 1000

    # ACLED/WDI name mismatches we can resolve safely
    COUNTRY_ALIASES = {
        "Bolivia": "BOL",
        "Cabo Verde": "CPV",
        "Cote d'Ivoire": "CIV",
        "Cote dIvoire": "CIV",
        "Czech Republic": "CZE",
        "Congo-Brazzaville": "COG",
        "Congo - Brazzaville": "COG",
        "Congo-Kinshasa": "COD",
        "Congo - Kinshasa": "COD",
        "Democratic Republic of Congo": "COD",
        "DR Congo": "COD",
        "Eswatini": "SWZ",
        "Iran": "IRN",
        "Kyrgyz Republic": "KGZ",
        "Laos": "LAO",
        "Micronesia": "FSM",
        "Moldova": "MDA",
        "North Korea": "PRK",
        "Russia": "RUS",
        "Syria": "SYR",
        "Tanzania": "TZA",
        "Turkey": "TUR",
        "Venezuela": "VEN",
        "Vietnam": "VNM",
        "West Bank and Gaza": "PSE",
        "Yemen (North)": "YEM",
        "Yemen (South)": "YEM",
    }

    POPULATION_KEYWORDS = (
        "population",
        "per capita",
        "per-capita",
        "per 1000",
        "per 10k",
        "per 10000",
        "per 100k",
        "per 100000",
        "per million",
    )

    def needs_population_data(self, user_message: str) -> bool:
        text = (user_message or "").lower()
        return any(k in text for k in self.POPULATION_KEYWORDS)

    def get_year_range_from_df(self, df: pd.DataFrame) -> Tuple[Optional[int], Optional[int]]:
        if "event_date" not in df.columns:
            return None, None
        event_year = pd.to_datetime(df["event_date"], errors="coerce").dt.year.dropna()
        if event_year.empty:
            return None, None
        return int(event_year.min()), int(event_year.max())

    def build_population_for_acled(self, df: pd.DataFrame) -> PopulationFetchResult:
        warnings: List[str] = []
        if "country" not in df.columns:
            warnings.append("Population merge unavailable: ACLED dataframe does not include 'country'.")
            return PopulationFetchResult(df_pop=pd.DataFrame(), warnings=warnings)

        year_from, year_to = self.get_year_range_from_df(df)
        countries = sorted({str(c).strip() for c in df["country"].dropna().astype(str) if str(c).strip()})

        pop_frames: List[pd.DataFrame] = []
        unresolved: List[str] = []

        for country in countries:
            iso3 = self._country_to_iso3(country)
            if not iso3:
                unresolved.append(country)
                continue

            country_df = self._fetch_population_for_iso3(iso3, year_from, year_to)
            if country_df.empty:
                warnings.append(f"No population records returned for {country} ({iso3}).")
                continue
            country_df["country"] = country
            pop_frames.append(country_df)

        if unresolved:
            warnings.append(
                "Could not map some countries to ISO3 codes for Data360: " + ", ".join(unresolved[:12]) +
                ("..." if len(unresolved) > 12 else "")
            )

        if not pop_frames:
            return PopulationFetchResult(df_pop=pd.DataFrame(), warnings=warnings)

        df_pop = pd.concat(pop_frames, ignore_index=True)
        df_pop["year"] = pd.to_numeric(df_pop["year"], errors="coerce").astype("Int64")
        df_pop["population"] = pd.to_numeric(df_pop["population"], errors="coerce")
        df_pop = df_pop.dropna(subset=["country", "year", "population"]).copy()
        df_pop["year"] = df_pop["year"].astype(int)

        # Keep only one record per country-year
        df_pop = df_pop.sort_values(["country", "year"]).drop_duplicates(
            subset=["country", "year"], keep="last"
        )
        return PopulationFetchResult(df_pop=df_pop, warnings=warnings)

    def _fetch_population_for_iso3(
        self, iso3: str, year_from: Optional[int], year_to: Optional[int]
    ) -> pd.DataFrame:
        rows: List[Dict[str, str]] = []
        skip = 0
        while True:
            params = {
                "DATABASE_ID": self.DATABASE_ID,
                "INDICATOR": self.INDICATOR,
                "REF_AREA": iso3,
                "skip": skip,
            }
            if year_from is not None:
                params["timePeriodFrom"] = str(year_from)
            if year_to is not None:
                params["timePeriodTo"] = str(year_to)

            response = requests.get(self.BASE_URL, params=params, timeout=self.REQUEST_TIMEOUT_SECONDS)
            response.raise_for_status()
            payload = response.json() if response.content else {}
            values = payload.get("value", [])
            if not values:
                break
            for item in values:
                rows.append(
                    {
                        "iso3": iso3,
                        "year": item.get("TIME_PERIOD"),
                        "population": item.get("OBS_VALUE"),
                    }
                )
            if len(values) < self.PAGE_SIZE:
                break
            skip += self.PAGE_SIZE
        return pd.DataFrame(rows)

    def _country_to_iso3(self, country: str) -> Optional[str]:
        if not country:
            return None
        normalized = country.strip()
        if normalized in self.COUNTRY_ALIASES:
            return self.COUNTRY_ALIASES[normalized]

        try:
            import pycountry  # type: ignore

            candidate = pycountry.countries.get(name=normalized)
            if candidate is None:
                candidate = pycountry.countries.search_fuzzy(normalized)[0]
            return str(candidate.alpha_3)
        except Exception:
            pass

        # Minimal fallback heuristic when pycountry is unavailable
        letters = re.sub(r"[^A-Za-z]", "", normalized).upper()
        if len(letters) == 3:
            return letters
        return None
