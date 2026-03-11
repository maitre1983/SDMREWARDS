"""
SEO & Analytics Router for SDM REWARDS
Provides:
- Sitemap generation
- AI-powered SEO analysis
- Keyword performance tracking
- Visitor analytics
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/seo", tags=["seo"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

class SEOAnalysisRequest(BaseModel):
    url: Optional[str] = None
    content: Optional[str] = None
    target_keywords: Optional[List[str]] = None

class SEORecommendation(BaseModel):
    category: str
    priority: str  # high, medium, low
    title: str
    description: str
    action: str

class KeywordAnalysis(BaseModel):
    keyword: str
    search_volume: str  # high, medium, low (estimated)
    competition: str
    relevance_score: float
    recommendation: str


# Static sitemap - no auth required
@router.get("/sitemap.xml")
async def get_sitemap():
    """Generate XML sitemap for SEO crawlers"""
    base_url = os.environ.get("CALLBACK_BASE_URL", "https://sdmrewards.com")
    
    pages = [
        {"loc": "/", "priority": "1.0", "changefreq": "daily"},
        {"loc": "/client-auth", "priority": "0.9", "changefreq": "weekly"},
        {"loc": "/merchant-auth", "priority": "0.9", "changefreq": "weekly"},
        {"loc": "/faq", "priority": "0.8", "changefreq": "monthly"},
        {"loc": "/privacy-policy", "priority": "0.5", "changefreq": "yearly"},
        {"loc": "/terms-of-service", "priority": "0.5", "changefreq": "yearly"},
        {"loc": "/merchant-terms", "priority": "0.5", "changefreq": "yearly"},
        {"loc": "/referral-terms", "priority": "0.5", "changefreq": "yearly"},
        {"loc": "/cashback-rules", "priority": "0.6", "changefreq": "monthly"},
        {"loc": "/abuse-policy", "priority": "0.4", "changefreq": "yearly"},
    ]
    
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    for page in pages:
        xml_content += f'''  <url>
    <loc>{base_url}{page["loc"]}</loc>
    <lastmod>{datetime.now(timezone.utc).strftime("%Y-%m-%d")}</lastmod>
    <changefreq>{page["changefreq"]}</changefreq>
    <priority>{page["priority"]}</priority>
  </url>\n'''
    
    xml_content += '</urlset>'
    
    return Response(content=xml_content, media_type="application/xml")


@router.get("/robots.txt")
async def get_robots():
    """Generate robots.txt for SEO crawlers"""
    base_url = os.environ.get("CALLBACK_BASE_URL", "https://sdmrewards.com")
    
    content = f"""# SDM REWARDS Robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin*
Disallow: /dashboard
Disallow: /merchant-dashboard

# Sitemap
Sitemap: {base_url}/api/seo/sitemap.xml

# Crawl-delay for all bots
Crawl-delay: 1

# Google-specific
User-agent: Googlebot
Allow: /
Crawl-delay: 0

