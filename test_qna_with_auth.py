#!/usr/bin/env python3
"""
Test Q&A endpoint with proper authentication
"""

import sys
import os
import requests
import json

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def get_auth_token():
    """Get authentication token"""
    base_url = "http://127.0.0.1:8000"
    
    # Try to login with test credentials
    login_data = {
        "username": "test@example.com",  # Adjust as needed
        "password": "testpassword"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/auth/login",
            data=login_data,  # Form data for OAuth2
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

def test_qna_with_auth():
    """Test Q&A endpoint with proper authentication"""
    
    base_url = "http://127.0.0.1:8000"
    
    print("=== Getting Authentication Token ===")
    token = get_auth_token()
    
    if not token:
        print("Could not get authentication token. Creating a test user...")
        
        # Try to create a test user
        signup_data = {
            "email": "test@example.com",
            "password": "testpassword",
            "full_name": "Test User"
        }
        
        try:
            response = requests.post(
                f"{base_url}/api/auth/signup",
                json=signup_data
            )
            print(f"Signup response: {response.status_code} - {response.text}")
            
            if response.status_code in [200, 201]:
                # Try login again
                token = get_auth_token()
        except Exception as e:
            print(f"Signup error: {e}")
    
    if not token:
        print("❌ Could not authenticate. Testing without auth...")
        token = "fake_token"
    else:
        print(f"✅ Got token: {token[:20]}...")
    
    print("\n" + "="*50)
    print("=== Testing Q&A Ask Endpoint with Auth ===")
    
    # Test different payloads
    test_cases = [
        {
            "name": "Valid payload",
            "data": {"article_id": 1, "question": "What is this about?"}
        },
        {
            "name": "String article_id (should cause 422)",
            "data": {"article_id": "1", "question": "What is this about?"}
        },
        {
            "name": "Missing article_id (should cause 422)",
            "data": {"question": "What is this about?"}
        },
        {
            "name": "Missing question (should cause 422)",
            "data": {"article_id": 1}
        },
        {
            "name": "Empty question (should work)",
            "data": {"article_id": 1, "question": ""}
        },
        {
            "name": "Null values (should cause 422)",
            "data": {"article_id": None, "question": None}
        }
    ]
    
    for test_case in test_cases:
        print(f"\n--- {test_case['name']} ---")
        try:
            response = requests.post(
                f"{base_url}/api/qna/ask",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}"
                },
                json=test_case['data']
            )
            print(f"Status: {response.status_code}")
            try:
                response_data = response.json()
                print(f"Response: {json.dumps(response_data, indent=2)}")
            except:
                print(f"Response text: {response.text}")
                
            # Check if this is the 422 error we're looking for
            if response.status_code == 422:
                print("🔍 Found 422 error! This might be the issue.")
                
        except Exception as e:
            print(f"Request error: {e}")

if __name__ == "__main__":
    test_qna_with_auth()