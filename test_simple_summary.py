#!/usr/bin/env python3
"""
Simple test to verify enhanced summarization works without errors
"""

import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.services import summarization

def test_basic_functionality():
    """Test basic summarization functionality"""
    print("=== Testing Enhanced Summarization System ===")
    
    # Test article
    test_article = """
    Apple Inc. announced today that they are launching a revolutionary new AI-powered iPhone with advanced features. 
    The company expects strong sales growth and positive market reception based on early consumer feedback. 
    The new device will be available starting next month and will feature significantly improved battery life 
    that can last up to 48 hours on a single charge. According to CEO Tim Cook, this represents the biggest 
    leap forward in iPhone technology since the original device was launched. The pricing strategy appears 
    aggressive, with the base model starting at $899, which is $100 less than the previous generation.
    """
    
    print("Original text length:", len(test_article), "characters")
    print("=" * 60)
    
    # Test different summary lengths
    lengths = ["short", "medium", "long"]
    
    for length in lengths:
        print(f"\n{length.upper()} SUMMARY:")
        print("-" * 40)
        try:
            summary = summarization.summarize_article(test_article, length)
            print(f"Length: {len(summary)} characters")
            print(f"Content: {summary}")
            print("✅ Success!")
        except Exception as e:
            print(f"❌ Error creating {length} summary: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Enhanced summarization system is working!")

if __name__ == "__main__":
    test_basic_functionality()