# Bing-specific  
User-agent: Bingbot
Allow: /
Crawl-delay: 1
"""
    return Response(content=content, media_type="text/plain")


@router.get("/analytics/overview")
async def get_seo_analytics_overview():
    """Get SEO analytics overview for admin dashboard"""
    try:
        # Get basic stats from database
        total_users = await db.clients.count_documents({})
        total_merchants = await db.merchants.count_documents({})
        total_transactions = await db.transactions.count_documents({})
        
        # Calculate growth metrics
        now = datetime.now(timezone.utc)
        thirty_days_ago = datetime(now.year, now.month - 1 if now.month > 1 else 12, now.day, tzinfo=timezone.utc)
        
        new_users_30d = await db.clients.count_documents({
            "created_at": {"$gte": thirty_days_ago}
        })
        
        new_merchants_30d = await db.merchants.count_documents({
            "created_at": {"$gte": thirty_days_ago}
        })
        
        return {
            "overview": {
                "total_users": total_users,
                "total_merchants": total_merchants,
                "total_transactions": total_transactions,
                "new_users_30d": new_users_30d,
                "new_merchants_30d": new_merchants_30d,
            },
            "seo_metrics": {
                "indexed_pages": 10,
                "sitemap_urls": 10,
                "structured_data_types": ["Organization", "FAQPage", "Product", "LocalBusiness"],
            },
            "target_keywords": [
                {"keyword": "cashback ghana", "status": "tracking"},
                {"keyword": "rewards program ghana", "status": "tracking"},
                {"keyword": "loyalty rewards accra", "status": "tracking"},
                {"keyword": "mobile money rewards", "status": "tracking"},
                {"keyword": "fintech ghana", "status": "tracking"},
            ]
        }
    except Exception as e:
        return {
            "overview": {},
            "seo_metrics": {},
            "target_keywords": [],
            "error": str(e)
        }


@router.post("/analyze")
async def analyze_seo(request: SEOAnalysisRequest):
    """
    AI-powered SEO analysis endpoint
    Uses Emergent LLM to analyze content and provide recommendations
    """
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        from dotenv import load_dotenv
        load_dotenv()
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")
        
        # Create the analysis prompt
        analysis_prompt = f"""You are an SEO expert specializing in fintech and loyalty programs in Ghana.
        
Analyze the following content/page for SEO optimization:

Target Keywords: {', '.join(request.target_keywords or ['cashback', 'rewards', 'loyalty program', 'mobile payments', 'fintech Ghana'])}

Content to analyze:
{request.content or 'Landing page for SDM REWARDS - A cashback and loyalty rewards platform in Ghana'}

URL: {request.url or 'https://sdmrewards.com'}

Provide your analysis in the following JSON format:
{{
    "overall_score": <0-100>,
    "recommendations": [
        {{
            "category": "<technical|content|keywords|structure>",
            "priority": "<high|medium|low>",
            "title": "<brief title>",
            "description": "<detailed description>",
            "action": "<specific action to take>"
        }}
    ],
    "keyword_analysis": [
        {{
            "keyword": "<keyword>",
            "search_volume": "<high|medium|low>",
            "competition": "<high|medium|low>",
            "relevance_score": <0-1>,
            "recommendation": "<how to better optimize for this keyword>"
        }}
    ],
    "content_suggestions": [
        "<suggestion for improving content>"
    ],
    "meta_suggestions": {{
        "title": "<suggested meta title>",
        "description": "<suggested meta description>",
        "keywords": ["<keyword1>", "<keyword2>"]
    }}
}}

