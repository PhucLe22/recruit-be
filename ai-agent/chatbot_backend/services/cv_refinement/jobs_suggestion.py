import os
import json
import re
import logging
import textwrap
from datetime import datetime
from typing import List, Dict, Any, Optional
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
from utils.llm_utils import get_hf_model, init_gemini

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def extract_skills_and_experience(resume_text: str, model_name: str = "gpt2") -> dict:
    """
    Extract skills and experience from resume text using LLM.
    """
    # Create a simple prompt instead of using chat template
    prompt = textwrap.dedent(f"""
        Analyze this resume and extract the following information:
        
        1. List of technical skills with years of experience
        2. Job titles/roles
        3. Industries/domains
        4. Education level
        
        Return a JSON object with this structure:
        {{
            "technical_skills": [{{"name": "Python", "experience_years": 3}}],
            "job_titles": ["Software Engineer"],
            "industries": ["Technology"],
            "education_level": "Bachelor's in Computer Science"
        }}
        
        Resume:
        {resume_text}
        
        JSON Output:
    """)
    
    try:
        if "gemini" in model_name.lower():
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY not found in environment variables")
            llm = init_gemini(model_name, api_key)
            result = llm.generate_content(prompt).text
        else:
            tokenizer, model = get_hf_model(model_name)
            inputs = tokenizer(prompt, return_tensors="pt", return_token_type_ids=False).to(model.device)
            out = model.generate(**inputs, max_new_tokens=1024, eos_token_id=tokenizer.eos_token_id)
            result = tokenizer.decode(out[0], skip_special_tokens=True)
            # Extract just the JSON part if there's any extra text
            if "{" in result and "}" in result:
                result = result[result.find("{"):result.rfind("}")+1]
        
        return json.loads(result)
        
    except Exception as e:
        logger.error(f"Error in extract_skills_and_experience: {str(e)}")
        return {
            "technical_skills": [],
            "job_titles": [],
            "industries": [],
            "education_level": ""
        }

