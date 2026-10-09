
import requests

url = "http://127.0.0.1:8000/health"

try:
    response = requests.get(url, timeout=5)

    response.raise_for_status()

    data = response.json()

    print("Status code:", response.status_code)
    print("Response:", data)

except requests.exceptions.Timeout:
    print("The request took too long.")

except requests.exceptions.ConnectionError:
    print("Could not connect to the DevMind API.")

except requests.exceptions.HTTPError as error:
    print("The API returned an HTTP error:", error)

except requests.exceptions.RequestException as error:
    print("An unexpected request error occurred:", error)
