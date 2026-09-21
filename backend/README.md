# Equity Research AI - Backend

A FastAPI-based backend for AI-powered equity research and news article analysis.

## Features

- **User Authentication**: JWT-based login/signup system
- **News Article Analysis**: AI-powered analysis of news articles via URL
- **Content Summarization**: Automatic article summarization
- **Sentiment Analysis**: Sentiment classification of articles
- **Sector Classification**: Automatic sector identification
- **Impact Scoring**: Financial impact assessment
- **User Profiles**: Personal account management
- **Article History**: Track all analyzed articles

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in the backend directory:

```env
# Database Configuration
DATABASE_URL=sqlite:///./articles.db

# Authentication
SECRET_KEY=your-super-secret-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Models
SUMMARIZATION_MODEL=sshleifer/distilbart-cnn-12-6
SENTIMENT_MODEL=distilbert-base-uncased-finetuned-sst-2-english
```

### 3. Run the Application

```bash
# Development
uvicorn app.main:app --reload

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Article Analysis
- `POST /api/analyze/url` - Analyze article from URL
- `GET /api/analyze/my-articles` - Get user's articles
- `GET /api/analyze/{article_id}` - Get specific article

### Other
- `GET /api/company/{symbol}` - Company information
- `GET /api/sector/{sector}` - Sector analysis
- `GET /api/qna` - Q&A functionality

## Database Schema

### Users Table
- `id`: Primary key
- `email`: Unique email address
- `username`: Unique username
- `full_name`: User's full name
- `hashed_password`: Encrypted password
- `is_active`: Account status
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

### Articles Table
- `id`: Primary key
- `user_id`: Foreign key to users table
- `url`: Article URL
- `title`: Article title
- `text`: Full article text
- `summary`: AI-generated summary
- `sentiment`: Sentiment analysis result
- `sector`: Sector classification
- `impact_score`: Financial impact score
- `created_at`: Analysis timestamp

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- CORS middleware configuration
- Input validation with Pydantic
- SQL injection protection with SQLAlchemy

## AI Models Used

- **Summarization**: DistilBART CNN model for article summarization
- **Sentiment**: DistilBERT model for sentiment analysis
- **Sector Classification**: Custom sector classification logic
- **Impact Scoring**: Algorithmic impact assessment

## Development

### Project Structure
```
backend/
├── app/
│   ├── config.py          # Configuration settings
│   ├── main.py            # FastAPI application
│   ├── db/
│   │   └── database.py    # Database configuration
│   ├── models/            # SQLAlchemy models
│   ├── routers/           # API route handlers
│   ├── schemas/           # Pydantic schemas
│   └── services/          # Business logic
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

### Adding New Features

1. Create models in `app/models/`
2. Define schemas in `app/schemas/`
3. Implement business logic in `app/services/`
4. Add API routes in `app/routers/`
5. Update main.py to include new routers

## Testing

The application includes comprehensive error handling and validation. Test the API endpoints using tools like:

- FastAPI's automatic interactive docs at `/docs`
- Postman or similar API testing tools
- Frontend integration testing

## Deployment

### Docker
```bash
docker build -t equity-research-ai .
docker run -p 8000:8000 equity-research-ai
```

### Environment Variables
Ensure all required environment variables are set in production:
- Strong `SECRET_KEY`
- Production database URL
- Appropriate CORS origins

## Support

For issues and questions, please check the project documentation or create an issue in the repository. 