Respond ONLY with the JSON, no additional text."""

        # Initialize LLM chat
        chat = LlmChat(
            api_key=api_key,
            session_id=f"seo-analysis-{datetime.now().timestamp()}",
            system_message="You are an SEO expert. Always respond with valid JSON only."
        ).with_model("openai", "gpt-5.2")
        
        # Send message and get response
        user_message = UserMessage(text=analysis_prompt)
        response = await chat.send_message(user_message)
        
        # Parse the JSON response
        import json
        try:
            # Clean the response if needed
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            analysis_result = json.loads(response_text)
            
            # Store the analysis in database for history
            await db.seo_analyses.insert_one({
                "url": request.url,
                "target_keywords": request.target_keywords,
                "result": analysis_result,
                "created_at": datetime.now(timezone.utc)
            })
            
            return {
                "success": True,
                "analysis": analysis_result
            }
        except json.JSONDecodeError:
            return {
                "success": True,
                "analysis": {
                    "raw_response": response,
                    "parse_error": "Could not parse as JSON"
                }
            }
            
    except ImportError:
        raise HTTPException(
            status_code=500, 
            detail="LLM integration not available. Install emergentintegrations package."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/keywords/suggestions")
async def get_keyword_suggestions(industry: str = "fintech", location: str = "ghana"):
    """Get AI-powered keyword suggestions for the platform"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        from dotenv import load_dotenv
        load_dotenv()
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            # Return static suggestions if no API key
            return {
                "success": True,
                "keywords": [
                    {"keyword": "cashback ghana", "category": "primary", "difficulty": "medium"},
                    {"keyword": "rewards program accra", "category": "primary", "difficulty": "low"},
                    {"keyword": "mobile money rewards", "category": "primary", "difficulty": "medium"},
                    {"keyword": "loyalty card ghana", "category": "secondary", "difficulty": "low"},
                    {"keyword": "momo cashback", "category": "secondary", "difficulty": "low"},
                    {"keyword": "fintech ghana", "category": "industry", "difficulty": "high"},
                    {"keyword": "merchant rewards program", "category": "b2b", "difficulty": "medium"},
                    {"keyword": "earn money shopping ghana", "category": "long-tail", "difficulty": "low"},
                ]
            }
        
        prompt = f"""Generate a list of 15 SEO keywords for a {industry} company in {location}.
The company is SDM REWARDS - a cashback and loyalty rewards platform.

Return as JSON array with format:
[{{"keyword": "...", "category": "primary|secondary|long-tail|industry|b2b", "difficulty": "low|medium|high", "monthly_searches_estimate": "..."}}]

Focus on:
- Cashback and rewards terms
- Mobile money related terms  
- Loyalty program terms
- Ghana-specific terms
- Fintech terms

Respond ONLY with the JSON array."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"keyword-suggestions-{datetime.now().timestamp()}",
            system_message="You are an SEO keyword research expert. Always respond with valid JSON only."
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        import json
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        
        keywords = json.loads(response_text)
        
        return {
            "success": True,
            "keywords": keywords
        }
        
    except Exception:
        # Return static suggestions on error
        return {
            "success": True,
            "keywords": [
                {"keyword": "cashback ghana", "category": "primary", "difficulty": "medium"},
                {"keyword": "rewards program accra", "category": "primary", "difficulty": "low"},
                {"keyword": "mobile money rewards", "category": "primary", "difficulty": "medium"},
                {"keyword": "loyalty card ghana", "category": "secondary", "difficulty": "low"},
                {"keyword": "fintech ghana", "category": "industry", "difficulty": "high"},
            ],
            "source": "static"
        }


@router.post("/content/generate")
async def generate_seo_content(
    content_type: str = "meta_description",
    topic: str = "cashback rewards"
):
    """Generate SEO-optimized content using AI"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        from dotenv import load_dotenv
        load_dotenv()
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")
        
        prompts = {
            "meta_description": f"Write a compelling 155-character meta description for a page about {topic} on SDM REWARDS, a cashback platform in Ghana. Include a call to action.",
            "meta_title": f"Write an SEO-optimized page title (max 60 chars) for a page about {topic} on SDM REWARDS.",
            "heading_suggestions": f"Suggest 5 H2 headings for a landing page about {topic} for SDM REWARDS cashback platform in Ghana.",
            "blog_outline": f"Create a blog post outline about {topic} for SDM REWARDS, targeting keywords related to cashback and rewards in Ghana.",
        }
        
        prompt = prompts.get(content_type, prompts["meta_description"])
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"content-gen-{datetime.now().timestamp()}",
            system_message="You are an SEO content writer specializing in fintech. Write concise, engaging content."
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {
            "success": True,
            "content_type": content_type,
            "topic": topic,
            "generated_content": response.strip()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")


@router.get("/history")
async def get_seo_analysis_history(limit: int = 10):
    """Get history of SEO analyses"""
    try:
        analyses = await db.seo_analyses.find().sort("created_at", -1).limit(limit).to_list(length=limit)
        
        for analysis in analyses:
            analysis["_id"] = str(analysis["_id"])
            if "created_at" in analysis:
                analysis["created_at"] = analysis["created_at"].isoformat()
        
        return {"analyses": analyses}
    except Exception as e:
        return {"analyses": [], "error": str(e)}
