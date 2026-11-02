#!/usr/bin/env python3
"""Read-only API checks. Never print credentials, headers, or response bodies."""
import json
import os
from pathlib import Path
import urllib.error
import urllib.request


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def check(name, url, token=None):
    headers = {"Accept": "application/json", "User-Agent": "PickedTube-preflight"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=30) as response:
            data = json.load(response)
            print(f"{name}: HTTP {response.status}")
            return data
    except urllib.error.HTTPError as error:
        print(f"{name}: HTTP {error.code}（未输出响应内容）")
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        print(f"{name}: 连接失败或响应格式异常（未输出敏感信息）")
    return None


def main():
    path = Path.home() / ".config/pickedtube/keys.json"
    keys = json.loads(path.read_text()) if path.exists() else {}
    success = True
    for name, url in [
        ("TYPESAFE_API_KEY", "https://api.typesafe.ai/v1/models"),
        ("GITHUB_TOKEN", "https://api.github.com/rate_limit"),
    ]:
        token = os.environ.get(name) or keys.get(name)
        if not token:
            print(f"{name}: 未配置")
            success = False
            continue
        result = check(name, url, token)
        if result is None:
            success = False
            continue
        if name == "GITHUB_TOKEN":
            core = result.get("resources", {}).get("core", {})
            for field in ("limit", "remaining"):
                value = core.get(field)
                if isinstance(value, int):
                    print(f"GitHub core {field}: {value}")
            repo = check("GitHub 公共仓库读取", "https://api.github.com/repos/python/cpython", token)
            success = success and bool(repo and isinstance(repo.get("id"), int))
        else:
            # Compare locally, never display an arbitrary provider response.
            configured = json.loads((Path(__file__).resolve().parents[1] / "config/github.json").read_text())["model"]
            available = configured in json.dumps(result)
            print(f"配置模型在列表中: {'是' if available else '未确认，分类前需核对模型名称'}")
    hn = check("HN 官方 API", "https://hacker-news.firebaseio.com/v0/maxitem.json")
    success = success and isinstance(hn, int)
    print("未调用分类接口，未启动数据采集。")
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())