def get_matching_jobs(resume_data: dict, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Simplified job matching function with flexible criteria.
    
    Args:
        resume_data: Dictionary containing parsed resume data
        limit: Maximum number of jobs to return
        
    Returns:
        List of matching jobs with match scores and details
    """
    try:
        logger.info("Starting job matching process...")
        
        # Extract and process resume data
        skills = set(skill['name'].lower().strip() for skill in resume_data.get('technical_skills', []) if skill.get('name'))
        job_titles = [title.lower().strip() for title in resume_data.get('job_titles', []) if title]
        level = resume_data.get('level', '').lower()
        
        logger.info(f"Processing resume with {len(skills)} skills and {len(job_titles)} job titles")
        
        if not skills and not job_titles:
            logger.warning("No skills or job titles found in resume")
            return []
            
        # Connect to MongoDB
        mongo_uri = os.getenv("MONGO_ATLAS_URI")
        if not mongo_uri:
            raise ValueError("MONGO_ATLAS_URI not found in environment variables")
            
        client = MongoClient(mongo_uri)
        db = client["CVProject"]
        jobs_collection = db["jobs"]
        
        # Create a case-insensitive regex pattern for job titles
        title_pattern = "|\\.".join(re.escape(t) for t in job_titles)
        
        # Build the aggregation pipeline
        pipeline = [
            # First, find jobs that match either title or skills
            {
                "$match": {
                    "$and": [
                        # Must match at least one of these conditions
                        {"$or": [
                            # Match job titles (case insensitive) only if we have job titles
                            *([{"title": {"$regex": title_pattern, "$options": "i"}}] if job_titles else []),
                            # Or match any of the required skills
                            {"required_skills": {"$in": list(skills)}},
                            # Or match any of the preferred skills
                            {"preferred_skills": {"$in": list(skills)}}
                        ]},
                        # Additional filtering to ensure relevance
                        {"$or": [
                            # Either match required skills
                            {"required_skills": {"$in": list(skills)}},
                            # Or match preferred skills with at least 2 matches
                            {
                                "$expr": {
                                    "$gte": [
                                        {"$size": {
                                            "$setIntersection": [
                                                "$preferred_skills",
                                                list(skills)
                                            ]
                                        }},
                                        2  # Require at least 2 preferred skills to match
                                    ]
                                }
                            }
                        ]}
                    ]
                }
            },
            # Add fields for scoring
            {
                "$addFields": {
                    # Count matching required skills
                    "matched_required_skills": {
                        "$size": {
                            "$setIntersection": [
                                {"$ifNull": ["$required_skills", []]},
                                list(skills)
                            ]
                        }
                    },
                    # Count matching preferred skills
                    "matched_preferred_skills": {
                        "$size": {
                            "$setIntersection": [
                                {"$ifNull": ["$preferred_skills", []]},
                                list(skills)
                            ]
                        }
                    },
                    # Check title match
                    "title_match": {
                        "$cond": [
                            {"$gt": [
                                {"$size": {
                                    "$filter": {
                                        "input": job_titles,
                                        "as": "title",
                                        "cond": {
                                            "$regexMatch": {
                                                "input": "$title",
                                                "regex": "$$title",
                                                "options": "i"
                                            }
                                        }
                                    }
                                }}, 0]
                            },
                            1,
                            0
                        ]
                    },
                    # Check level match
                    "level_match": {
                        "$cond": [
                            {
                                "$or": [
                                    {"$eq": ["$experience_level", level]},
                                    {"$not": ["$experience_level"]},
                                    {"$eq": ["$experience_level", ""]},
                                    {"$eq": ["$experience_level", None]}
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            },
            # Calculate scores
            {
                "$addFields": {
                    # Base score from required skills (50% weight)
                    "required_skills_score": {
                        "$multiply": [
                            {
                                "$cond": [
                                    {"$gt": [{"$size": {"$ifNull": ["$required_skills", []]}}, 0]},
                                    {"$divide": ["$matched_required_skills", {"$size": "$required_skills"}]},
                                    0
                                ]
                            },
                            0.5
                        ]
                    },
                    # Bonus for preferred skills (20% weight)
                    "preferred_skills_score": {
                        "$multiply": [
                            {
                                "$cond": [
                                    {"$gt": [{"$size": {"$ifNull": ["$preferred_skills", []]}}, 0]},
                                    {"$divide": ["$matched_preferred_skills", {"$size": "$preferred_skills"}]},
                                    0
                                ]
                            },
                            0.2
                        ]
                    },
                    # Title match bonus (20% weight)
                    "title_match_score": {"$multiply": ["$title_match", 0.2]},
                    # Level match bonus (10% weight)
                    "level_match_score": {"$multiply": ["$level_match", 0.1]}
                }
            },
            # Calculate total score (sum of all scores, max 1.0)
            {
                "$addFields": {
                    "match_score": {
                        "$min": [
                            {"$add": [
                                "$required_skills_score",
                                "$preferred_skills_score",
                                "$title_match_score",
                                "$level_match_score"
                            ]},
                            1.0  # Cap at 1.0
                        ]
                    },
                    # Calculate match percentage for display
                    "match_percentage": {
                        "$multiply": [
                            {"$min": [
                                {"$add": [
                                    "$required_skills_score",
                                    "$preferred_skills_score",
                                    "$title_match_score",
                                    "$level_match_score"
                                ]},
                                1.0
                            ]},
                            100
                        ]
                    }
                }
            },
            # Filter out jobs with no matching skills
            {
                "$match": {
                    "$or": [
                        {"matched_required_skills": {"$gt": 0}},
                        {"matched_preferred_skills": {"$gt": 0}}
                    ]
                }
            },
            # Sort by match score (descending)
            {"$sort": {"match_score": -1}},
            # Limit results
            {"$limit": limit},
            # Project final fields
            {
                "$project": {
                    "_id": 1,
                    "title": 1,
                    "company": {"$ifNull": ["$companyName", "$company"]},
                    "location": 1,
                    "experience_level": 1,
                    "required_skills": 1,
                    "preferred_skills": 1,
                    "match_score": 1,
                    "match_percentage": 1,
                    "matched_skills": {
                        "$setUnion": [
                            {"$setIntersection": ["$required_skills", list(skills)]},
                            {"$setIntersection": ["$preferred_skills", list(skills)]}
                        ]
                    },
                    "score_breakdown": {
                        "required_skills": {"$round": [{"$multiply": ["$required_skills_score", 100]}, 1]},
                        "preferred_skills": {"$round": [{"$multiply": ["$preferred_skills_score", 100]}, 1]},
                        "title_match": {"$round": [{"$multiply": ["$title_match_score", 100]}, 1]},
                        "level_match": {"$round": [{"$multiply": ["$level_match_score", 100]}, 1]}
                    }
                }
            }
        ]
        
        # Execute the pipeline
        logger.info("Executing MongoDB aggregation pipeline...")
        matching_jobs = list(jobs_collection.aggregate(pipeline))
        
        # Filter out jobs that don't have any matching skills
        filtered_jobs = []
        for job in matching_jobs:
            # Calculate skill matches
            req_skills_matched = len(set(job.get('required_skills', [])).intersection(skills))
            pref_skills_matched = len(set(job.get('preferred_skills', [])).intersection(skills))
            
            # Only include jobs with relevant matches
            if req_skills_matched > 0 or pref_skills_matched >= 2:
                filtered_jobs.append(job)
        
        logger.info(f"Found {len(filtered_jobs)} relevant jobs out of {len(matching_jobs)} initial matches")
        matching_jobs = filtered_jobs
        
        # return matching_jobs
        
        # Define weights for different matching criteria
        WEIGHTS = {
            'job_title': 1.5,           # Increased weight for job title match
            'company': 0.3,             # Reduced weight for company
            'experience_level': 0.4,    # Slightly increased weight for experience level
            'required_skills': 0.8,     # Increased weight for required skills
            'preferred_skills': 0.2,    # Preferred skills are a plus
            'industry': 0.1             # Industry match is a plus
        }
        
        # High threshold for job matching (85% match required)
        MIN_SCORE_THRESHOLD = 0.85
        
        # Minimum requirements for job matching
        MIN_REQUIRED_SKILLS_RATIO = 0.7   # At least 70% of required skills must match
        MIN_PREFERRED_SKILLS_RATIO = 0.4  # At least 40% of preferred skills should match
        
        # Minimum absolute number of required skills that must match
        MIN_REQUIRED_SKILLS_COUNT = 3
        
        # Minimum score for title and company to be considered a match
        MIN_TITLE_MATCH_SCORE = 0.7
        MIN_COMPANY_MATCH_SCORE = 0.5
        
        # Minimum number of skills that must match (absolute count)
        MIN_SKILLS_MATCH_COUNT = 3
        
        def extract_company_name(job_title: str) -> str:
            """Extract company name from job title using multiple patterns."""
            # Common patterns for company names in job titles
            patterns = [
                r'at\s+([A-Z][A-Za-z0-9&.\-\s]+)(?:\s+\(|(?:\s+at\s|$))',
                r'@\s*([A-Z][A-Za-z0-9&.\-\s]+)(?:\s*\||$|\s+at\s)',
                r'\b(?:at|@)\s+([A-Z][A-Za-z0-9&.\-\s]+)(?:\s*\||$|\s+at\s)',
                r'\b(?:for|from|by|at)\s+([A-Z][A-Za-z0-9&.\-\s]+)(?:\s*\||$|\s+for\s|\s+at\s)'
            ]
            
            # Try patterns in order
            for pattern in patterns:
                match = re.search(pattern, job_title, re.IGNORECASE)
                if match:
                    company = match.group(1).strip()
                    # Clean up common suffixes
                    company = re.sub(r'\s*(?:LLC|Inc|Ltd|Corp|Pte\.?|Lt\.?|Co\.?|GmbH)\b', '', company, flags=re.IGNORECASE)
                    return company.strip()
            
            # If no pattern matched, try to extract company-like words
            words = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', job_title)
            if len(words) > 1:
                # Return the last word that looks like a company name
                for word in reversed(words):
                    if len(word) > 2 and word.lower() not in ['for', 'and', 'the', 'with', 'using']:
                        return word
            
            return ""
        
        # Extract and process data from resume
        skills = set(skill['name'].lower().strip() for skill in resume_data.get('technical_skills', []))
        level = resume_data.get('level', '').lower()
        industries = set(industry.lower() for industry in resume_data.get('industries', []))
        job_titles = set(title.lower() for title in resume_data.get('job_titles', []))
        
        # Extract company names from job titles
        companies = set()
        for title in job_titles:
            company = extract_company_name(title)
            if company:
                companies.add(company.lower())
        
        # If no companies found in titles, try to extract from work experience
        if not companies and 'work_experience' in resume_data:
            for exp in resume_data['work_experience']:
                if 'company' in exp:
                    companies.add(exp['company'].lower())
        
        logger.info(f"Extracted companies from resume: {companies}")
        logger.info(f"Job titles from resume: {job_titles}")
        logger.info(f"Experience level: {level}")
        logger.info(f"Skills: {list(skills)[:5]}... (total: {len(skills)})")
        
        if not skills and not job_titles and not industries:
            logger.warning("No relevant data found in resume for job matching")
            return []
        
        # Connect to MongoDB
        mongo_uri = os.getenv("MONGO_ATLAS_URI")
        if not mongo_uri:
            raise ValueError("MONGO_ATLAS_URI not found in environment variables")
            
        client = MongoClient(mongo_uri)
        db = client["CVProject"]
        jobs_collection = db["jobs"]
        
        # First, get all jobs that match the title or required skills
        pipeline = [
            # First phase: Find potential matches based on title or required skills
            {
                "$match": {
                    "$or": [
                        # Match job title exactly or partially (higher priority)
                        {
                            "$or": [
                                {"title": {"$in": list(job_titles)}},
                                {"title": {"$regex": "|\\.".join(re.escape(t) for t in job_titles), "$options": "i"}}
                            ]
                        },
                        # Or match required skills (lower priority)
                        {
                            "required_skills": {
                                "$in": list(skills)
                            }
                        }
                    ]
                }
            },
            # Add fields for title and company matching scores
            {
                "$addFields": {
                    # Calculate title match score (0-1)
                    "title_match_score": {
                        "$max": [
                            {
                                "$cond": [
                                    {"$in": [{"$toLower": "$title"}, [t.lower() for t in job_titles]]},
                                    1.0,
                                    0.0
                                ]
                            },
                            {
                                "$max": [
                                    {
                                        "$reduce": {
                                            "input": job_titles,
                                            "initialValue": 0.0,
                                            "in": {
                                                "$max": [
                                                    "$$value",
                                                    {
                                                        "$cond": [
                                                            {"$regexMatch": {
                                                                "input": "$title",
                                                                "regex": f"{re.escape('$$this')}",
                                                                "options": "i"
                                                            }},
                                                            0.8,  # Partial match score
                                                            0.0
                                                        ]
                                                    }
                                                ]
                                            }
                                        }
                                    },
                                    0.0
                                ]
                            }
                        ]
                    },
                    # Calculate company match score (0-1)
                    "company_match_score": {
                        "$max": [
                            {
                                "$cond": [
                                    {
                                        "$or": [
                                            {"$in": [{"$toLower": "$company"}, [c.lower() for c in companies]]},
                                            {"$in": [{"$toLower": "$companyName"}, [c.lower() for c in companies]]}
                                        ]
                                    },
                                    1.0,
                                    0.0
                                ]
                            },
                            {
                                "$max": [
                                    {
                                        "$reduce": {
                                            "input": companies,
                                            "initialValue": 0.0,
                                            "in": {
                                                "$max": [
                                                    "$$value",
                                                    {
                                                        "$cond": [
                                                            {
                                                                "$or": [
                                                                    {"$regexMatch": {
                                                                        "input": "$company",
                                                                        "regex": f"{re.escape('$$this')}",
                                                                        "options": "i"
                                                                    }},
                                                                    {"$regexMatch": {
                                                                        "input": "$companyName",
                                                                        "regex": f"{re.escape('$$this')}",
                                                                        "options": "i"
                                                                    }}
                                                                ]
                                                            },
                                                            0.8,  # Partial match score
                                                            0.0
                                                        ]
                                                    }
                                                ]
                                            }
                                        }
                                    },
                                    0.0
                                ]
                            }
                        ]
                    }
                }
            },
            # Second phase: Filter by skills and experience level
            {
                "$match": {
                    "$and": [
                        # Must have at least one strong match (title or skills)
                        {
                            "$or": [
                                # Either have a strong title match
                                {"title_match_score": {"$gte": MIN_TITLE_MATCH_SCORE}},
                                # Or have enough matching skills
                                {
                                    "$expr": {
                                        "$gte": [
                                            {
                                                "$size": {
                                                    "$setIntersection": [
                                                        {"$ifNull": ["$required_skills", []]},
                                                        list(skills)
                                                    ]
                                                }
                                            },
                                            MIN_SKILLS_MATCH_COUNT
                                        ]
                                    }
                                }
                            ]
                        },
                        # Must match experience level (if specified in resume)
                        {"$or": [
                            {"experience_level": level},
                            {"experience_level": {"$exists": False}},
                            {"experience_level": ""},
                            {"$expr": {"$eq": ["$experience_level", None]}}
                        ]},
                        # Must have at least some required skills match
                        {
                            "$expr": {
                                "$gte": [
                                    {"$size": {"$setIntersection": ["$required_skills", list(skills)]}},
                                    MIN_REQUIRED_SKILLS_COUNT
                                ]
                            }
                        }
                    ]
                }
            },
            # Calculate match scores
            {
                "$addFields": {
                    # Calculate skill match scores
                    "required_skills_match": {
                        "$size": {
                            "$setIntersection": [
                                {"$ifNull": ["$required_skills", []]},
                                list(skills)
                            ]
                        }
                    },
                    "preferred_skills_match": {
                        "$size": {
                            "$setIntersection": [
                                {"$ifNull": ["$preferred_skills", []]},
                                list(skills)
                            ]
                        }
                    },
                    # Check level match
                    "level_match": {
                        "$cond": [
                            {
                                "$or": [
                                    {"$eq": ["$experience_level", level]},
                                    {"$not": ["$experience_level"]}  # If job doesn't specify level, consider it a match
                                ]
                            },
                            1,
                            0
                        ]
                    },
                    # Check industry match
                    "industry_match": {
                        "$cond": [
                            {
                                "$gt": [
                                    {
                                        "$size": {
                                            "$setIntersection": [
                                                {"$ifNull": ["$industries", []]},
                                                list(industries)
                                            ]
                                        }
                                    },
                                    0
                                ]
                            },
                            1,
                            0
                        ]
                    },
                    # Check job title match
                    "title_match": {
                        "$cond": [
                            {
                                "$gt": [
                                    {
                                        "$size": {
                                            "$filter": {
                                                "input": list(job_titles),
                                                "as": "title",
                                                "cond": {
                                                    "$regexMatch": {
                                                        "input": "$title",
                                                        "regex": "$$title",
                                                        "options": "i"
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    0
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            },
            # Calculate skill match ratios
            {
                "$addFields": {
                    # Calculate required skills ratio (0-1)
                    "required_skills_ratio": {
                        "$cond": [
                            {"$gt": [{"$size": {"$ifNull": ["$required_skills", []]}}, 0]},
                            {"$divide": ["$required_skills_match", {"$size": "$required_skills"}]},
                            0
                        ]
                    },
                    # Calculate preferred skills ratio (0-1)
                    "preferred_skills_ratio": {
                        "$cond": [
                            {"$gt": [{"$size": {"$ifNull": ["$preferred_skills", []]}}, 0]},
                            {"$divide": ["$preferred_skills_match", {"$size": "$preferred_skills"}]},
                            0
                        ]
                    },
                    # Industry match (1 if any industry matches, 0 otherwise)
                    "industry_match": {
                        "$cond": [
                            {
                                "$gt": [
                                    {"$size": {
                                        "$setIntersection": [
                                            {"$ifNull": ["$industries", []]},
                                            list(industries)
                                        ]
                                    }},
                                    0
                                ]
                            },
                            1.0,
                            0.0
                        ]
                    }
                }
            },
            # Calculate final weighted score with job title and company having highest priority
            {
                "$addFields": {
                    "match_score": {
                        "$add": [
                            # Job title match has highest weight
                            {"$multiply": ["$title_match_score", WEIGHTS['job_title']]},
                            # Company match is also very important
                            {"$multiply": ["$company_match_score", WEIGHTS['company']]},
                            # Experience level is important
                            {"$multiply": ["$level_match", WEIGHTS['experience_level']]},
                            # Required skills are still important but slightly less than title/company
                            {"$multiply": ["$required_skills_ratio", WEIGHTS['required_skills']]},
                            # Preferred skills and industry are nice-to-haves
                            {"$multiply": ["$preferred_skills_ratio", WEIGHTS['preferred_skills']]},
                            {"$multiply": ["$industry_match", WEIGHTS['industry']]}
                        ]
                    },
                    # Add detailed scoring information for debugging
                    "scoring_details": {
                        "title_score": {"$multiply": ["$title_match_score", WEIGHTS['job_title']]},
                        "company_score": {"$multiply": ["$company_match_score", WEIGHTS['company']]},
                        "level_score": {"$multiply": ["$level_match", WEIGHTS['experience_level']]},
                        "required_skills_score": {"$multiply": ["$required_skills_ratio", WEIGHTS['required_skills']]},
                        "preferred_skills_score": {"$multiply": ["$preferred_skills_ratio", WEIGHTS['preferred_skills']]},
                        "industry_score": {"$multiply": ["$industry_match", WEIGHTS['industry']]}
                    }
                }
            },
            # Add match percentage and detailed scoring info
            {
                "$addFields": {
                    "match_percentage": {
                        "$multiply": ["$match_score", 100]
                    },
                    "score_breakdown": {
                        "job_title": {"$multiply": ["$title_match_score", WEIGHTS['job_title']]},
                        "company": {"$multiply": ["$company_match_score", WEIGHTS['company']]},
                        "experience_level": {"$multiply": ["$level_match", WEIGHTS['experience_level']]},
                        "required_skills": {"$multiply": ["$required_skills_ratio", WEIGHTS['required_skills']]},
                        "preferred_skills": {"$multiply": ["$preferred_skills_ratio", WEIGHTS['preferred_skills']]},
                        "industry": {"$multiply": ["$industry_match", WEIGHTS['industry']]}
                    }
                }
            },
            # Filter out jobs that don't meet minimum criteria
            {
                "$match": {
                    "$expr": {
                        "$and": [
                            # Must meet minimum score threshold (90%+)
                            {"$gte": ["$match_score", MIN_SCORE_THRESHOLD]},
                            # Must have enough matching skills
                            {
                                "$expr": {
                                    "$gte": [
                                        {"$size": {"$setIntersection": ["$required_skills", list(skills)]}},
                                        MIN_REQUIRED_SKILLS_COUNT
                                    ]
                                }
                            },
                            # Must have either strong title match OR strong skills match
                            {
                                "$or": [
                                    # Strong title match with some skills
                                    {
                                        "$and": [
                                            {"$gte": ["$title_match_score", MIN_TITLE_MATCH_SCORE]},
                                            {"$gte": ["$required_skills_ratio", 0.5]}  # At least 50% skills match
                                        ]
                                    },
                                    # OR very strong skills match
                                    {
                                        "$and": [
                                            {"$gte": ["$required_skills_ratio", 0.8]},  # 80%+ skills match
                                            {"$gte": ["$level_match", 0.7]}  # And good level match
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                }
            },
            # Sort by match score and other important factors
            {"$sort": {
                "match_score": -1,                  # Highest match score first
                "title_match_score": -1,             # Then by job title match strength
                "company_match_score": -1,           # Then by company match
                "level_match": -1,                   # Then by experience level match
                "required_skills_ratio": -1,         # Then by ratio of required skills matched
                "preferred_skills_ratio": -1,        # Then by preferred skills
                "industry_match": -1                 # Finally by industry match
            }},
            # Limit results
            {"$limit": limit},
            # Project final fields
            {
                "$project": {
                    "_id": 1,
                    "title": 1,
                    "companyName": 1,
                    "company": 1,  # Some jobs might use different field names
                    "location": 1,
                    "experience_level": 1,
                    "required_skills": 1,
                    "preferred_skills": 1,
                    "industries": 1,
                    "title_match_score": 1,
                    "company_match_score": 1,
                    "required_skills_ratio": 1,
                    "scoring_details": 1,
                    "applyLink": 1,
                    "job_link": 1,
                    "match_score": 1,
                    "match_percentage": 1,
                    "score_breakdown": 1,
                    "title_match_score": 1,
                    "company_match_score": 1,
                    "required_skills_ratio": 1,
                    "preferred_skills_ratio": 1,
                    "required_skills_match": 1,
                    "preferred_skills_match": 1,
                    "level_match": 1,
                    "industry_match": 1
                }
            }
        ]
        
        # Execute the aggregation
        jobs = list(jobs_collection.aggregate(pipeline))
        
        # Calculate max possible score for normalization
        max_possible_score = (
            WEIGHTS['required_skills'] * len(skills) +
            WEIGHTS['preferred_skills'] * len(skills) +
            WEIGHTS['experience_level'] * 1 +
            WEIGHTS['industry'] * 1 +
            WEIGHTS['job_title'] * 1
        )
        
        # Format the results with detailed matching information
        results = []
        for job in jobs:
            # Calculate match percentage with a boost factor
            raw_score = job.get("match_score", 0)
            # Add a boost factor to increase the percentage
            boost_factor = 1.2  # 20% boost to the final score
            normalized_score = (raw_score / max_possible_score) if max_possible_score > 0 else 0
            # Apply a square root to the normalized score to make it more forgiving
            # This will give higher percentages for partial matches
            adjusted_score = (normalized_score ** 0.9) * boost_factor
            # Ensure we don't exceed 100%
            match_percentage = min(100, int(adjusted_score * 100))
            
            # Get matched skills
            required_skills_matched = set(skill.lower() for skill in job.get('required_skills', []) if skill.lower() in skills)
            preferred_skills_matched = set(skill.lower() for skill in job.get('preferred_skills', []) if skill.lower() in skills)
            all_matched_skills = list(required_skills_matched.union(preferred_skills_matched))
            
            # Get match details
            level_matched = job.get("level_match", 0) == 1
            industry_matched = job.get("industry_match", 0) == 1
            title_matched = job.get("title_match", 0) == 1
            
            # Calculate score breakdown
            score_breakdown = {
                "required_skills": {
                    "score": len(required_skills_matched) * WEIGHTS['required_skills'],
                    "matched": list(required_skills_matched),
                    "total": len(job.get('required_skills', [])),
                    "weight": WEIGHTS['required_skills']
                },
                "preferred_skills": {
                    "score": len(preferred_skills_matched) * WEIGHTS['preferred_skills'],
                    "matched": list(preferred_skills_matched),
                    "total": len(job.get('preferred_skills', [])),
                    "weight": WEIGHTS['preferred_skills']
                },
                "level": {
                    "score": WEIGHTS['experience_level'] if level_matched else 0,
                    "matched": level_matched,
                    "job_level": job.get("experience_level", "Not specified"),
                    "resume_level": level,
                    "weight": WEIGHTS['experience_level']
                },
                "industry": {
                    "score": WEIGHTS['industry'] if industry_matched else 0,
                    "matched": industry_matched,
                    "job_industries": job.get("industries", []),
                    "resume_industries": list(industries),
                    "weight": WEIGHTS['industry']
                },
                "job_title": {
                    "score": WEIGHTS['job_title'] if title_matched else 0,
                    "matched": title_matched,
                    "job_title": job.get("title", ""),
                    "resume_titles": list(job_titles),
                    "weight": WEIGHTS['job_title']
                }
            }
            
            # Prepare the result entry
            result = {
                "id": str(job.get("_id", "")),
                "title": job.get("title", ""),
                "company": job.get("companyName", job.get("company", "")),
                "location": job.get("location", ""),
                "experience_level": job.get("experience_level", "Not specified"),
                "industries": job.get("industries", []),
                "required_skills": job.get("required_skills", []),
                "preferred_skills": job.get("preferred_skills", []),
                "matched_skills": all_matched_skills,
                "match_percentage": match_percentage,
                "match_details": score_breakdown,
                "job_link": job.get("applyLink", job.get("job_link", ""))
            }
            
            results.append(result)
            
            # Log detailed matching information for debugging
            logger.info(f"Job match - Title: {result['title']}, Company: {result['company']}")
            logger.info(f"  Match Score: {match_percentage}%")
            logger.info(f"  Matched Skills: {len(all_matched_skills)}/{len(required_skills_matched) + len(preferred_skills_matched)}")
            logger.info(f"  Level Matched: {level_matched} (Job: {result['experience_level']}, Resume: {level})")
            logger.info(f"  Industry Matched: {industry_matched}")
            logger.info(f"  Title Matched: {title_matched}")
            
        return results
        
    except Exception as e:
        logger.error(f"Error querying jobs: {str(e)}")
        return []

def extract_skills_from_text(text: str) -> list:
    """
    Extract skills from text using simple keyword matching.
    This is a basic implementation - you might want to enhance it with NLP for better accuracy.
    """
    # Common technical skills (you can expand this list)
    tech_skills = [
        # Programming Languages
        'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin',
        'go', 'rust', 'scala', 'r', 'matlab', 'html', 'css', 'sass', 'less', 'dart',
        
        # Frameworks & Libraries
        'django', 'flask', 'fastapi', 'spring', 'react', 'angular', 'vue', 'node.js', 'express', 'next.js',
        'nuxt.js', 'laravel', 'ruby on rails', 'asp.net', '.net core', 'tensorflow', 'pytorch', 'keras',
        'pandas', 'numpy', 'scikit-learn', 'opencv', 'd3.js', 'three.js', 'jquery', 'bootstrap', 'tailwind css',
        
        # Databases
        'mysql', 'postgresql', 'mongodb', 'redis', 'oracle', 'sql server', 'sqlite', 'cassandra', 'dynamodb',
        'firebase', 'elasticsearch', 'mariadb', 'neo4j', 'couchbase', 'couchdb',
        
        # DevOps & Cloud
        'docker', 'kubernetes', 'aws', 'amazon web services', 'azure', 'google cloud', 'gcp', 'terraform',
        'ansible', 'jenkins', 'github actions', 'gitlab ci/cd', 'circleci', 'travis ci', 'prometheus', 'grafana',
        'istio', 'linkerd', 'helm', 'argo cd', 'vault', 'consul', 'nomad',
        
        # Other
        'git', 'rest api', 'graphql', 'grpc', 'microservices', 'serverless', 'ci/cd', 'tdd', 'bdd', 'agile',
        'scrum', 'kanban', 'devops', 'machine learning', 'deep learning', 'data science', 'big data', 'blockchain',
        'computer vision', 'nlp', 'natural language processing', 'artificial intelligence', 'ai', 'iot', 'cybersecurity'
    ]
    
    # Convert to lowercase for case-insensitive matching
    text_lower = text.lower()
    
    # Find all skills that appear in the text
    found_skills = [skill for skill in tech_skills if skill.lower() in text_lower]
    
    # Also look for skills with spaces or special characters
    additional_skills = re.findall(r'\b(?:[A-Za-z]+[+.#]?\s*)+\b', text)
    found_skills.extend(skill.strip().lower() for skill in additional_skills if len(skill.strip()) > 2)
    
    # Remove duplicates and return
    return list(set(found_skills))

def extract_job_titles_from_resume(resume_text: str) -> list:
    """
    Extract job titles from resume text using simple pattern matching.
    This is a basic implementation - you might want to enhance it with NLP for better accuracy.
    """
    import re
    
    # Common job title patterns
    patterns = [
        r'(?:^|\n|\b)(?:Senior|Junior|Lead|Staff|Principal)?\s*([A-Z][A-Za-z\s&/]+(?:Engineer|Developer|Programmer|Designer|Analyst|Architect|Manager|Specialist|Consultant|Tester|QA|DevOps|SRE|Data Scientist|ML Engineer|AI Engineer))s?\b',
        r'(?:^|\n|\b)([A-Z][A-Za-z\s&/]+(?:Engineer|Developer|Programmer|Designer|Analyst|Architect|Manager|Specialist|Consultant|Tester|QA|DevOps|SRE|Data Scientist|ML Engineer|AI Engineer))s?\b',
        r'(?:^|\n|\b)(?:Position|Role|Title)[:\s]+([A-Z][A-Za-z\s&/]+(?:Engineer|Developer|Programmer|Designer|Analyst|Architect|Manager|Specialist|Consultant|Tester|QA|DevOps|SRE|Data Scientist|ML Engineer|AI Engineer))s?\b',
    ]
    
    titles = set()
    for pattern in patterns:
        matches = re.finditer(pattern, resume_text, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            title = match.group(1).strip()
            # Skip very short or generic titles
            if len(title) > 3 and title.lower() not in ['it', 'dev', 'devops', 'qa']:
                titles.add(title)
    
    # Also look for job titles in work experience section
    work_exp_section = re.search(r'(?i)(work\s+experience|experience|employment\s+history)[^\n]*(\n\s*[-*]\s*.*)*', resume_text)
    if work_exp_section:
        exp_text = work_exp_section.group(0)
        # Look for job titles at the start of each line in the experience section
        title_matches = re.finditer(r'(?i)^\s*[-*]?\s*([A-Z][A-Za-z\s&/]+(?:Engineer|Developer|Programmer|Designer|Analyst|Architect|Manager|Specialist|Consultant|Tester|QA|DevOps|SRE|Data Scientist|ML Engineer|AI Engineer))s?', 
                                   exp_text, re.MULTILINE)
        for match in title_matches:
            title = match.group(1).strip()
            if len(title) > 3 and title.lower() not in ['it', 'dev', 'devops', 'qa']:
                titles.add(title)
    
    return list(titles)

def suggest_jobs(resume_text: str, model_name: str = "gpt2", limit: int = 10) -> dict:
    """
    Main function to suggest jobs based on resume content.
    
    Args:
        resume_text: Text content of the resume
        model_name: Name of the model to use for extraction
        limit: Maximum number of jobs to return
        
    Returns:
        dict: Contains extracted resume data and matching jobs
    """
    try:
        logger.info("Starting job suggestion process...")
        
        # Extract skills and experience from resume
        resume_data = extract_skills_and_experience(resume_text, model_name)
        logger.info(f"Extracted resume data: {json.dumps(resume_data, indent=2, ensure_ascii=False)}")
        
        # Get matching jobs
        matching_jobs = get_matching_jobs(resume_data, limit)
        
        # Format the response
        result = {
            "matching_jobs": [],
            "total_matches": len(matching_jobs)
        }
        
        # Add job details to the response
        for job in matching_jobs:
            result["matching_jobs"].append({
                "id": str(job.get("_id")),
                "title": job.get("title", "No Title"),
                "company": job.get("company", "Company Not Specified"),
                "match_percentage": job.get("match_percentage", 0),
                "matched_skills": job.get("matched_skills", []),
                "score_breakdown": job.get("score_breakdown", {})
            })
        
        logger.info(f"Job suggestion completed. Found {len(matching_jobs)} matches.")
        return result
        
    except Exception as e:
        error_msg = f"Error in suggest_jobs: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {
            "error": "An error occurred while processing your request",
            "details": str(e),
            "matching_jobs": [],
            "total_matches": 0
        }