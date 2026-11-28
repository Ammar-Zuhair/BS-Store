#!/usr/bin/env python3
"""Create private source ZIPs with runtime environments, never account credentials."""
import argparse
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import tarfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
APPS = ("customer-app", "admin-app", "courier-app")


def git(repo, *args):
    return subprocess.check_output(["git", "-C", str(repo), *args])


def snapshot(repo):
    result = {}
    with tarfile.open(fileobj=io.BytesIO(git(repo, "archive", "--format=tar", "HEAD"))) as archive:
        for entry in archive:
            if not entry.isfile():
                if entry.isdir():
                    continue
                raise ValueError("Unsupported source archive entry")
            name = PurePosixPath(entry.name)
            if name.is_absolute() or ".." in name.parts or ".git" in name.parts:
                raise ValueError("Unsafe source archive path")
            result[str(name)] = (archive.extractfile(entry).read(), entry.mode)
    return result


def app_environment(app):
    # Mobile apps only need their public runtime configuration, not EXPO_TOKEN.
    allowed = {"EXPO_PUBLIC_API_URL", "EXPO_PUBLIC_EAS_PROJECT_ID"}
    lines = []
    names = set()
    for line in (ROOT / app / ".env").read_text().splitlines():
        name, sep, value = line.partition("=")
        name = name.strip()
        if sep and name in allowed:
            if not value.strip():
                raise ValueError("Missing mobile runtime setting")
            lines.append(f"{name}={value.strip()}")
            names.add(name)
    if names != allowed:
        raise ValueError("Incomplete mobile runtime settings")
    return ("# Mobile public runtime configuration; current API URL is preserved.\n"
            + "\n".join(lines) + "\n").encode()


def instructions(full_project):
    backend = "backend/" if full_project else ""
    root_setting = "backend" if full_project else "."
    apps = "يشمل هذا الملف أيضاً مصادر تطبيقات العميل والمدير والموصل وملف .env الفعلي لكل تطبيق، مع بقية ملفات المشروع المتتبعة.\n" if full_project else ""
    return f"""# ابدأ هنا — حزمة BS Store الخاصة

{apps}
الحزمة تحتوي أسرار تشغيل قاعدة البيانات وJWT وOTP وR2 والخدمات المرتبطة. احفظها كنسخة خاصة ولا ترفعها إلى مستودع أو رابط عام.

## نشر الـ backend على Vercel

1. فك الضغط. جذر الـ backend هو `{backend or '.'}`، ويحتوي Dockerfile.vercel وvercel.json.
2. استخدم Framework = Container، وRoot Directory = `{root_setting}` عند استيراد المشروع الكامل. عند تشغيل CLI من داخل مجلد الـ backend استخدم الدليل `.`.
3. استورد `{backend}deployment/.env.vercel` في متغيرات Vercel لبيئة Production. نسخة مطابقة موجودة في `{backend}.env` لتسهيل الوصول إليها؛ لا تُرسل ملفات الأسرار ضمن النشر أو Git.
4. استبدل YOUR_PROJECT في APP_PUBLIC_URL وApp__BaseUrl بنطاق الإنتاج الثابت الخاص بك، بدون /api. هذا هو الإعداد الذي لا يمكن تعبئته قبل معرفة الرابط.
5. من داخل مجلد الـ backend، نفّذ:

```bash
npx vercel@latest login
npx vercel@latest link
npx vercel@latest --prod
```

ملف .env في هذه الحزمة مهيأ لملف تشغيل Vercel: عملية API منفصلة عن عامل الخلفية. vercel.json يشغّل عامل الخلفية بنسخة واحدة في الإنتاج. لتجربة الدورين محلياً راجع Dockerfile.vercel وأمر daemon في vercel.json؛ لا يكفي تشغيل API وحده لاختبار مهام الخلفية.

الخطوات التفصيلية وفحص البيانات والصور والمهام والحصص موجودة في `{backend}deployment/README.ar.md`.

## محتويات النسخة

تشمل المصادر وملفات الإعداد والمشاريع والمكتبات المحلية والاختبارات وملفات قفل الاعتماديات. يعيد Docker/.NET تنزيل حزم NuGet عند البناء، وتستخدم تطبيقات الهاتف npm ci لاستعادة حزمها. لا تتضمن مجلدات Git أو node_modules أو مخرجات البناء والسجلات المؤقتة أو مفاتيح الدخول الشخصية إلى GitHub وExpo.

هذه حزمة كود وإعدادات تتصل بقاعدة البيانات ومخزن R2 الحاليين، وليست تصديراً لبيانات قاعدة البيانات أو لمحتويات R2. لم تتغير روابط التطبيقات الحالية؛ تغييرها ينتظر رابط Vercel بعد التحقق منه.

PACKAGE-MANIFEST.json يسجل إصدارات المصدر وقائمة الملفات وبصماتها. يعرض أيضاً أسماء ملفات البيئة المرفقة دون سرد قيم الأسرار في الدليل.
""".encode()


