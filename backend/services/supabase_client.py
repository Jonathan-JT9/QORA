"""
Supabase Service for QORA
Provides cloud database logging and storage for radiograph analyses,
with an automatic SQLite/local fallback when credentials are not configured.
"""

import datetime
import json
import os
import sqlite3
import uuid
from typing import Any, Dict, List, Optional

try:
    from supabase import Client, create_client
    HAS_SUPABASE_SDK = True
except ImportError:
    HAS_SUPABASE_SDK = False


class LocalStorageFallback:
    """SQLite-backed fallback store when Supabase credentials are not provided."""

    def __init__(self, db_path: str = "qora_local.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS predictions (
                    id TEXT PRIMARY KEY,
                    patient_tag TEXT,
                    timestamp TEXT,
                    backbone TEXT,
                    prediction TEXT,
                    probability REAL,
                    confidence REAL,
                    threshold REAL,
                    anatomical_zones TEXT,
                    quantum_summary TEXT,
                    clinical_report TEXT,
                    original_image_uri TEXT,
                    overlay_image_uri TEXT,
                    doctor_notes TEXT
                )
            """)
            conn.commit()

    def insert_prediction(self, record: Dict[str, Any]) -> Dict[str, Any]:
        rec_id = record.get("id") or str(uuid.uuid4())
        record["id"] = rec_id
        if "timestamp" not in record:
            record["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO predictions (
                    id, patient_tag, timestamp, backbone, prediction,
                    probability, confidence, threshold, anatomical_zones,
                    quantum_summary, clinical_report, original_image_uri,
                    overlay_image_uri, doctor_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record["id"],
                record.get("patient_tag", "ANON-PT"),
                record["timestamp"],
                record.get("backbone", "resnet50"),
                record.get("prediction", "Unknown"),
                record.get("probability", 0.0),
                record.get("confidence", 0.0),
                record.get("threshold", 0.5),
                json.dumps(record.get("anatomical_zones", [])),
                json.dumps(record.get("quantum_summary", {})),
                record.get("clinical_report", ""),
                record.get("original_image_uri", ""),
                record.get("overlay_image_uri", ""),
                record.get("doctor_notes", "")
            ))
            conn.commit()

        return record

    def list_predictions(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM predictions
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
            """, (limit, offset))
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                item = dict(row)
                try:
                    item["anatomical_zones"] = json.loads(item["anatomical_zones"])
                except Exception:
                    pass
                try:
                    item["quantum_summary"] = json.loads(item["quantum_summary"])
                except Exception:
                    pass
                results.append(item)
            return results


class SupabaseService:
    """Unified service interfacing with Supabase or fallback storage."""

    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.client: Optional[Client] = None
        self.fallback = LocalStorageFallback()

        if HAS_SUPABASE_SDK and self.url and self.key and not self.url.startswith("https://your-project"):
            try:
                self.client = create_client(self.url, self.key)
            except Exception as e:
                print(f"[SupabaseService] Client initialization failed: {e}")
                self.client = None

    @property
    def is_cloud_connected(self) -> bool:
        return self.client is not None

    def save_analysis(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Saves radiograph analysis to Supabase or local SQLite store."""
        if self.client is not None:
            try:
                # Insert into supabase 'predictions' table
                data = {
                    "patient_tag": record.get("patient_tag", "ANON-PT"),
                    "backbone": record.get("backbone", "resnet50"),
                    "prediction": record.get("prediction", "Unknown"),
                    "probability": record.get("probability", 0.0),
                    "confidence": record.get("confidence", 0.0),
                    "threshold": record.get("threshold", 0.5),
                    "anatomical_zones": record.get("anatomical_zones", []),
                    "quantum_summary": record.get("quantum_summary", {}),
                    "clinical_report": record.get("clinical_report", ""),
                    "doctor_notes": record.get("doctor_notes", "")
                }
                res = self.client.table("predictions").insert(data).execute()
                if res.data and len(res.data) > 0:
                    record["id"] = res.data[0].get("id")
                    return record
            except Exception as e:
                print(f"[SupabaseService] Cloud insert failed, saving locally: {e}")

        # Fallback to local SQLite
        return self.fallback.insert_prediction(record)

    def fetch_history(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Retrieves past prediction records."""
        if self.client is not None:
            try:
                res = self.client.table("predictions")\
                    .select("*")\
                    .order("created_at", desc=True)\
                    .range(offset, offset + limit - 1)\
                    .execute()
                if res.data:
                    return res.data
            except Exception as e:
                print(f"[SupabaseService] Cloud fetch history failed, querying local store: {e}")

        return self.fallback.list_predictions(limit, offset)


# Singleton
_supabase_instance: Optional[SupabaseService] = None

def get_supabase_service() -> SupabaseService:
    global _supabase_instance
    if _supabase_instance is None:
        _supabase_instance = SupabaseService()
    return _supabase_instance
