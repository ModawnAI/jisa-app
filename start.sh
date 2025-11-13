#!/bin/bash
cd /home/bitnami/archive/context-hub/jisa_app
export PATH="$HOME/.local/bin:$PATH"
uvicorn app:app --host 0.0.0.0 --port 9000 --root-path /chat





