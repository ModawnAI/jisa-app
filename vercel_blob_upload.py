#!/usr/bin/env python3
"""
Vercel Blob storage upload module for PDFs.
Equivalent to the TypeScript Vercel Blob upload functionality.
"""

import os
import requests
from pathlib import Path
from typing import Dict
from dotenv import load_dotenv

load_dotenv()


def sanitize_blob_filename(filename: str) -> str:
    """
    Sanitize filename for Vercel Blob storage.
    Creates robust, URL-safe filenames.
    """
    # Get extension
    path_obj = Path(filename)
    ext = path_obj.suffix
    base = path_obj.stem

    # Replace spaces with hyphens
    base = base.replace(' ', '-')

    # Remove special characters (keep alphanumeric, Korean, hyphen, underscore)
    import re
    base = re.sub(r'[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ_-]', '', base)

    # Remove consecutive hyphens/underscores
    base = re.sub(r'[-_]+', '-', base)

    # Trim hyphens from start/end
    base = base.strip('-')

    # If base is empty after sanitization, use timestamp
    if not base:
        import time
        base = f"file-{int(time.time() * 1000)}"

    # Lowercase for consistency
    base = base.lower()

    return f"{base}{ext}"


def upload_pdf_to_blob(pdf_path: str, token: str) -> str:
    """
    Upload PDF to Vercel Blob storage using REST API.

    Args:
        pdf_path: Path to the PDF file
        token: Vercel Blob token (BLOB_READ_WRITE_TOKEN)

    Returns:
        str: Public URL of the uploaded PDF
    """
    print(f"    [☁️] Uploading PDF to Vercel Blob...")

    filename = Path(pdf_path).name
    sanitized_filename = sanitize_blob_filename(filename)
    blob_path = f"pdfs/{sanitized_filename}"

    # Read PDF file
    with open(pdf_path, 'rb') as f:
        file_content = f.read()

    # Vercel Blob API endpoint
    url = f"https://blob.vercel-storage.com/{blob_path}"

    # Upload using PUT request
    headers = {
        'Authorization': f'Bearer {token}',
        'x-content-type': 'application/pdf',
        'x-add-random-suffix': '0',  # Don't add random suffix
        'x-access': 'public'
    }

    response = requests.put(url, data=file_content, headers=headers)

    if response.status_code not in [200, 201]:
        raise Exception(f"Upload failed: {response.status_code} - {response.text}")

    result = response.json()
    uploaded_url = result.get('url', '')

    print(f"    [✓] PDF uploaded: {uploaded_url}")
    return uploaded_url


def upload_all_pdfs(pdf_dir: str, token: str) -> Dict[str, str]:
    """
    Upload all PDFs in a directory to Vercel Blob.

    Args:
        pdf_dir: Directory containing PDFs
        token: Vercel Blob token

    Returns:
        Dict mapping original filenames to uploaded URLs
    """
    pdf_dir_path = Path(pdf_dir)
    pdf_files = list(pdf_dir_path.glob("*.pdf"))

    print(f"\n[📤] Uploading {len(pdf_files)} PDFs from {pdf_dir}")

    url_mapping = {}

    for pdf_path in pdf_files:
        try:
            uploaded_url = upload_pdf_to_blob(str(pdf_path), token)
            url_mapping[pdf_path.name] = uploaded_url
            print(f"  ✓ {pdf_path.name}")
        except Exception as e:
            print(f"  ✗ {pdf_path.name}: {e}")

    return url_mapping


def test_blob_upload(token: str) -> None:
    """Test Vercel Blob upload functionality."""
    print("\n[🧪] Testing Vercel Blob upload...")

    import time
    test_content = f"Hello from Python! {time.time()}"
    test_path = f"test/hello-{int(time.time() * 1000)}.txt"

    url = f"https://blob.vercel-storage.com/{test_path}"

    headers = {
        'Authorization': f'Bearer {token}',
        'x-content-type': 'text/plain',
        'x-add-random-suffix': '0',
        'x-access': 'public'
    }

    try:
        response = requests.put(url, data=test_content.encode('utf-8'), headers=headers)
        response.raise_for_status()
        result = response.json()
        uploaded_url = result.get('url', '')
        print(f"[✓] Test upload successful: {uploaded_url}")
    except Exception as e:
        print(f"[❌] Test upload failed: {e}")
        raise


if __name__ == "__main__":
    # Load token from .env
    blob_token = os.getenv("BLOB_READ_WRITE_TOKEN")

    if not blob_token:
        print("❌ Error: BLOB_READ_WRITE_TOKEN not found in .env")
        exit(1)

    # Test upload
    test_blob_upload(blob_token)

    # Upload PDFs from MODIFIED directory
    modified_dir = Path(__file__).parent / "MODIFIED"
    url_mapping = upload_all_pdfs(str(modified_dir), blob_token)

    # Print results
    print("\n" + "="*80)
    print("UPLOAD COMPLETE")
    print("="*80)
    for filename, url in url_mapping.items():
        print(f"{filename}")
        print(f"  → {url}")
        print()
