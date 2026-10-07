#!/usr/bin/env python3
"""Fail a production build unless its *compiled* AAB manifest targets API 36+."""
import sys
import xml.etree.ElementTree as ET

root = ET.parse(sys.argv[1]).getroot()
android = '{http://schemas.android.com/apk/res/android}'
uses_sdk = root.find('uses-sdk')
target = int(uses_sdk.get(android + 'targetSdkVersion', '0')) if uses_sdk is not None else 0
if target < 36:
    raise SystemExit(f'ERROR: {root.get("package")} targets API {target}; Google Play requires at least 36.')
print(f'PASS: {root.get("package")} targets Android API {target}')
