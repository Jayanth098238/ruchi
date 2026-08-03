#!/usr/bin/env python3
"""
Debug Q&A endpoint to identify the 422 error
"""

import sys
import os
import requests
import json

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def test_qna_endpoint():
    """Test the Q&A endpoint with different payloads"""
    
    base_url = "http://127.0.0.1:8000"
    
    # First, let's test the test endpoint (no auth required)
    print("=== Testing Q&A Test Endpoint ===")
    try:
        response = requests.get(f"{base_url}/api/qna/test")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Test endpoint error: {e}")
    
    print("\n" + "="*50)
    
    # Test the main endpoint with different payloads
    print("=== Testing Q&A Ask Endpoint ===")
    
    # Test payloads that might cause 422 errors
    test_cases = [
        {
            "name": "Valid payload",
            "data": {"article_id": 1, "question": "What is this about?"}
        },
        {
            "name": "Missing article_id",
            "data": {"question": "What is this about?"}
        },
        {
            "name": "Missing question",
            "data": {"article_id": 1}
        },
        {
            "name": "Wrong data types",
            "data": {"article_id": "not_a_number", "question": "What is this about?"}
        },
        {
            "name": "Empty strings",
            "data": {"article_id": 1, "question": ""}
        },
        {
            "name": "Extra fields",
            "data": {"article_id": 1, "question": "What is this about?", "extra_field": "value"}
        }
    ]
    
    # We need a token for the main endpoint, but let's see what errors we get
    fake_token = "fake_token_for_testing"
    
    for test_case in test_cases:
        print(f"\n--- {test_case['name']} ---")
        try:
            response = requests.post(
                f"{base_url}/api/qna/ask",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {fake_token}"
                },
                json=test_case['data']
            )
            print(f"Status: {response.status_code}")
            try:
                print(f"Response: {response.json()}")
            except:
                print(f"Response text: {response.text}")
        except Exception as e:
            print(f"Request error: {e}")

if __name__ == "__main__":
    test_qna_endpoint()