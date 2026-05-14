import requests

r = requests.post('http://127.0.0.1:8000/api/generate-tests', json={'path':'ai_analyzer','mode':'local'}, stream=True, timeout=300)
print('status', r.status_code)
count = 0
for line in r.iter_lines(decode_unicode=True):
    if line:
        print(line)
    count += 1
    if count > 60:
        break
