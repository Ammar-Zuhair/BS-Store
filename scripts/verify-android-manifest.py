#!/usr/bin/env python3
"""Fail a production build unless its *compiled* AAB manifest targets API 36+."""
import argparse
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('manifest')
parser.add_argument('--adaptive-orientation', action='store_true')
args = parser.parse_args()
root = ET.parse(args.manifest).getroot()
android = '{http://schemas.android.com/apk/res/android}'
uses_sdk = root.find('uses-sdk')
target = int(uses_sdk.get(android + 'targetSdkVersion', '0')) if uses_sdk is not None else 0
if target < 36:
    raise SystemExit(f'ERROR: {root.get("package")} targets API {target}; Google Play requires at least 36.')
print(f'PASS: {root.get("package")} targets Android API {target}')

if args.adaptive_orientation:
    for name in ('android.hardware.screen.portrait', 'android.hardware.screen.landscape'):
        features = [item for item in root.findall('uses-feature') if item.get(android + 'name') == name]
        if len(features) != 1 or features[0].get(android + 'required') != 'false':
            raise SystemExit(f'ERROR: {name} must be declared optional exactly once.')
    main = next((item for item in root.findall('./application/activity') if item.get(android + 'name', '').endswith('MainActivity')), None)
    if main is None or main.get(android + 'screenOrientation', 'unspecified') not in ('unspecified', 'fullUser', 'user', '-1', '2', '13'):
        raise SystemExit('ERROR: MainActivity is still locked to an orientation.')
    if main.get(android + 'resizeableActivity') != 'true':
        raise SystemExit('ERROR: MainActivity must allow window resizing.')
    print('PASS: both orientations optional, MainActivity unlocked and resizeable')
