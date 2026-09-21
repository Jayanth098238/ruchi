# Profile Page and QnA System Enhancements

## Overview
This document describes the enhancements made to the Equity Research AI application, specifically focusing on the profile page improvements and the new Question & Answer (QnA) system.

## Profile Page Enhancements

### New Features Added

#### 1. User Statistics Dashboard
- **Total Articles**: Shows the number of articles analyzed by the user
- **Average Impact Score**: Displays the mean impact score across all articles
- **Top Sectors**: Identifies the most frequently analyzed sectors
- **Recent Activity**: Shows when the last article was analyzed

#### 2. Sentiment Analysis Overview
- Visual representation of sentiment distribution across articles
- Color-coded sentiment indicators (Green for Positive, Red for Negative, Gray for Neutral)
- Count of articles for each sentiment category

#### 3. Enhanced Article Management
- Recent articles section with improved formatting
- Color-coded tags for sentiment, sector, and impact scores
- Better visual hierarchy and readability

#### 4. Integrated QnA System
- Direct access to ask questions about articles from the profile page
- Article selection dropdown for choosing which article to question
- Real-time question answering with AI-powered responses

### Technical Implementation
- Added new state management for articles and user statistics
- Implemented statistical calculations for user activity analysis
- Enhanced UI components with Tailwind CSS styling
- Responsive design for mobile and desktop viewing

## QnA System

### New QnA Service (`qna_service.py`)

#### Features
- **AI-Powered Question Answering**: Uses the `deepset/roberta-base-squad2` model for accurate answers
- **Fallback System**: Implements intelligent fallback when AI model is unavailable
- **Context-Aware**: Finds relevant sections of articles for better answers
- **Question Type Recognition**: Handles different question types (what, when, where, how, why)

#### Technical Details
- Built on Hugging Face Transformers library
- Implements text chunking for long articles
- Confidence scoring for answer quality
- Error handling and logging

### QnA Router (`qna.py`)

#### Endpoints
- `POST /api/qna/ask`: Submit questions about specific articles
- `GET /api/qna/test`: Test endpoint for service verification

#### Security
- JWT token authentication required
- User can only access their own articles
- Input validation and sanitization

### Frontend QnA Component

#### Features
- **Collapsible Interface**: Expandable Q&A section for each article
- **Question Suggestions**: Pre-built question templates for common queries
- **Real-time Responses**: Immediate AI-powered answers
- **Article Context**: Shows relevant article information for context

#### Integration Points
- Dashboard: Available for each analyzed article
- Profile Page: Centralized Q&A interface
- Reusable component architecture

## Usage Examples

### Asking Questions
1. Select an article from the dropdown
2. Type your question in the text area
3. Click "Ask Question" to get an AI-powered answer
4. Use suggested questions for common queries

### Question Types Supported
- **What questions**: "What is the main topic?"
- **When questions**: "When was this announced?"
- **Where questions**: "Where is the company located?"
- **How questions**: "How will this affect the market?"
- **Why questions**: "Why did this happen?"

## Installation and Setup

### Backend Requirements
The QnA service requires the following packages (already in requirements.txt):
```
transformers
torch
```

### Model Download
The service automatically downloads the required model (`deepset/roberta-base-squad2`) on first use.

### Testing
Run the test script to verify QnA functionality:
```bash
cd backend
python test_qna.py
```

## Performance Considerations

### Model Loading
- The QnA model is loaded once when the service starts
- Subsequent requests use the loaded model for faster responses

### Text Processing
- Articles are chunked to fit within model context limits
- Relevant sections are identified for better answer quality

### Fallback System
- Graceful degradation when AI model is unavailable
- Keyword-based answering as backup method

## Future Enhancements

### Planned Features
1. **Answer Confidence Scoring**: Display confidence levels for answers
2. **Question History**: Track previously asked questions
3. **Answer Export**: Save answers for later reference
4. **Multi-language Support**: Support for non-English articles
5. **Advanced Analytics**: Question patterns and user engagement metrics

### Technical Improvements
1. **Model Caching**: Implement model caching for better performance
2. **Answer Validation**: Add fact-checking capabilities
3. **Custom Training**: Fine-tune models on financial news data
4. **API Rate Limiting**: Implement request throttling

## Troubleshooting

### Common Issues

#### Model Loading Failures
- Check internet connection for model download
- Verify sufficient disk space for model storage
- Check Python environment and dependencies

#### Answer Quality Issues
- Ensure questions are specific and clear
- Verify article content is readable and complete
- Check if fallback system is working

#### Performance Issues
- Monitor memory usage during model loading
- Consider implementing model caching
- Optimize text chunking parameters

## Support

For technical support or feature requests, please refer to the main project documentation or create an issue in the project repository.
