from django.db import connection
import json
import requests


def get_user_details_data(user_id_int):
    """
    Helper function to get user details data.
    Returns the user details dictionary or None if user doesn't exist.
    """
    with connection.cursor() as cursor:
        # First, check if user exists
        cursor.execute("SELECT id FROM users WHERE id = %s", [user_id_int])
        user_row = cursor.fetchone()
        
        if not user_row:
            return None

        # Execute the comprehensive SQL query
        sql_query = """
            WITH user_profile AS (
                SELECT 
                    u.id AS user_id,
                    u.username,
                    u.email,
                    p.id AS profile_id,
                    p.name,
                    p.designation,
                    p.bio,
                    p.city,
                    p.province,
                    p.country,
                    p.phone_number,
                    p.secondary_email,
                    p.introduction,
                    p.override_email,
                    p.website_url,
                    p.personal_website_url,
                    -- Projects Board URL (only if share_profile is true)
                    CASE 
                        WHEN p.share_profile = TRUE AND p.public_url IS NOT NULL THEN p.public_url 
                        ELSE NULL 
                    END AS projects_board_url,
                    -- Profile Photo
                    (
                        SELECT a.filename
                        FROM assets a
                        JOIN asset_types at ON a.asset_type_id = at.id
                        WHERE a.assetable_id = p.id
                          AND a.assetable_type = 'App\\Models\\Profile'
                          AND a.display_name = 'Profile Photo'
                          AND at.key = 'images'
                          AND a.deleted_at IS NULL
                        LIMIT 1
                    ) AS profile_photo_url,
                    -- Profile Links
                    (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'title', l.name,
                                'url', l.url,
                                'type', lt.key
                            )
                        ), '[]'::jsonb)
                        FROM links l
                        JOIN link_types lt ON l.link_type_id = lt.id
                        WHERE l.linkable_id = p.id
                          AND l.linkable_type = 'App\\Models\\Profile'
                          AND l.deleted_at IS NULL
                    ) AS links
                FROM users u
                LEFT JOIN profiles p ON p.user_id = u.id
                WHERE u.id = %s
            )

            SELECT jsonb_build_object(
                'userProfile', (SELECT row_to_json(up) FROM user_profile up),

                'projects', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', pr.id,
                            'key', pr.key,
                            'name', pr.name,
                            'description', pr.description,
                            'start_date', pr.start_date,
                            'end_date', pr.end_date,
                            'sorting_order', pr.sorting_order,
                            'created_at', pr.created_at,
                            'updated_at', pr.updated_at,
                            'category', c.name,
                            'status', s.key,
                            -- Project Settings
                            'settings', (
                                SELECT row_to_json(ps)
                                FROM project_settings ps
                                WHERE ps.project_id = pr.id
                                  AND ps.user_id = %s
                            ),
                            -- Project Links
                            'links', (
                                SELECT COALESCE(jsonb_agg(
                                    jsonb_build_object(
                                        'title', l.name,
                                        'url', l.url,
                                        'type', lt.key
                                    )
                                ), '[]'::jsonb)
                                FROM links l
                                JOIN link_types lt ON l.link_type_id = lt.id
                                WHERE l.linkable_id = pr.id
                                  AND l.linkable_type = 'App\\Models\\Project'
                                  AND l.deleted_at IS NULL
                            ),
                            -- Project Tags (Technologies only)
                            'technologies', (
                                SELECT COALESCE(
                                    to_jsonb(array_agg(DISTINCT value)), '[]'::jsonb
                                )
                                FROM tags t,
                                     LATERAL jsonb_array_elements_text(t.name::jsonb) AS value
                                WHERE t.project_id = pr.id
                                  AND t.type = 'technology'
                                  AND t.user_id = %s
                            )
                        )
                        ORDER BY pr.sorting_order ASC, pr.created_at DESC
                    ), '[]'::jsonb)
                    FROM projects pr
                    LEFT JOIN categories c ON pr.category_id = c.id
                    LEFT JOIN status s ON pr.status_id = s.id
                    WHERE pr.user_id = %s
                      AND pr.is_public = TRUE
                      AND pr.deleted_at IS NULL
                ),

                'certifications', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', c.id,
                            'name', c.name,
                            'description', c.description,
                            'start_date', c.start_date,
                            'end_date', c.end_date,
                            'institute_name', c.institute_name
                        )
                    ), '[]'::jsonb)
                    FROM certifications c
                    JOIN profiles p ON c.profile_id = p.id
                    WHERE p.user_id = %s
                      AND c.deleted_at IS NULL
                ),

                'achievements', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', a.id,
                            'description', a.description
                        )
                    ), '[]'::jsonb)
                    FROM achievements a
                    JOIN profiles p ON a.profile_id = p.id
                    WHERE p.user_id = %s
                      AND a.deleted_at IS NULL
                ),

                'experiences', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', e.id,
                            'company_name', e.company_name,
                            'role', e.role,
                            'start_date', e.start_date,
                            'end_date', e.end_date,
                            'description', e.description,
                            'skills', e.skills,
                            'location', e.location
                        )
                    ), '[]'::jsonb)
                    FROM experiences e
                    JOIN profiles p ON e.profile_id = p.id
                    WHERE p.user_id = %s
                      AND e.deleted_at IS NULL
                ),

                'publications', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', pub.id,
                            'paper_name', pub.paper_name,
                            'conference_name', pub.conference_name,
                            'description', pub.description,
                            'published_date', pub.published_date,
                            'paper_link', pub.paper_link
                        )
                    ), '[]'::jsonb)
                    FROM publications pub
                    JOIN profiles p ON pub.profile_id = p.id
                    WHERE p.user_id = %s
                      AND pub.deleted_at IS NULL
                ),

                'skills', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', s.id,
                            'name', s.name,
                            'category_id', s.category_id,
                            'category', jsonb_build_object(
                                'id', c.id,
                                'name', c.name,
                                'user_id', c.user_id
                            ),
                            'proficiency_level', s.proficiency_level,
                            'description', s.description
                        )
                    ), '[]'::jsonb)
                    FROM skills s
                    JOIN profiles p ON s.profile_id = p.id
                    LEFT JOIN skill_categories c ON s.category_id = c.id
                    WHERE p.user_id = %s
                ),

                'education', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', e.id,
                            'university_name', e.university_name,
                            'degree', e.degree,
                            'from_date', e.from_date,
                            'end_date', e.end_date,
                            'location', e.location,
                            'cgpa', e.cgpa
                        )
                    ), '[]'::jsonb)
                    FROM education e
                    JOIN profiles p ON e.profile_id = p.id
                    WHERE p.user_id = %s
                      AND e.deleted_at IS NULL
                ),

                'categories', (
                    SELECT COALESCE(jsonb_agg(row_to_json(cats)), '[]'::jsonb)
                    FROM (
                        SELECT id, name, key
                        FROM categories
                        WHERE user_id = %s OR user_id IS NULL
                    ) cats
                ),

                'technologies', (
                    SELECT COALESCE(
                        to_jsonb(array_agg(DISTINCT value)), '[]'::jsonb
                    )
                    FROM tags t,
                         LATERAL jsonb_array_elements_text(t.name::jsonb) AS value
                    WHERE t.type = 'technology'
                      AND t.user_id = %s
                      AND t.project_id IS NOT NULL
                )
            ) AS result;
        """

        # Execute query with user_id parameter (used 12 times in the query)
        cursor.execute(sql_query, [user_id_int] * 12)
        
        row = cursor.fetchone()
        
        if not row or not row[0]:
            return None

        # Parse the JSONB result
        result_data = row[0]
        
        # If result_data is a string, parse it as JSON
        if isinstance(result_data, str):
            result_data = json.loads(result_data)
        
        return result_data


