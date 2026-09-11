"""Read-only installation check; optionally query the local Codex skills registry."""
import argparse
import hashlib
import json
from pathlib import Path
import queue
import subprocess
import threading
import time
import tomllib

ROOT = Path(__file__).resolve().parent.parent
TOOLKIT = ROOT / '.agents/skills/titan-factory-codex'


def registry(executable):
    process = subprocess.Popen([executable, 'app-server', '--stdio'], cwd=ROOT,
                               stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=subprocess.DEVNULL, text=True, encoding='utf-8')
    messages = queue.Queue()
    def read():
        for line in process.stdout:
            messages.put(line)
    threading.Thread(target=read, daemon=True).start()
    def send(value):
        process.stdin.write(json.dumps(value) + '\n')
        process.stdin.flush()
    def response(identifier):
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            value = json.loads(messages.get(timeout=max(0.1, deadline-time.monotonic())))
            if value.get('id') == identifier:
                if 'error' in value:
                    raise RuntimeError(value['error'])
                return value['result']
        raise TimeoutError('Codex registry did not respond')
    try:
        send({'id': 1, 'method': 'initialize', 'params': {'clientInfo': {
            'name': 'titan_install_check', 'version': '0.1.0'}}})
        response(1)
        send({'method': 'initialized', 'params': {}})
        send({'id': 2, 'method': 'skills/list', 'params': {
            'cwds': [str(ROOT)], 'forceReload': True}})
        return response(2)
    finally:
        process.terminate()
        process.wait(timeout=10)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--codex', help='Path to Codex executable for discovery verification')
    args = parser.parse_args()
    manifest = json.loads((TOOLKIT / '.titan-toolkit-manifest.json').read_text())
    for relative, expected in manifest['files'].items():
        assert hashlib.sha256((TOOLKIT / relative).read_bytes()).hexdigest() == expected, relative
    expected_skills = {p.parent.name for p in (TOOLKIT / 'skills').glob('*/SKILL.md')}
    profiles = list((ROOT / '.codex/agents').glob('tf-*.toml'))
    assert len(expected_skills) == 29
    assert len(profiles) == 7
    for name in expected_skills:
        entry = ROOT / '.agents/skills' / name / 'SKILL.md'
        text = entry.read_text(encoding='utf-8')
        assert f'../titan-factory-codex/skills/{name}/SKILL.md' in text
        assert text.split('---', 2)[1] == (TOOLKIT / 'skills' / name / 'SKILL.md').read_text(encoding='utf-8').split('---', 2)[1]
    for profile in profiles:
        data = tomllib.loads(profile.read_text())
        assert data['name'] == profile.stem and data['developer_instructions']
    result = {'integrity': 'passed', 'skills': 29, 'agent_profiles': 7}
    if args.codex:
        data = registry(args.codex)
        entries = [s for row in data['data'] for s in row['skills']
                   if s['name'] in expected_skills and Path(s['path']).is_relative_to(ROOT / '.agents/skills')]
        assert {s['name'] for s in entries} == expected_skills, 'Incomplete skill discovery'
        assert all(s.get('enabled', True) for s in entries), 'Disabled Titan skill'
        result['codex_discovery'] = '29/29'
        result['scopes'] = sorted({s['scope'] for s in entries})
        result['skill_errors'] = [e for row in data['data'] for e in row.get('errors', [])
                                  if str(TOOLKIT) in str(e)]
        assert not result['skill_errors']
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
