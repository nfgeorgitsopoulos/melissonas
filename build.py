# Χτίζει το index.html του demo: εφαρμογή + δοκιμαστικά δεδομένα + shim.
# Χρήση:  python3 build.py <διαδρομή-της-καθαρής-εφαρμογής.html>
import json, sys, io

app_path = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/draftFire.html'
ANCHOR = '<div class="toast" id="toast" hidden></div>\n\n'

app = open(app_path, encoding='utf-8').read()
demo = json.load(open('demo-data.json', encoding='utf-8'))
shim = open('shim.js', encoding='utf-8').read()

i = app.index(ANCHOR) + len(ANCHOR)
assert app[i:i + 9] == '<script>\n', repr(app[i:i + 40])

inject = ('<script>\nwindow.__DEMO__ = '
          + json.dumps(demo, ensure_ascii=False, indent=1)
          + ';\n</script>\n<script>\n' + shim + '</script>\n')

out = app[:i] + inject + app[i:]
open('index.html', 'w', encoding='utf-8').write(out)
print('index.html:', len(out), 'χαρακτήρες · shim:', len(shim), '· demo:', len(demo), 'συλλογές')
