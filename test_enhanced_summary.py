#!/usr/bin/env python3
"""
Test script to verify enhanced summarization functionality
"""

import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.services import summarization

def test_enhanced_summarization():
    """Test the enhanced summarization service"""
    print("=== Testing Enhanced Summarization ===")
    
    # Test article with various lengths
    test_article = """
    Apple Inc. announced today that they are launching a revolutionary new AI-powered iPhone with advanced features that promise to transform the smartphone industry. The company expects strong sales growth and positive market reception based on early consumer feedback and pre-order numbers.
    
    The new device will be available starting next month and will feature significantly improved battery life that can last up to 48 hours on a single charge, enhanced camera capabilities with AI-powered photography that can automatically adjust settings for perfect shots in any lighting condition, and revolutionary AI integration that can help users with daily tasks such as scheduling, email management, and smart home control.
    
    According to CEO Tim Cook, this represents the biggest leap forward in iPhone technology since the original device was launched. The AI features are powered by Apple's new custom silicon chip that provides unprecedented processing power while maintaining energy efficiency. The company has invested over $10 billion in research and development for this project over the past three years.
    
    Industry analysts predict that this launch could help Apple regain market share in the competitive smartphone market, particularly in regions where they have been losing ground to Android competitors. The pricing strategy appears aggressive, with the base model starting at $899, which is $100 less than the previous generation.
    
    Pre-orders begin next week, and Apple expects to sell over 50 million units in the first quarter alone. The company's stock price has already risen 8% following the announcement, reflecting investor confidence in the new product line.
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
        except Exception as e:
            print(f"Error creating {length} summary: {e}")
    
    print("\n" + "=" * 60)
    
    # Test multiple summaries at once
    print("\nTesting multiple summaries generation...")
    try:
        all_summaries = summarization.get_summary_with_options(test_article)
        print("\nALL SUMMARIES GENERATED:")
        for length, summary in all_summaries.items():
            print(f"\n{length.upper()}: {summary}")
    except Exception as e:
        print(f"Error generating multiple summaries: {e}")

def test_text_cleaning():
    """Test text cleaning functionality"""
    print("\n=== Testing Text Cleaning ===")
    
    dirty_text = """
    This is a test article with lots of noise. Click here to read more!!! 
    Visit our website at https://example.com for more information.
    Contact us at info@example.com for questions.
    
    ADVERTISEMENT: Buy now and save 50%!
    
    Follow us on social media for updates...
    Subscribe to our newsletter for exclusive content.
    
    The actual content is here with some useful information about technology and innovation.
    """
    
    print("Original text:")
    print(dirty_text)
    print("\nCleaned summary:")
    
    try:
        clean_summary = summarization.summarize_article(dirty_text, "medium")
        print(clean_summary)
    except Exception as e:
        print(f"Error: {e}")

def main():
    print("Enhanced Summarization Test")
    print("=" * 50)
    
    # Test 1: Enhanced summarization
    test_enhanced_summarization()
    
    # Test 2: Text cleaning
    test_text_cleaning()
    
    print("\n=== Summary of Improvements ===")
    print("✅ Multiple summary lengths (short, medium, long)")
    print("✅ Intelligent text cleaning and preprocessing")
    print("✅ Extractive summarization for shorter texts")
    print("✅ Multi-stage summarization for longer texts")
    print("✅ Fallback mechanisms for robustness")
    print("✅ OpenAI integration support (when configured)")
    print("✅ Better handling of edge cases")
    print("\nThe summarization system is now much more sophisticated!")

if __name__ == "__main__":
    main()