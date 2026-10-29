#!/usr/bin/env python3
"""Rebuild the deployable site in ./public from ./source.

Usage:  python3 build.py
Needs only Python 3.9+ (standard library). Cloudflare serves ./public as is.
"""
import json, os, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "source")
HOST = json.load(open(os.path.join(SRC, "site.config.json"), encoding="utf-8"))["domain"]

def run(script, *args):
    subprocess.run([sys.executable, "-I", os.path.join(SRC, script), *args], check=True, cwd=SRC)

with tempfile.TemporaryDirectory() as tmp:
    app, site, out = (os.path.join(tmp, d) for d in ("app", "site", "out"))
    os.makedirs(app); os.makedirs(os.path.join(site, "fonts"))
    for f in ("app.js", "shell.html"):
        shutil.copy(os.path.join(SRC, f), app)
    for f in os.listdir(os.path.join(SRC, "fonts")):
        shutil.copy(os.path.join(SRC, "fonts", f), os.path.join(site, "fonts"))
    run("build_data.py", os.path.join(SRC, "data"), os.path.join(SRC, "data", "glosses.json"), app)
    run("make_public.py", app, site)
    run("make_pages.py", site, os.path.join(SRC, "site.config.json"))
    run("package_root.py", site, out, HOST)
    pub = os.path.join(ROOT, "public")
    shutil.rmtree(pub, ignore_errors=True)
    shutil.copytree(os.path.join(out, "public"), pub)

print(f"Built ./public for https://{HOST}")
