#!/usr/bin/env python3
"""
Test script for QnA service
"""

import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.qna_service import answer_question

def test_qna_service():
    """Test the QnA service with sample data"""
    
    print("Testing QnA Service...")
    print("=" * 50)
    
    # Test article content
    test_article = """
    Apple Inc. announced today that they are launching a new AI-powered iPhone with advanced features. 
    The company expects strong sales growth and positive market reception. The new device will be available 
    starting next month. Analysts predict this could boost Apple's market share by 15% in the next quarter. 
    The AI features include advanced photo editing, voice recognition, and predictive text capabilities.
    """
    
    # Test questions
    test_questions = [
        "What did Apple announce?",
        "When will the new device be available?",
        "What are the AI features?",
        "What is the expected market impact?",
        "How much could Apple's market share increase?"
    ]
    
    print(f"Article: {test_article.strip()}")
    print("\n" + "=" * 50)
    
    for question in test_questions:
        print(f"\nQuestion: {question}")
        try:
            answer = answer_question(test_article, question)
            print(f"Answer: {answer}")
        except Exception as e:
            print(f"Error: {e}")
    
    print("\n" + "=" * 50)
    print("QnA Service test completed!")

if __name__ == "__main__":
    test_qna_service()
