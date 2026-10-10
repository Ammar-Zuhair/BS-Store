#!/usr/bin/env python3
"""Load only the ngrok token, then replace this process with the tunnel agent."""
import os
from pathlib import Path
import sys


def read_token():
    token = os.environ.get("NGROK_AUTHTOKEN", "").strip()
    if token:
        return token
    try:
        with Path("/workspace/.env").open() as dotenv:
            for line in dotenv:
                key, separator, value = line.strip().removeprefix("export ").partition("=")
                if separator and key.strip() == "NGROK_AUTHTOKEN":
                    value = value.strip()
                    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                        value = value[1:-1]
                    return value.strip()
    except FileNotFoundError:
        pass
    return ""


if __name__ == "__main__":
    token = read_token()
    if not token:
        sys.exit("Add NGROK_AUTHTOKEN in project Containers → Secrets.")
    os.environ["NGROK_AUTHTOKEN"] = token
    binary = "/workspace/.tools/ngrok/ngrok"
    os.execv(binary, [binary, "http", "http://127.0.0.1:5295",
                     "--url=https://implosive-exchange-compacter.ngrok-free.dev",
                     "--config=/workspace/scripts/ngrok.yml",
                     "--log=stdout", "--log-format=json"])
