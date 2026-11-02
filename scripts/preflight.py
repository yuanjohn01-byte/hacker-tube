#!/usr/bin/env python3
"""Offline checks; reports presence only, never secret values."""
import json
import os
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def main():
    config = json.loads((ROOT / "config/github.json").read_text())
    questions = json.loads((ROOT / "config/questions.json").read_text())
    assert {"stance", "is_creator", "has_reason"} <= questions.keys()
    assert not config["collection_enabled"] and not config["classification_enabled"]
    # Validate the schema in memory; do not create a production database yet.
    with sqlite3.connect(":memory:") as db:
        schema = (ROOT / "pipeline/schema.sql").read_text()
        db.executescript(schema)
        db.executescript(schema)
    path = Path.home() / ".config" / "pickedtube" / "keys.json"
    keys = json.loads(path.read_text()) if path.exists() else {}
    print("配置与数据库结构：正常（离线检查）")
    for name in ("TYPESAFE_API_KEY", "GITHUB_TOKEN"):
        present = bool(os.environ.get(name) or keys.get(name))
        print(f"{name}: {'已配置，尚未联网验证' if present else '未配置'}")
    print("采集、模型调用：均未启动")


if __name__ == "__main__":
    main()
