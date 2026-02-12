"""
Data360 Service
Fetches World Bank population series from Data360 API and prepares a join-ready dataframe.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import re
import unicodedata

import pandas as pd
import requests


@dataclass
class PopulationFetchResult:
    df_pop: pd.DataFrame
    warnings: List[str]

@dataclass
class WdiFetchResult:
    df_wdi: pd.DataFrame
    indicator: Optional[str]
    warnings: List[str]


class Data360Service:
    BASE_URL = "https://data360api.worldbank.org/data360/data"
    DATABASE_ID = "WB_WDI"
    INDICATOR = "WB_WDI_SP_POP_TOTL"
    REQUEST_TIMEOUT_SECONDS = 12
    PAGE_SIZE = 1000
    MAX_PAGES_PER_QUERY = 12

    # ACLED/WDI name mismatches we can resolve safely
    COUNTRY_ALIASES = {
        "Afghanistan": "AFG",
        "Algeria": "DZA",
        "Angola": "AGO",
        "Argentina": "ARG",
        "Armenia": "ARM",
        "Azerbaijan": "AZE",
        "Bangladesh": "BGD",
        "Belarus": "BLR",
        "Bolivia": "BOL",
        "Brazil": "BRA",
        "Burkina Faso": "BFA",
        "Burundi": "BDI",
        "Cabo Verde": "CPV",
        "Cameroon": "CMR",
        "Central African Republic": "CAF",
        "Chad": "TCD",
        "Chile": "CHL",
        "China": "CHN",
        "Colombia": "COL",
        "Costa Rica": "CRI",
        "Cote d'Ivoire": "CIV",
        "Cote dIvoire": "CIV",
        "Djibouti": "DJI",
        "Dominican Republic": "DOM",
        "Ecuador": "ECU",
        "Egypt": "EGY",
        "El Salvador": "SLV",
        "Eritrea": "ERI",
        "Ethiopia": "ETH",
        "Georgia": "GEO",
        "Ghana": "GHA",
        "Guatemala": "GTM",
        "Guinea": "GIN",
        "Guinea-Bissau": "GNB",
        "Haiti": "HTI",
        "Honduras": "HND",
        "India": "IND",
        "Indonesia": "IDN",
        "Iraq": "IRQ",
        "Israel": "ISR",
        "Jordan": "JOR",
        "Kazakhstan": "KAZ",
        "Kenya": "KEN",
        "Lebanon": "LBN",
        "Liberia": "LBR",
        "Libya": "LBY",
        "Madagascar": "MDG",
        "Mali": "MLI",
        "Mauritania": "MRT",
        "Mexico": "MEX",
        "Morocco": "MAR",
        "Mozambique": "MOZ",
        "Myanmar": "MMR",
        "Nepal": "NPL",
        "Nicaragua": "NIC",
        "Niger": "NER",
        "Nigeria": "NGA",
        "Czech Republic": "CZE",
        "Congo-Brazzaville": "COG",
        "Congo - Brazzaville": "COG",
        "Congo-Kinshasa": "COD",
        "Congo - Kinshasa": "COD",
        "Democratic Republic of Congo": "COD",
        "DR Congo": "COD",
        "Pakistan": "PAK",
        "Palestine": "PSE",
        "Panama": "PAN",
        "Paraguay": "PRY",
        "Papua New Guinea": "PNG",
        "Peru": "PER",
        "Philippines": "PHL",
        "Senegal": "SEN",
        "Sierra Leone": "SLE",
        "Somalia": "SOM",
        "South Africa": "ZAF",
        "South Sudan": "SSD",
        "Sri Lanka": "LKA",
        "Sudan": "SDN",
        "Tajikistan": "TJK",
        "Thailand": "THA",
        "Tunisia": "TUN",
        "Uganda": "UGA",
        "Ukraine": "UKR",
        "United States": "USA",
        "Venezuela, RB": "VEN",
        "Yemen": "YEM",
        "Zambia": "ZMB",
        "Zimbabwe": "ZWE",
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
    WDI_KEYWORDS = (
        "data360",
        "world bank",
        "wdi",
        "indicator",
        "poverty",
        "gdp",
        "inflation",
        "unemployment",
    )
    INDICATOR_HINTS = {
        "poverty": "WB_WDI_SI_POV_DDAY",
        "poverty headcount": "WB_WDI_SI_POV_DDAY",
        "gdp per capita": "WB_WDI_NY_GDP_PCAP_CD",
        "inflation": "WB_WDI_FP_CPI_TOTL_ZG",
        "unemployment": "WB_WDI_SL_UEM_TOTL_ZS",
        "population": "WB_WDI_SP_POP_TOTL",
    }

    def __init__(self) -> None:
        # Simple in-memory cache: (indicator, iso3, year_from, year_to) -> DataFrame
        self._cache: Dict[Tuple[str, str, Optional[int], Optional[int]], pd.DataFrame] = {}
        self._http = requests.Session()

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

    def needs_wdi_data(self, user_message: str) -> bool:
        text = (user_message or "").lower()
        return any(k in text for k in self.WDI_KEYWORDS)

    def build_population_for_acled(
        self,
        df: pd.DataFrame,
        requested_countries: Optional[List[str]] = None,
        max_fallback_countries: int = 20,
    ) -> PopulationFetchResult:
        warnings: List[str] = []
        if "country" not in df.columns:
            warnings.append("Population merge unavailable: ACLED dataframe does not include 'country'.")
            return PopulationFetchResult(df_pop=pd.DataFrame(), warnings=warnings)

        year_from, year_to = self.get_year_range_from_df(df)
        country_iso3_hints = self._build_country_iso3_hints(df)

        if requested_countries:
            countries = sorted({c.strip() for c in requested_countries if c and c.strip()})
        else:
            # Fallback: limit to most frequent countries to avoid long waits.
            freq = df["country"].dropna().astype(str).str.strip().value_counts()
            countries = freq.head(max_fallback_countries).index.tolist()
            warnings.append(
                f"No explicit country detected in query. Fetched population for top {len(countries)} countries by event volume."
            )

        pop_frames: List[pd.DataFrame] = []
        unresolved: List[str] = []
        no_data: List[str] = []

        for country in countries:
            iso3 = self._country_to_iso3(country, iso3_hint=country_iso3_hints.get(country))
            if not iso3:
                unresolved.append(country)
                continue

            country_df = self._fetch_population_for_iso3(iso3, year_from, year_to)
            if country_df.empty:
                no_data.append(f"{country} ({iso3})")
                continue
            country_df["country"] = country
            pop_frames.append(country_df)

        if unresolved:
            warnings.append(
                "Could not map some countries to ISO3 codes for Data360: " + ", ".join(unresolved[:12]) +
                ("..." if len(unresolved) > 12 else "")
            )
            warnings.append("Tip: install 'pycountry' for broader automatic country-name matching.")

        if no_data:
            warnings.append(
                "No population records returned for: " + ", ".join(no_data[:8]) + ("..." if len(no_data) > 8 else "")
            )

        if not pop_frames:
            return PopulationFetchResult(df_pop=pd.DataFrame(), warnings=warnings)

        df_pop = pd.concat(pop_frames, ignore_index=True)
        df_pop["year"] = pd.to_numeric(df_pop["year"], errors="coerce").astype("Int64")
        df_pop["population"] = pd.to_numeric(df_pop["value"], errors="coerce")
        df_pop = df_pop.dropna(subset=["country", "year", "population"]).copy()
        df_pop["year"] = df_pop["year"].astype(int)
        df_pop = df_pop[["iso3", "year", "population", "country"]]
        df_pop = df_pop.sort_values(["country", "year"]).drop_duplicates(
            subset=["country", "year"], keep="last"
        )
        return PopulationFetchResult(df_pop=df_pop, warnings=warnings)

    def extract_requested_countries(self, user_message: str, df: pd.DataFrame) -> List[str]:
        """Infer requested countries by matching known ACLED country names in the user message."""
        if df is None or df.empty or "country" not in df.columns:
            return []
        text = self._normalize_country_name(user_message or "")
        if not text:
            return []

        country_values = sorted({str(c).strip() for c in df["country"].dropna().astype(str) if str(c).strip()})
        matches: List[str] = []
        for country in country_values:
            normalized_country = self._normalize_country_name(country)
            if not normalized_country:
                continue
            # simple phrase containment on normalized text
            if f" {normalized_country} " in f" {text} ":
                matches.append(country)
        return matches

    def extract_countries_from_text(self, user_message: str) -> List[str]:
        """Country extraction independent of ACLED dataframe (for Data360-only queries)."""
        text = self._normalize_country_name(user_message or "")
        if not text:
            return []

        matches: List[str] = []
        for country in self.COUNTRY_ALIASES.keys():
            normalized_country = self._normalize_country_name(country)
            if normalized_country and f" {normalized_country} " in f" {text} ":
                matches.append(country)

        # Deduplicate while preserving order.
        seen = set()
        out: List[str] = []
        for c in matches:
            if c not in seen:
                out.append(c)
                seen.add(c)
        return out

    def _build_country_iso3_hints(self, df: pd.DataFrame) -> Dict[str, str]:
        """Build country -> ISO3 hints from ACLED's `iso` column when present."""
        hints: Dict[str, str] = {}
        if "iso" not in df.columns or "country" not in df.columns:
            return hints
        sample = df[["country", "iso"]].dropna().copy()
        if sample.empty:
            return hints
        sample["country"] = sample["country"].astype(str).str.strip()
        # Pick first valid iso mapping encountered per country.
        for _, row in sample.iterrows():
            country = row["country"]
            if not country or country in hints:
                continue
            iso3 = self._acled_iso_to_iso3(row["iso"])
            if iso3:
                hints[country] = iso3
        return hints

    def _fetch_population_for_iso3(
        self, iso3: str, year_from: Optional[int], year_to: Optional[int]
    ) -> pd.DataFrame:
        return self._fetch_indicator_rows(
            indicator=self.INDICATOR,
            iso3=iso3,
            year_from=year_from,
            year_to=year_to,
        )

    def build_wdi_dataset_for_query(
        self,
        user_message: str,
        df: Optional[pd.DataFrame] = None,
        requested_countries: Optional[List[str]] = None,
        max_countries: int = 5,
    ) -> WdiFetchResult:
        warnings: List[str] = []
        indicator = self._resolve_indicator_from_message(user_message)
        if not indicator:
            warnings.append(
                "Could not infer a WDI indicator from query. Specify an indicator id like WB_WDI_SI_POV_DDAY."
            )
            return WdiFetchResult(df_wdi=pd.DataFrame(), indicator=None, warnings=warnings)

        year_from: Optional[int] = None
        year_to: Optional[int] = None
        if df is not None and not df.empty:
            year_from, year_to = self.get_year_range_from_df(df)

        # If ACLED is loaded, use only requested countries (or a small fallback set).
        iso3_list: List[str] = []
        if requested_countries:
            for country in requested_countries:
                iso3 = self._country_to_iso3(country)
                if iso3:
                    iso3_list.append(iso3)
            iso3_list = sorted(set(iso3_list))
        elif df is not None and not df.empty and "country" in df.columns:
            country_iso3_hints = self._build_country_iso3_hints(df)
            # Avoid scanning all countries for WDI queries; keep fallback very small.
            freq = df["country"].dropna().astype(str).str.strip().value_counts()
            countries = freq.head(max_countries).index.tolist()
            warnings.append(
                f"No explicit country found in query; limited WDI fetch to top {len(countries)} countries by event volume."
            )
            for country in countries:
                iso3 = self._country_to_iso3(country, iso3_hint=country_iso3_hints.get(country))
                if iso3:
                    iso3_list.append(iso3)
            iso3_list = sorted(set(iso3_list))

        frames: List[pd.DataFrame] = []
        if iso3_list:
            for iso3 in iso3_list:
                f = self._fetch_indicator_rows(indicator, iso3=iso3, year_from=year_from, year_to=year_to)
                if not f.empty:
                    frames.append(f)
        else:
            f = self._fetch_indicator_rows(indicator, iso3=None, year_from=year_from, year_to=year_to)
            if not f.empty:
                frames.append(f)

        if not frames:
            warnings.append(f"No Data360 rows returned for indicator {indicator}.")
            return WdiFetchResult(df_wdi=pd.DataFrame(), indicator=indicator, warnings=warnings)

        df_wdi = pd.concat(frames, ignore_index=True)
        df_wdi["year"] = pd.to_numeric(df_wdi["year"], errors="coerce").astype("Int64")
        df_wdi["value"] = pd.to_numeric(df_wdi["value"], errors="coerce")
        df_wdi = df_wdi.dropna(subset=["iso3", "year", "value"]).copy()
        df_wdi["year"] = df_wdi["year"].astype(int)
        df_wdi = df_wdi.sort_values(["iso3", "year"]).drop_duplicates(["iso3", "year"], keep="last")
        return WdiFetchResult(df_wdi=df_wdi, indicator=indicator, warnings=warnings)

    def _fetch_indicator_rows(
        self,
        indicator: str,
        iso3: Optional[str],
        year_from: Optional[int],
        year_to: Optional[int],
    ) -> pd.DataFrame:
        rows: List[Dict[str, str]] = []
        skip = 0
        pages = 0
        last_page_signature: Optional[Tuple[Optional[str], Optional[str], int]] = None
        while True:
            pages += 1
            if pages > self.MAX_PAGES_PER_QUERY:
                break
            params = {
                "DATABASE_ID": self.DATABASE_ID,
                "INDICATOR": indicator,
                "skip": skip,
            }
            if iso3:
                params["REF_AREA"] = iso3
            if year_from is not None:
                params["timePeriodFrom"] = str(year_from)
            if year_to is not None:
                params["timePeriodTo"] = str(year_to)

            cache_key = (indicator, params.get("REF_AREA", "_ALL_"), year_from, year_to)
            if skip == 0 and cache_key in self._cache:
                return self._cache[cache_key].copy()

            response = self._http.get(self.BASE_URL, params=params, timeout=self.REQUEST_TIMEOUT_SECONDS)
            response.raise_for_status()
            payload = response.json() if response.content else {}
            values = payload.get("value", [])
            if not values:
                break
            first_id = values[0].get("TIME_PERIOD") if values else None
            last_id = values[-1].get("TIME_PERIOD") if values else None
            page_signature = (first_id, last_id, len(values))
            if last_page_signature == page_signature and skip > 0:
                # Defensive break if backend ignores skip and repeats the same page.
                break
            last_page_signature = page_signature
            for item in values:
                rows.append(
                    {
                        "iso3": item.get("REF_AREA") or iso3,
                        "indicator": item.get("INDICATOR") or indicator,
                        "year": item.get("TIME_PERIOD"),
                        "value": item.get("OBS_VALUE"),
                    }
                )
            if len(values) < self.PAGE_SIZE:
                break
            skip += self.PAGE_SIZE
        out = pd.DataFrame(rows)
        if skip == 0:
            self._cache[(indicator, (iso3 or "_ALL_"), year_from, year_to)] = out.copy()
        return out

    def _resolve_indicator_from_message(self, user_message: str) -> Optional[str]:
        text = (user_message or "").strip()
        match = re.search(r"\bWB_WDI_[A-Z0-9_]+\b", text.upper())
        if match:
            return match.group(0)
        lower = text.lower()
        for key, indicator in self.INDICATOR_HINTS.items():
            if key in lower:
                return indicator
        return None

    def _country_to_iso3(self, country: str, iso3_hint: Optional[str] = None) -> Optional[str]:
        if not country:
            return None
        if iso3_hint and len(iso3_hint) == 3:
            return iso3_hint.upper()
        normalized = country.strip()
        if normalized in self.COUNTRY_ALIASES:
            return self.COUNTRY_ALIASES[normalized]
        normalized_key = self._normalize_country_name(normalized)
        normalized_aliases = {
            self._normalize_country_name(k): v for k, v in self.COUNTRY_ALIASES.items()
        }
        if normalized_key in normalized_aliases:
            return normalized_aliases[normalized_key]

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

    def _acled_iso_to_iso3(self, iso_value: object) -> Optional[str]:
        """Convert ACLED `iso` field to ISO3 (handles numeric/alpha inputs)."""
        if iso_value is None:
            return None
        raw = str(iso_value).strip()
        if not raw:
            return None

        # Sometimes numeric values are serialized as '566.0'
        raw = re.sub(r"\.0+$", "", raw)

        # Already alpha-3
        if re.fullmatch(r"[A-Za-z]{3}", raw):
            return raw.upper()

        # Alpha-2 -> alpha-3
        if re.fullmatch(r"[A-Za-z]{2}", raw):
            try:
                import pycountry  # type: ignore

                c = pycountry.countries.get(alpha_2=raw.upper())
                return str(c.alpha_3) if c else None
            except Exception:
                return None

        # Numeric (ISO-3166 numeric): use pycountry when available
        digits = re.sub(r"\D", "", raw)
        if digits:
            try:
                import pycountry  # type: ignore

                c = pycountry.countries.get(numeric=digits.zfill(3))
                return str(c.alpha_3) if c else None
            except Exception:
                return None
        return None

    @staticmethod
    def _normalize_country_name(value: str) -> str:
        ascii_value = (
            unicodedata.normalize("NFKD", value)
            .encode("ascii", "ignore")
            .decode("ascii")
        )
        ascii_value = ascii_value.replace("&", " and ")
        ascii_value = re.sub(r"[^a-zA-Z0-9]+", " ", ascii_value).strip().lower()
        return re.sub(r"\s+", " ", ascii_value)
