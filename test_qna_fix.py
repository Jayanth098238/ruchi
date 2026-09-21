#!/usr/bin/env python3
"""
Test script to verify Q&A functionality is working properly
"""

import requests
import json
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.services import qna_service

def test_qna_service_directly():
    """Test the Q&A service directly without HTTP"""
    print("=== Testing Q&A Service Directly ===")
    
    test_article = """
    Apple Inc. announced today that they are launching a new AI-powered iPhone with advanced features. 
    The company expects strong sales growth and positive market reception. The new device will be 
    available starting next month and will feature improved battery life, enhanced camera capabilities, 
    and revolutionary AI integration that can help users with daily tasks.
    """
    
    test_questions = [
        "What did Apple announce?",
        "When will the device be available?",
        "What are the key features?",
        "What does the company expect?"
    ]
    
    for question in test_questions:
        try:
            answer = qna_service.answer_question(test_article, question)
            print(f"Q: {question}")
            print(f"A: {answer}")
            print("-" * 50)
        except Exception as e:
            print(f"Error answering '{question}': {e}")
            print("-" * 50)

def test_qna_http_endpoint():
    """Test the Q&A HTTP endpoint"""
    print("\n=== Testing Q&A HTTP Endpoint ===")
    
    # Test the test endpoint first
    try:
        response = requests.get('http://127.0.0.1:8000/api/qna/test', timeout=10)
        print(f"Test endpoint status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Test result: {data}")
        else:
            print(f"Test endpoint failed: {response.text}")
    except Exception as e:
        print(f"Error testing HTTP endpoint: {e}")

def main():
    print("Q&A Functionality Test")
    print("=" * 50)
    
    # Test 1: Direct service test
    test_qna_service_directly()
    
    # Test 2: HTTP endpoint test
    test_qna_http_endpoint()
    
    print("\n=== Summary ===")
    print("If you see answers above, the Q&A service is working correctly.")
    print("The issue was likely with the frontend making requests to relative URLs")
    print("instead of the full backend URL (http://127.0.0.1:8000).")
    print("\nThe fix involved:")
    print("1. Creating a config file with the correct API base URL")
    print("2. Updating all frontend components to use the full backend URL")
    print("3. This ensures the static frontend can communicate with the backend")

if __name__ == "__main__":
    main()