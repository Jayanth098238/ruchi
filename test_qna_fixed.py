#!/usr/bin/env python3
"""
Test Q&A endpoint with proper authentication - FIXED
"""

import sys
import os
import requests
import json

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def create_test_user():
    """Create a test user"""
    base_url = "http://127.0.0.1:8000"
    
    signup_data = {
        "email": "testqna@example.com",
        "username": "testqna",
        "password": "testpassword123",
        "full_name": "Test QnA User"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/auth/signup",
            json=signup_data,  # Use JSON, not form data
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code in [200, 201]:
            print("✅ Test user created successfully")
            return True
        elif response.status_code == 400:
            # User might already exist
            error_data = response.json()
            if "already registered" in error_data.get("detail", ""):
                print("ℹ️ Test user already exists")
                return True
            else:
                print(f"❌ Signup failed: {error_data}")
                return False
        else:
            print(f"❌ Signup failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Signup error: {e}")
        return False

def get_auth_token():
    """Get authentication token"""
    base_url = "http://127.0.0.1:8000"
    
    login_data = {
        "email": "testqna@example.com",
        "password": "testpassword123"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/auth/login",
            json=login_data,  # Use JSON, not form data
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def create_test_article(token):
    """Create a test article to use for Q&A"""
    base_url = "http://127.0.0.1:8000"
    
    article_data = {
        "url": "https://example.com/test-article"
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/analyze/url",
            json=article_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            }
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            article_id = data.get("id")
            print(f"✅ Test article created with ID: {article_id}")
            return article_id
        else:
            print(f"❌ Article creation failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Article creation error: {e}")
        return None

def test_qna_endpoint():
    """Test Q&A endpoint with proper authentication"""
    
    base_url = "http://127.0.0.1:8000"
    
    print("=== Setting up test environment ===")
    
    # Create test user
    if not create_test_user():
        print("❌ Could not create test user")
        return
    
    # Get authentication token
    token = get_auth_token()
    if not token:
        print("❌ Could not get authentication token")
        return
    
    print(f"✅ Got authentication token")
    
    # Create test article
    article_id = create_test_article(token)
    if not article_id:
        print("⚠️ Could not create test article, using ID 1")
        article_id = 1
    
    print("\n" + "="*50)
    print("=== Testing Q&A Ask Endpoint ===")
    
    # Test different payloads that might cause 422 errors
    test_cases = [
        {
            "name": "✅ Valid payload",
            "data": {"article_id": article_id, "question": "What is this article about?"}
        },
        {
            "name": "❌ String article_id (should cause 422)",
            "data": {"article_id": str(article_id), "question": "What is this about?"}
        },
        {
            "name": "❌ Missing article_id (should cause 422)",
            "data": {"question": "What is this about?"}
        },
        {
            "name": "❌ Missing question (should cause 422)",
            "data": {"article_id": article_id}
        },
        {
            "name": "⚠️ Empty question (might work)",
            "data": {"article_id": article_id, "question": ""}
        },
        {
            "name": "❌ Null values (should cause 422)",
            "data": {"article_id": None, "question": None}
        },
        {
            "name": "❌ Wrong field names (should cause 422)",
            "data": {"articleId": article_id, "q": "What is this about?"}
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
                if response.status_code == 422:
                    print("🔍 FOUND 422 ERROR!")
                    print(f"Error details: {json.dumps(response_data, indent=2)}")
                elif response.status_code == 200:
                    print(f"✅ Success: {response_data.get('answer', 'No answer')[:100]}...")
                else:
                    print(f"Response: {json.dumps(response_data, indent=2)}")
            except:
                print(f"Response text: {response.text}")
                
        except Exception as e:
            print(f"Request error: {e}")

if __name__ == "__main__":
    test_qna_endpoint()