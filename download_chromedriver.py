import requests
import zipfile
import os
import shutil

def download_file(url, filename):
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        total_length = int(r.headers.get('content-length', 0))
        dl = 0
        with open(filename, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    dl += len(chunk)
                    f.write(chunk)
                    done = int(50 * dl / total_length)
                    print(f"{filename} [{'=' * done}{' ' * (50-done)}] {dl}/{total_length} bytes", end='')

def extract_zip(zip_filename, extract_to="."):
    with zipfile.ZipFile(zip_filename, 'r') as zip_ref:
        zip_ref.extractall(extract_to)

def move_file(src, dest):
    shutil.move(src, dest)

def download_chromedriver():
    try:
        # Step 1: Get the latest stable version number of chromedriver
        version_info_url = "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json"
        response = requests.get(version_info_url)
        version_info = response.json()

        stable_version = version_info["channels"]["Stable"]["version"]
        print(f"Latest stable version of chromedriver is: {stable_version}")

        # Step 2: Download the chromedriver zip file
        download_url = f"https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/{stable_version}/win64/chromedriver-win64.zip"
        zip_filename = "chromedriver-win64.zip"
        download_file(download_url, zip_filename)

        # Step 3: Extract the zip file
        extract_zip(zip_filename)

        # Step 4: Move chromedriver.exe if it is in a subdirectory
        for member in zipfile.ZipFile(zip_filename, 'r').namelist():
            if member.endswith('chromedriver.exe'):
                source_path = os.path.join(".", member)
                if os.path.dirname(member):  # chromedriver.exe is in a subdirectory
                    move_file(source_path, "./chromedriver.exe")
                    shutil.rmtree(os.path.dirname(source_path))  # Remove the subdirectory
                    print("Moved chromedriver.exe to current directory.")
                break

        # Delete the ZIP file
        os.remove(zip_filename)
    except Exception as e:
        print(f"error: {e}")

if __name__ == '__main__':
    os.system('cls')
    download_chromedriver()
