from django.db import connection
import json
import requests


def get_user_details_data(user_id_int):
    """
    Helper function to get user details data.
    Returns the user details dictionary or None if user doesn't exist.
    """
    with connection.cursor() as cursor:

        cursor.execute("SELECT id FROM users WHERE id = %s", [user_id_int])
        user_row = cursor.fetchone()
        
        if not user_row:
            return None


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
                    p.resume_template,
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


        cursor.execute(sql_query, [user_id_int] * 12)
        
        row = cursor.fetchone()
        
        if not row or not row[0]:
            return None


        result_data = row[0]
        

        if isinstance(result_data, str):
            result_data = json.loads(result_data)
        
        return result_data


def prepare_resume_sections(user_details, prompt, job_description):
    """
    Prepare user details into sections for sequential processing.
    Returns a list of sections with their prompts.
    Now only generates 3 sections: summary, experiences, and projects.
    """
    sections = []
    

    profile_data = user_details.get('userProfile', {})
    bio = profile_data.get('bio', '')
    introduction = profile_data.get('introduction', '')
    
    sections.append({
        'section': 'summary',
        'title': 'Professional Summary',
        'data': {
            'bio': bio,
            'introduction': introduction,
            'job_description': job_description
        },
        'prompt': f"""IMPORTANT: Use ONLY the user's bio and introduction provided below. Do NOT create or invent any information.

Job Description:
{job_description}

User's Bio:
{bio}

User's Introduction:
{introduction}

Task: Create a professional summary by combining the user's bio and introduction.

REQUIREMENTS:
- Combine the user's bio and introduction into a short professional summary
- Maximum 3 lines only
- Reword the combined bio/introduction to align with the job description's requirements and terminology
- Use keywords and language from the job description while maintaining the user's actual background
- Keep it concise and impactful (max 3 lines)
- Do NOT add any information that is not in the provided bio or introduction
- Output ONLY the summary text, no headings or extra formatting"""
    })
    

    if user_details.get('experiences'):
        experiences = user_details.get('experiences', [])

        for idx, experience in enumerate(experiences):
            company_name = experience.get('company_name', '')
            role = experience.get('role', '')
            original_description = experience.get('description', '')
            
            sections.append({
                'section': 'experience',
                'title': f'Work Experience {idx + 1}',
                'data': {
                    'experience': experience,
                    'index': idx,
                    'company_name': company_name
                },
                'prompt': f"""IMPORTANT: Generate ONLY the description for this work experience. Do NOT include company name, job title, location, dates, or technologies.

Job Description:
{job_description}

Work Experience Details:
Company: {company_name}
Role: {role}
Original Description: {original_description}

Task: Generate a professional description for this work experience that aligns with the job description.

REQUIREMENTS:
- Maintain similar level of detail as the original description
- Use keywords and terminology from the job description
- Generate response in new lines with one point per line
- Output must be in separate lines (newline-separated: \n), NOT bullet points.
- Each point should be NOT more than 2 lines (not in one paragraph)
- Format: Each point on a new line, where each point is maximum 2 lines long
- Do NOT include company name, job title, location, dates, or technologies
- Do NOT create or invent any experiences
- Do NOT create or invent any information not in the original description
- Output ONLY the description points, one per line, nothing else"""
            })
    

    if user_details.get('projects'):
        projects = user_details.get('projects', [])

        for idx, project in enumerate(projects):
            project_name = project.get('name', '')
            original_description = project.get('description', '')
            
            sections.append({
                'section': 'project',
                'title': f'Project {idx + 1}',
                'data': {
                    'project': project,
                    'index': idx,
                    'project_name': project_name
                },
                'prompt': f"""CRITICAL: Generate ONLY the description for this project. Do NOT include project name, technologies, links, or dates.

Job Description:
{job_description}

Project Details:
Name: {project_name}
Original Description: {original_description}

Task: Generate a professional description for this project that aligns with the job description.

REQUIREMENTS:
- Maintain similar level of detail as the original description
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
- Do NOT create, invent, or generate any projects that are not in the user's actual project list
- Output must be in separate lines (newline-separated: \n), NOT bullet points.
- Generate response in new lines with one point per line
- Each point should be NOT more than 2 lines (not in one paragraph)
- Format: Each point on a new line, where each point is maximum 2 lines long
- Do NOT include project name, technologies, links, or dates
- Output ONLY the description points, one per line, nothing else"""
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