def write_zip(output, prefix, entries, revisions):
    timestamp = datetime.now(timezone.utc)
    private_paths = sorted(name for name in entries if PurePosixPath(name).name in (".env", ".env.vercel"))
    manifest = {
        "createdAt": timestamp.isoformat(), "sourceRevisions": revisions,
        "private": True, "privateRuntimeFiles": private_paths,
        "files": [{"path": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
                  for name, (data, _) in sorted(entries.items())],
    }
    entries = {**entries, "PACKAGE-MANIFEST.json": ((json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode(), 0o600)}
    descriptor = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, "wb") as stream:
        os.fchmod(stream.fileno(), 0o600)
        with zipfile.ZipFile(stream, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for name, (data, mode) in sorted(entries.items()):
                info = zipfile.ZipInfo(f"{prefix}/{name}", timestamp.timetuple()[:6])
                info.create_system = 3
                info.external_attr = (0o100000 | mode) << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, data)
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise ValueError("Archive integrity check failed")
    return {"file": str(output), "files": len(entries), "bytes": output.stat().st_size,
            "sha256": hashlib.sha256(output.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-directory", type=Path, default=ROOT / "build-artifacts/private")
    options = parser.parse_args()
    output = options.output_directory
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    output.chmod(0o700)
    backend = ROOT / "backend"
    revisions = {"workspace": git(ROOT, "rev-parse", "HEAD").decode().strip(),
                 "backend": git(backend, "rev-parse", "HEAD").decode().strip()}
    source = snapshot(backend)
    # Reuse the dedicated export, which selects runtime settings explicitly.
    environment = (backend / "deployment/.env.vercel").read_bytes()
    if b"Jwt__Secret=" not in environment or b"AWS_SECRET_ACCESS_KEY=" not in environment:
        raise ValueError("Incomplete backend environment export")
    for forbidden in (b"GITHUB_SSH_KEY=", b"EXPO_TOKEN=", b"NGROK_AUTHTOKEN="):
        if forbidden in environment:
            raise ValueError("Account credential cannot be packaged")
    source[".env"] = (environment, 0o600)
    source["deployment/.env.vercel"] = (environment, 0o600)
    source["README-FIRST.ar.md"] = (instructions(False), 0o644)
    full = snapshot(ROOT)
    full.update({f"backend/{name}": value for name, value in source.items()})
    for app in APPS:
        full[f"{app}/.env"] = (app_environment(app), 0o600)
    full["README-FIRST.ar.md"] = (instructions(True), 0o644)
    date = datetime.now(timezone.utc).strftime("%Y%m%d")
    packages = [write_zip(output / f"BS-Store-Backend-Vercel-{date}.zip", "BS-Store-Backend", source, revisions),
                write_zip(output / f"BS-Store-Complete-{date}.zip", "BS-Store", full, revisions)]
    checksums = output / "SHA256SUMS.txt"
    checksums.write_text("".join(f"{item['sha256']}  {Path(item['file']).name}\n" for item in packages))
    checksums.chmod(0o600)
    for package in packages:
        print(json.dumps(package))


if __name__ == "__main__":
    main()
