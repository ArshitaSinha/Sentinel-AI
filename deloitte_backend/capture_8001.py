import requests

url = 'http://127.0.0.1:8001/api/generate-tests'
body = {"path":"C:\\Users\\arshi\\Downloads\\Sentinel-AI-main\\Sentinel-AI-main\\deloitte_backend\\ai_analyzer","mode":"local"}

with requests.post(url, json=body, stream=True, timeout=300) as r:
    print('status', r.status_code)
    r.raise_for_status()
    with open('gen_tests_from_api_8001.ndjson', 'wb') as fh:
        for chunk in r.iter_content(chunk_size=8192):
            if chunk:
                fh.write(chunk)
print('wrote gen_tests_from_api_8001.ndjson')
