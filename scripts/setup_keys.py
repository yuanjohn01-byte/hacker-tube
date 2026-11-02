#!/usr/bin/env python3
"""Run in the user's terminal; never supply secrets as command arguments."""
import getpass
import json
import os
from pathlib import Path
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def save_keys(path, values):
    if path.parent.is_symlink() or path.is_symlink():
        raise ValueError("Refusing a symlink for local credentials")
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    path.parent.chmod(0o700)
    fd, temporary = tempfile.mkstemp(prefix=".keys-", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as handle:
            json.dump(values, handle)
            handle.write("\n")
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    if not sys.stdin.isatty():
        raise SystemExit("请在应用的交互终端运行此脚本；不接受管道输入密钥。")
    path = Path.home() / ".config" / "pickedtube" / "keys.json"
    if path.parent.is_symlink() or path.is_symlink():
        raise SystemExit("密钥路径不能是符号链接。")
    values = json.loads(path.read_text()) if path.exists() else {}
    print("输入不会显示，也不会写入 shell 历史。直接回车表示保留原值或跳过。")
    print("只保存本地配置，不调用 API，不产生模型费用。")
    for name, label in [
        ("TYPESAFE_API_KEY", "Jev / TypeSafe API key"),
        ("GITHUB_TOKEN", "GitHub token（可选，仅公共仓库资料）"),
    ]:
        value = getpass.getpass(label + ": ").strip()
        if value:
            if any(c.isspace() for c in value):
                raise SystemExit("密钥不能包含空白字符；未保存本次输入。")
            values[name] = value
    if values:
        save_keys(path, values)
        print("已保存到 ~/.config/pickedtube/keys.json（项目目录之外，仅当前用户可读写）。")
    else:
        print("未输入密钥，未创建密钥文件。")


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print("\n已取消，未保存本次输入。")
        sys.exit(1)