def prepare_resume_sections(user_details, prompt, job_description):
    """
    Prepare user details into sections for sequential processing.
    Returns a list of sections with their prompts.
    """
    sections = []
    
    # Section 1: Profile/Header
    profile_data = {
        'userProfile': user_details.get('userProfile', {})
    }
    sections.append({
        'section': 'profile',
        'title': 'Profile & Contact Information',
        'data': profile_data,
        'prompt': f"""IMPORTANT: Use ONLY the user's actual data provided below. Do NOT create or invent any information.

Job Description:
{job_description}

User Profile Information (USE ONLY THIS DATA):
{json.dumps(profile_data, indent=2)}

Task: Create the header section of the resume using ONLY the user's actual profile information above.

CONTACT INFORMATION (DO NOT CHANGE - USE EXACTLY AS PROVIDED):
- Use the EXACT name, designation, address, email, phone number, and links from the user profile
- Do NOT modify, reword, or change any contact information
- Include all links exactly as provided in the user data

PROFESSIONAL SUMMARY (ONLY PART TO MODIFY):
- Combine the user's bio and introduction into a short professional summary
- Maximum 3 lines only
- Reword the combined bio/introduction to align with the job description's requirements and terminology
- Use keywords and language from the job description while maintaining the user's actual background
- Keep it concise and impactful (max 3 lines)
- Do NOT add any information that is not in the provided user data"""
    })
    
    # Section 2: Experiences
    if user_details.get('experiences'):
        sections.append({
            'section': 'experiences',
            'title': 'Work Experience',
            'data': {'experiences': user_details.get('experiences', [])},
            'prompt': f"""IMPORTANT: Use ONLY the user's actual work experiences provided below. Do NOT create or invent any experiences.

Job Description:
{job_description}

User's Actual Work Experiences (USE ONLY THESE):
{json.dumps(user_details.get('experiences', []), indent=2)}

Task: Create the work experience section using ONLY the user's actual experiences above.

PRIMARY FOCUS: Change keywords, technologies, and wordings to match the job description while keeping the same structure and size.

REQUIREMENTS:
- Keep the SAME number of experiences as in the user data (include all experiences)
- Keep the SAME structure, format, and length for each experience entry
- Keep the EXACT company names, roles, dates, and locations unchanged
- ONLY modify: 
  * Technologies mentioned - replace with job description terminology where applicable
  * Keywords and wordings in descriptions - align with job description language
  * Skills mentioned - use job description terminology
- Maintain the same level of detail and number of bullet points as the original
- Do NOT add or remove experiences
- Do NOT change the structure or format
- Do NOT create, modify, or invent any work experiences"""
        })
    
    # Section 3: Projects
    if user_details.get('projects'):
        sections.append({
            'section': 'projects',
            'title': 'Projects',
            'data': {'projects': user_details.get('projects', [])},
            'prompt': f"""CRITICAL: Use ONLY the user's actual projects provided below. Do NOT create, invent, or generate any new projects.

Job Description:
{job_description}

User's Actual Projects (USE ONLY THESE - DO NOT CREATE NEW ONES):
{json.dumps(user_details.get('projects', []), indent=2)}

Task: Create the projects section using ONLY the user's actual projects listed above.

PRIMARY FOCUS: Change keywords, technologies, and wordings to match the job description while keeping the same structure and size.

REQUIREMENTS:
- Keep the SAME number of projects as in the user data (include all projects)
- Keep the SAME structure, format, and length for each project entry
- Keep the EXACT project names, dates, categories, and links unchanged
- ONLY modify:
  * Technologies mentioned - replace with job description terminology where applicable
  * Keywords and wordings in descriptions - align with job description language
  * Project descriptions - use job description terminology while maintaining actual project details
- Maintain the same level of detail and number of bullet points as the original
- Use what the user data has stored - just change words, tech, and keywords to match job description
- Do NOT add or remove projects
- Do NOT change the structure or format
- DO NOT create, invent, or generate any projects that are not in the user's actual project list above"""
        })
    
    # Section 4: Skills
    if user_details.get('skills') or user_details.get('technologies'):
        skills_data = {
            'skills': user_details.get('skills', []),
            'technologies': user_details.get('technologies', [])
        }
        sections.append({
            'section': 'skills',
            'title': 'Skills & Technologies',
            'data': skills_data,
            'prompt': f"""IMPORTANT: Keep user's skills the same, but can add important missing skills from job description.

Job Description:
{job_description}

User's Actual Skills and Technologies (INCLUDE ALL OF THESE):
{json.dumps(skills_data, indent=2)}

Task: Create the skills section using the user's actual skills and technologies above.

REQUIREMENTS:
- Include ALL of the user's actual skills and technologies (keep them the same)
- Prioritize and list first the skills/technologies that match the job description requirements
- Group skills by category (e.g., Programming Languages, Frameworks, Tools) if applicable
- Use the exact terminology from the job description for matching skills
- ONLY if there are important skills/technologies mentioned in the job description that the user doesn't have, you may add them (but only if they are critical/important for the role)
- Do NOT remove any of the user's existing skills"""
        })
    
    # Section 5: Education
    if user_details.get('education'):
        sections.append({
            'section': 'education',
            'title': 'Education',
            'data': {'education': user_details.get('education', [])},
            'prompt': f"""IMPORTANT: Do NOT change education - keep it exactly the same.

User's Actual Education (USE EXACTLY AS PROVIDED):
{json.dumps(user_details.get('education', []), indent=2)}

Task: Output the education section EXACTLY as provided in the user data above.
- Use the EXACT university names, degrees, dates, locations, and CGPA from the user's data
- Do NOT modify, reword, or change anything
- Maintain the same format and structure
- Keep it exactly as provided in the user data"""
        })
    
    # Section 6: Certifications
    if user_details.get('certifications'):
        sections.append({
            'section': 'certifications',
            'title': 'Certifications',
            'data': {'certifications': user_details.get('certifications', [])},
            'prompt': f"""IMPORTANT: Keep certifications the same - do NOT change.

User's Actual Certifications (USE EXACTLY AS PROVIDED):
{json.dumps(user_details.get('certifications', []), indent=2)}

Task: Output the certifications section EXACTLY as provided in the user data above.
- Use the EXACT certification names, institute names, dates, and descriptions from the user's data
- Do NOT modify, reword, or change anything
- Keep it exactly as provided in the user data"""
        })
    
    # Section 7: Additional (Achievements, Publications)
    additional_data = {}
    if user_details.get('achievements'):
        additional_data['achievements'] = user_details.get('achievements', [])
    if user_details.get('publications'):
        additional_data['publications'] = user_details.get('publications', [])
    
    if additional_data:
        sections.append({
            'section': 'additional',
            'title': 'Additional Information',
            'data': additional_data,
            'prompt': f"""IMPORTANT: Keep publications the same - do NOT change. Achievements can be slightly reworded.

Job Description:
{job_description}

User's Actual Additional Information (USE THIS DATA):
{json.dumps(additional_data, indent=2)}

Task: Create the additional information section using the user's actual achievements and publications above.

REQUIREMENTS:
- PUBLICATIONS: Keep EXACTLY the same - do NOT modify, reword, or change publications
- ACHIEVEMENTS: Can slightly reword to align with job description keywords, but keep the same achievements
- Use the exact publication details from the user's data
- Maintain accuracy - use only the actual achievements and publications the user has
- Do NOT create, modify, or invent any achievements or publications"""
        })
    
    return sections


def send_to_ollama(prompt, ollama_host, ollama_port, ollama_model, stream=False):
    """
    Helper function to send data to Ollama and get response.
    This is the layer between Django and Ollama.
    """
    ollama_url = f"http://{ollama_host}:{ollama_port}/api/generate"
    
    ollama_payload = {
        'model': ollama_model,
        'prompt': prompt,
        'stream': stream
    }
    
    try:
        ollama_response = requests.post(
            ollama_url,
            json=ollama_payload,
            timeout=300
        )
        ollama_response.raise_for_status()
        
        if stream:
            return ollama_response.iter_lines()
        else:
            ollama_data = ollama_response.json()
            return ollama_data.get('response', '')
            
    except requests.exceptions.RequestException as e:
        raise Exception(f'Failed to connect to Ollama: {str(e)}')

