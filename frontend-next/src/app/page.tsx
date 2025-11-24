"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/contexts/UserContext";
import { Progress } from "@/components/ui/progress";
import { ResumeEditor } from "@/components/ResumeEditor";
import { toast } from "sonner";

interface SectionData {
  title: string;
  content: string;
}


const createSectionHeading = (title: string) => {
  return `<p data-spacing-after="0" style="margin-bottom: 0px;"><span style="font-size: 20px; font-family: &quot;Times New Roman&quot;, serif; color: rgb(77, 16, 47);"><strong>${title}</strong></span></p><hr data-width="100%" data-color="#4d102f" data-thickness="2px" data-spacing-before="0" data-spacing-after="0.5rem" style="border-right: none; border-bottom: none; border-left: none; border-image: initial; border-top: 2px solid rgb(77, 16, 47); width: 100%; margin-top: 0px; margin-bottom: 0.5rem; display: block;">`;
};


const TEMPLATE_RESUME_CONTENT = `
<p data-spacing-after="0" style="text-align: center; margin-bottom: 0px;"><span style="font-size: 24px; font-family: &quot;Times New Roman&quot;, serif; color: rgb(77, 16, 47);"><strong>[NAME]</strong></span></p><hr data-width="100%" data-color="#4d102f" data-thickness="2px" data-spacing-before="0" data-spacing-after="0.5rem" style="border-right: none; border-bottom: none; border-left: none; border-image: initial; border-top: 2px solid rgb(77, 16, 47); width: 100%; margin-top: 0px; margin-bottom: 0.5rem; display: block;"><p data-spacing-before="0" data-spacing-after="0" style="text-align: center; margin-top: 0px; margin-bottom: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">[CITY], [STATE/PROVINCE] | [PHONE] | [EMAIL]</span></p><p data-spacing-before="0" style="text-align: center; margin-top: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">[LINKEDIN] | [WEBSITE]</span></p>
${createSectionHeading("SUMMARY")}
<p><span style="font-family: &quot;Times New Roman&quot;, serif;">[SUMMARY]</span></p>
${createSectionHeading("EXPERIENCE")}
<h3><span style="font-size: 18px; font-family: &quot;Times New Roman&quot;, serif;">[COMPANY NAME], [JOB TITLE], [LOCATION]</span></h3>
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><em>[START DATE] - [END DATE]</em></span></p>
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>Tech Stack:</strong> [TECHNOLOGIES]</span></p>
<ul><li><p><span style="font-family: &quot;Times New Roman&quot;, serif;">[DESCRIPTION]</span></p></li></ul>
${createSectionHeading("PROJECTS")}
<h3><span style="font-size: 18px; font-family: &quot;Times New Roman&quot;, serif;">[PROJECT NAME]</span></h3>
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>Technologies:</strong> [TECHNOLOGIES]</span></p>
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>Link:</strong> [PROJECT LINK]</span></p>
<ul><li><p><span style="font-family: &quot;Times New Roman&quot;, serif;">[DESCRIPTION]</span></p></li></ul>
${createSectionHeading("SKILLS")}
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>[SKILL CATEGORY]:</strong> [SKILLS]</span></p>
${createSectionHeading("EDUCATION")}
<h3><span style="font-family: &quot;Times New Roman&quot;, serif;">[UNIVERSITY NAME], [LOCATION]</span></h3>
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>[DEGREE TYPE] in [FIELD OF STUDY]</strong></span></p>
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><em>[START DATE] - [END DATE]</em> | CGPA: [CGPA]</span></p>
${createSectionHeading("PUBLICATIONS")}
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>[PUBLICATION TITLE]</strong></span></p>
<p><span style="font-family: &quot;Times New Roman&quot;, serif;">[PUBLICATION DETAILS]</span></p>
${createSectionHeading("CERTIFICATIONS")}
<p><span style="font-family: &quot;Times New Roman&quot;, serif;">[CERTIFICATION NAME]</span></p>
`;

export default function Home() {
  const { user } = useUser();
  const [prompt, setPrompt] = useState("Refactor my resume based on the pasted job description");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<Record<string, SectionData>>({});
  const [progress, setProgress] = useState({ current: 0, total: 0, message: "" });
  const [resumeContent, setResumeContent] = useState<string>(TEMPLATE_RESUME_CONTENT);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [savedTemplate, setSavedTemplate] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Present';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; 
      
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${month} ${year}`;
    } catch {
      return dateString; 
    }
  };

  
  const formatDatesInContent = (htmlContent: string): string => {
    let content = htmlContent;
    
    
    const datePattern = /(\d{4}-\d{2}-\d{2})/g;
    
    content = content.replace(datePattern, (match) => {
      return formatDate(match);
    });
    
    
    const dateRangePattern = /(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})?/g;
    content = content.replace(dateRangePattern, (match, startDate, endDate) => {
      const formattedStart = formatDate(startDate);
      const formattedEnd = endDate ? formatDate(endDate) : 'Present';
      return `${formattedStart} - ${formattedEnd}`;
    });
    
    return content;
  };

  
  const replaceEntryPlaceholders = (entryTemplate: string, data: any, type: string): string => {
    
    let entry = entryTemplate;
    
    if (type === 'education') {
      
      
      if (data.university_name) {
        entry = entry.replace(/\[UNIVERSITY NAME\]/gi, data.university_name);
        
        
        if (entry.includes('[LOCATION] University')) {
          
          entry = entry.replace(/\[LOCATION\]\s+University[^,]*,\s*DJSCE/gi, data.university_name);
        }
      }
      if (data.location) {
        
        
        entry = entry.replace(/\[LOCATION\]/gi, data.location);
      } else {
        
        entry = entry.replace(/\[LOCATION\]/gi, '');
      }
      if (data.degree) {
        entry = entry.replace(/\[DEGREE TYPE\]\s+in\s+\[FIELD OF STUDY\]/gi, data.degree);
        
        entry = entry.replace(/\[DEGREE TYPE\]/gi, data.degree);
      }
      if (data.from_date) {
        const formattedStartDate = formatDate(data.from_date);
        entry = entry.replace(/\[START DATE\]/gi, formattedStartDate);
      }
      if (data.end_date) {
        const formattedEndDate = formatDate(data.end_date);
        entry = entry.replace(/\[END DATE\]/gi, formattedEndDate);
      } else {
        entry = entry.replace(/\[END DATE\]/gi, 'Present');
      }
      if (data.cgpa) {
        
        entry = entry.replace(/CGPA:\s*\[CGPA\]/gi, `CGPA: ${data.cgpa}`);
        
        entry = entry.replace(/CGPA\s+[0-9.]+[^<]*/gi, data.cgpa);
        entry = entry.replace(/\[CGPA\]/gi, data.cgpa);
      }
      return entry; 
    } else if (type === 'publication') {
      
      if (data.paper_name) {
        entry = entry.replace(/\[PUBLICATION TITLE\]/gi, data.paper_name);
      }
      
      
      const detailsParts: string[] = [];
      
      
      if (data.description) {
        
        const cleanDescription = data.description.replace(/\n+/g, ' ').trim();
        detailsParts.push(cleanDescription);
      }
      
      
      if (data.conference_name) {
        detailsParts.push(data.conference_name);
      }
      
      
      if (data.published_date) {
        detailsParts.push(formatDate(data.published_date));
      }
      
      
      if (detailsParts.length === 0 && data.publisher) {
        detailsParts.push(data.publisher);
      }
      
      
      const details = detailsParts.join(' | ');
      
      
      if (details) {
        
        if (entry.includes('[PUBLICATION DETAILS]')) {
          entry = entry.replace(/\[PUBLICATION DETAILS\]/gi, details);
        } else {
          
          
          if (!entry.match(/<p[^>]*><span[^>]*>.*?<\/span><\/p>\s*<p[^>]*><span[^>]*>/i)) {
            entry = entry.replace(/(<p[^>]*><span[^>]*><strong>.*?<\/strong>.*?<\/span><\/p>)/i, (match) => {
              return match + `\n<p><span style="font-family: &quot;Times New Roman&quot;, serif;">${details}</span></p>`;
            });
          }
        }
      } else {
        
        entry = entry.replace(/\[PUBLICATION DETAILS\]/gi, '');
      }
      
      
      const link = data.paper_link || data.link || '';
      if (link && data.paper_name) {
        
        entry = entry.replace(/(<strong>\[PUBLICATION TITLE\]<\/strong>)/gi, () => {
          return `<strong>${data.paper_name}</strong> <a href="${link}" target="_blank" rel="noopener noreferrer"><span style="font-family: &quot;Times New Roman&quot;, serif; color: rgb(0, 0, 0);">${link}</span></a>`;
        });
        
        entry = entry.replace(/(<strong>([^<]+)<\/strong>)(?!\s*<a)/gi, (match, fullMatch, title) => {
          if (title === data.paper_name && !entry.includes(link)) {
            return `${fullMatch} <a href="${link}" target="_blank" rel="noopener noreferrer"><span style="font-family: &quot;Times New Roman&quot;, serif; color: rgb(0, 0, 0);">${link}</span></a>`;
          }
          return match;
        });
      }
      
      return entry;
    } else if (type === 'certification') {
      const name = data.name || data.certification_name || '';
      if (name) {
        entry = entry.replace(/\[CERTIFICATION NAME\]/gi, name);
      }
    } else if (type === 'achievement') {
      const description = data.description || '';
      if (description) {
        entry = entry.replace(/\[ACHIEVEMENT DESCRIPTION\]/gi, description);
      }
    } else if (type === 'experience') {
      if (data.company_name) {
        entry = entry.replace(/\[COMPANY NAME\]/gi, data.company_name);
      }
      if (data.role || data.job_title) {
        entry = entry.replace(/\[JOB TITLE\]/gi, data.role || data.job_title);
      }
      if (data.location) {
        entry = entry.replace(/\[LOCATION\]/gi, data.location);
      }
      if (data.start_date) {
        const formattedStartDate = formatDate(data.start_date);
        entry = entry.replace(/\[START DATE\]/gi, formattedStartDate);
      }
      if (data.end_date) {
        const formattedEndDate = formatDate(data.end_date);
        entry = entry.replace(/\[END DATE\]/gi, formattedEndDate);
      } else {
        entry = entry.replace(/\[END DATE\]/gi, 'Present');
      }
      if (data.skills && Array.isArray(data.skills)) {
        const techStack = data.skills.join(', ');
        entry = entry.replace(/\[TECHNOLOGIES\]/gi, techStack);
      }
      if (data.description) {
        
        const description = data.description.replace(/\n/g, '').replace(/●\s*/g, '').trim();
        entry = entry.replace(/\[DESCRIPTION\]/gi, description);
      }
    }
    
    
    
    return entry;
  };

  
  const replacePlaceholdersWithData = (template: string, userData: any): string => {
    if (!userData || !template) return template;
    
    let content = template;
    const profile = userData.userProfile || {};
    
    
    if (profile.name) {
      const name = profile.name.toUpperCase();
      content = content.replace(/\[NAME\]/gi, name);
    }
    
    
    const city = profile.city || '';
    const state = profile.state || profile.province || '';
    const location = [city, state].filter(Boolean).join(', ');
    if (location) {
      content = content.replace(/\[CITY\],\s*\[STATE\/PROVINCE\]/gi, location);
    } else {
      content = content.replace(/\[CITY\],\s*\[STATE\/PROVINCE\]/gi, '[CITY], [STATE/PROVINCE]');
    }
    
    
    if (profile.phone_number) {
      content = content.replace(/\[PHONE\]/gi, profile.phone_number);
    }
    
    
    if (profile.email) {
      content = content.replace(/\[EMAIL\]/gi, profile.email);
    }
    
    
    const website = profile.personal_website_url || '';
    const userLinks = profile.links || [];
    const linkTexts: string[] = [];
    if (website) linkTexts.push(website);
    userLinks.forEach((link: any) => {
      if (link.url) linkTexts.push(link.url);
    });
    const linksText = linkTexts.length > 0 ? linkTexts.join(' | ') : '[LINKEDIN] | [WEBSITE]';
    content = content.replace(/\[LINKEDIN\]\s*\|\s*\[WEBSITE\]/gi, linksText);
    
    
    const replaceSectionWithMultipleEntries = (
      sectionName: string,
      items: any[],
      entryPattern: RegExp,
      entryType: string
    ) => {
      if (items.length === 0) return;
      
      
      
      const sectionPattern = new RegExp(
        `(<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>${sectionName}<\/strong><\/span><\/p><hr[^>]*>|<p[^>]*><span[^>]*><strong>${sectionName}<\/strong><\/span><\/p><hr[^>]*>)([\\s\\S]*?)(?=<p[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|PROJECTS|SKILLS|EDUCATION|PUBLICATIONS|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>|<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|PROJECTS|SKILLS|EDUCATION|PUBLICATIONS|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>|<h2|<h3|$)`,
        'i'
      );
      
      const sectionMatch = content.match(sectionPattern);
      if (sectionMatch) {
        const sectionHeader = sectionMatch[1];
        const sectionContent = sectionMatch[2];
        
        
        const entryMatch = sectionContent.match(entryPattern);
        
        if (entryMatch) {
          
          
          const entryTemplate = entryMatch[1];
          
          
          const entries = items.map((item: any) => {
            
            
            const freshTemplate = entryTemplate.slice(); 
            return replaceEntryPlaceholders(freshTemplate, item, entryType);
          }).join('');
          
          
          content = content.replace(sectionPattern, sectionHeader + entries);
        }
      }
    };
    
    
    if (userData.education && userData.education.length > 0) {
      
      
      
      
      const educationEntryPattern = /(<p[^>]*data-spacing-after[^>]*>.*?\[LOCATION\].*?University.*?\[DEGREE TYPE\].*?\[START DATE\].*?\[END DATE\].*?<\/span><\/p>[\s\S]*?<p[^>]*data-spacing-before[^>]*>.*?CGPA.*?<\/span><\/p>|<p[^>]*>.*?\[LOCATION\].*?University.*?\[DEGREE TYPE\].*?\[START DATE\].*?\[END DATE\].*?<\/p>[\s\S]*?<p[^>]*>.*?CGPA.*?<\/p>|<p[^>]*>.*?\[UNIVERSITY NAME\].*?\[LOCATION\].*?\[DEGREE TYPE\].*?\[START DATE\].*?\[END DATE\].*?(?:CGPA:.*?\[CGPA\])?.*?<\/p>|<h3[^>]*>.*?\[UNIVERSITY NAME\].*?\[LOCATION\].*?<\/h3>[\s\S]*?<p[^>]*>.*?\[DEGREE TYPE\].*?\[FIELD OF STUDY\].*?<\/p>[\s\S]*?<p[^>]*>.*?\[START DATE\].*?\[END DATE\].*?(?:CGPA:.*?\[CGPA\])?.*?<\/p>)/i;
      replaceSectionWithMultipleEntries('EDUCATION', userData.education, educationEntryPattern, 'education');
    }
    
    
    if (userData.publications && userData.publications.length > 0) {
      
      
      const publicationEntryPattern = /(<p[^>]*><span[^>]*><strong>\[PUBLICATION TITLE\]<\/strong>.*?<\/span><\/p>[\s\S]*?<p[^>]*><span[^>]*>\[PUBLICATION DETAILS\].*?<\/span><\/p>|<p[^>]*><span[^>]*><strong>\[PUBLICATION TITLE\]<\/strong>.*?<\/span><\/p>)/i;
      replaceSectionWithMultipleEntries('PUBLICATIONS', userData.publications, publicationEntryPattern, 'publication');
    }
    
    
    if (userData.certifications && userData.certifications.length > 0) {
      const certificationEntryPattern = /(<p[^>]*><span[^>]*>\[CERTIFICATION NAME\].*?<\/p>)/i;
      replaceSectionWithMultipleEntries('CERTIFICATIONS', userData.certifications, certificationEntryPattern, 'certification');
    }
    
    
    if (userData.achievements && userData.achievements.length > 0) {
      const achievementEntryPattern = /(<p[^>]*><span[^>]*>\[ACHIEVEMENT DESCRIPTION\].*?<\/p>)/i;
      replaceSectionWithMultipleEntries('ACHIEVEMENTS', userData.achievements, achievementEntryPattern, 'achievement');
    }
    
    
    
    
    return content;
  };

  
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(`/api/user-details/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setUserDetails(data);
          
          
          const profile = data.userProfile || {};
          const template = profile.resume_template;
          
          if (template) {
            
            setSavedTemplate(template);
            
            let contentWithData = replacePlaceholdersWithData(template, data);
            
            contentWithData = formatDatesInContent(contentWithData);
            setResumeContent(contentWithData);
          } else {
            
            let contentWithData = replacePlaceholdersWithData(TEMPLATE_RESUME_CONTENT, data);
            
            contentWithData = formatDatesInContent(contentWithData);
            setResumeContent(contentWithData);
          }
          
          
          const name = (profile.name || '[NAME]').toUpperCase();
          const city = profile.city || '';
          const state = profile.state || '';
          const location = [city, state].filter(Boolean).join(', ') || '[CITY], [STATE/PROVINCE]';
          const phone = profile.phone_number || '[PHONE]';
          const email = profile.email || '[EMAIL]';
          const website = profile.personal_website_url || '';
          
          
          const userLinks = profile.links || [];
          const linkTexts: string[] = [];
          
          
          if (website) {
            linkTexts.push(website);
          }
          
          
          userLinks.forEach((link: any) => {
            if (link.url) {
              linkTexts.push(link.url);
            }
          });
          
          const linksText = linkTexts.length > 0 ? linkTexts.join(' | ') : '[LINKEDIN] | [WEBSITE]';

          
          const educationHtml = data.education && data.education.length > 0
            ? data.education.map((edu: any) => {
                const university = edu.university_name || '[UNIVERSITY NAME]';
                const location = edu.location || '[LOCATION]';
                const degree = edu.degree || '[DEGREE TYPE] in [FIELD OF STUDY]';
                const fromDate = formatDate(edu.from_date) || '[START DATE]';
                const endDate = edu.end_date ? formatDate(edu.end_date) : 'Present';
                const cgpa = edu.cgpa ? `CGPA: ${edu.cgpa}` : '';
                return `<h3><span style="font-family: &quot;Times New Roman&quot;, serif;">${university}, ${location}</span></h3><p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>${degree}</strong></span></p><p><span style="font-family: &quot;Times New Roman&quot;, serif;"><em>${fromDate} - ${endDate}</em>${cgpa ? ` | ${cgpa}` : ''}</span></p>`;
              }).join('')
            : '<h3><span style="font-family: &quot;Times New Roman&quot;, serif;">[UNIVERSITY NAME], [LOCATION]</span></h3><p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>[DEGREE TYPE] in [FIELD OF STUDY]</strong></span></p><p><span style="font-family: &quot;Times New Roman&quot;, serif;"><em>[START DATE] - [END DATE]</em> | CGPA: [CGPA]</span></p>';

          
          const publicationsHtml = data.publications && data.publications.length > 0
            ? data.publications.map((pub: any) => {
                const title = pub.paper_name || '[PUBLICATION TITLE]';
                const details = pub.description || pub.publisher || pub.date || '[PUBLICATION DETAILS]';
                const link = pub.link || pub.paper_link || '';
                const linkHtml = link ? ` <a href="${link}" target="_blank" rel="noopener noreferrer"><span style="font-family: &quot;Times New Roman&quot;, serif; color: rgb(0, 0, 0);">${link}</span></a>` : '';
                return `<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>${title}</strong>${linkHtml}</span></p><p><span style="font-family: &quot;Times New Roman&quot;, serif;">${details}</span></p>`;
              }).join('')
            : '<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>[PUBLICATION TITLE]</strong></span></p><p><span style="font-family: &quot;Times New Roman&quot;, serif;">[PUBLICATION DETAILS]</span></p>';

          
          const certificationsHtml = data.certifications && data.certifications.length > 0
            ? data.certifications.map((cert: any) => {
                const name = cert.name || cert.certification_name || '[CERTIFICATION NAME]';
                return `<p><span style="font-family: &quot;Times New Roman&quot;, serif;">${name}</span></p>`;
              }).join('')
            : '<p><span style="font-family: &quot;Times New Roman&quot;, serif;">[CERTIFICATION NAME]</span></p>';

          
          const achievementsHtml = data.achievements && data.achievements.length > 0
            ? data.achievements.map((ach: any) => {
                const description = ach.description || '';
                return `<p><span style="font-family: &quot;Times New Roman&quot;, serif;">${description ? `${description}` : ''}</span></p>`;
              }).join('')
            : '';

          
          const headerSection = `<p data-spacing-after="0" style="text-align: center; margin-bottom: 0px;"><span style="font-size: 24px; font-family: &quot;Times New Roman&quot;, serif; color: rgb(77, 16, 47);"><strong>${name}</strong></span></p><hr data-width="100%" data-color="#4d102f" data-thickness="2px" data-spacing-before="0" data-spacing-after="0.5rem" style="border-right: none; border-bottom: none; border-left: none; border-image: initial; border-top: 2px solid rgb(77, 16, 47); width: 100%; margin-top: 0px; margin-bottom: 0.5rem; display: block;"><p data-spacing-before="0" data-spacing-after="0" style="text-align: center; margin-top: 0px; margin-bottom: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">${location} | ${phone} | ${email}</span></p><p data-spacing-before="0" style="text-align: center; margin-top: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">${linksText}</span></p>`;
          const educationSection = `${createSectionHeading("EDUCATION")}${educationHtml}`;
          const publicationsSection = `${createSectionHeading("PUBLICATIONS")}${publicationsHtml}`;
          const certificationsSection = `${createSectionHeading("CERTIFICATIONS")}${certificationsHtml}`;
          const achievementsSection = achievementsHtml ? `${createSectionHeading("ACHIEVEMENTS")}${achievementsHtml.replace('<h2>ACHIEVEMENTS</h2>', '')}` : '';
          
          
          if (!template) {
            const staticContent = `${headerSection}
${createSectionHeading("SUMMARY")}
<p><span style="font-family: &quot;Times New Roman&quot;, serif;">[SUMMARY]</span></p>
${createSectionHeading("EXPERIENCE")}
<h3><span style="font-size: 18px; font-family: &quot;Times New Roman&quot;, serif;">[COMPANY NAME], [JOB TITLE], [LOCATION]</span></h3>
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><em>[START DATE] - [END DATE]</em></span></p>
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>Tech Stack:</strong> [TECHNOLOGIES]</span></p>
<ul><li><p><span style="font-family: &quot;Times New Roman&quot;, serif;">[DESCRIPTION]</span></p></li></ul>
${createSectionHeading("PROJECTS")}
<h3><span style="font-size: 18px; font-family: &quot;Times New Roman&quot;, serif;">[PROJECT NAME]</span></h3>
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>Technologies:</strong> [TECHNOLOGIES]</span></p>
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>Link:</strong> [PROJECT LINK]</span></p>
<ul><li><p><span style="font-family: &quot;Times New Roman&quot;, serif;">[DESCRIPTION]</span></p></li></ul>
${createSectionHeading("SKILLS")}
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>[SKILL CATEGORY]:</strong> [SKILLS]</span></p>

${educationSection}

${publicationsSection}

${certificationsSection}${achievementsSection ? `\n\n${achievementsSection}` : ''}`;

            let contentWithData = replacePlaceholdersWithData(staticContent, data);
            
            contentWithData = formatDatesInContent(contentWithData);
            setResumeContent(contentWithData);
          }
        }
      } catch (err) {
        console.error('Error fetching user details:', err);
      }
    };

    fetchUserDetails();
  }, [user?.id]);

  
  const buildStaticSections = (userData: any) => {
    if (!userData) return '';

    let html = '';

    
    if (userData.education && userData.education.length > 0) {
      html += createSectionHeading("EDUCATION");
      userData.education.forEach((edu: any) => {
        const university = edu.university_name || '';
        const location = edu.location || '';
        const degree = edu.degree || '';
        const fromDate = formatDate(edu.from_date) || '';
        const endDate = edu.end_date ? formatDate(edu.end_date) : 'Present';
        const cgpa = edu.cgpa ? ` | CGPA: ${edu.cgpa}` : '';
        html += `<h3><span style="font-family: &quot;Times New Roman&quot;, serif;">${university}${location ? `, ${location}` : ''}</span></h3>`;
        html += `<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>${degree}</strong></span></p>`;
        html += `<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><em>${fromDate} - ${endDate}</em>${cgpa}</span></p>`;
      });
    }

    
    if (userData.publications && userData.publications.length > 0) {
      html += createSectionHeading("PUBLICATIONS");
      userData.publications.forEach((pub: any) => {
        const title = pub.paper_name || '';
        const description = pub.description || pub.publisher || pub.date || '';
        const link = pub.link || pub.paper_link || '';
        html += `<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>${title}</strong>`;
        if (link) {
          html += ` <a href="${link}" target="_blank" rel="noopener noreferrer"><span style="font-family: &quot;Times New Roman&quot;, serif; color: rgb(0, 0, 0);">${link}</span></a>`;
        }
        html += `</span></p>`;
        if (description) {
          html += `<p><span style="font-family: &quot;Times New Roman&quot;, serif;">${description}</span></p>`;
        }
      });
    }

    
    if (userData.certifications && userData.certifications.length > 0) {
      html += createSectionHeading("CERTIFICATIONS");
      userData.certifications.forEach((cert: any) => {
        const name = cert.name || cert.certification_name || '';
        html += `<p><span style="font-family: &quot;Times New Roman&quot;, serif;">${name}</span></p>`;
      });
    }

    
    if (userData.achievements && userData.achievements.length > 0) {
      html += createSectionHeading("ACHIEVEMENTS");
      userData.achievements.forEach((ach: any) => {
        const title = ach.title || ach.name || '';
        const description = ach.description || '';
        html += `<p><span style="font-family: &quot;Times New Roman&quot;, serif;">${description || title}</span></p>`;
      });
    }

    return html;
  };

  
  useEffect(() => {
    if (Object.keys(sections).length > 0 && userDetails) {
      
      const profile = userDetails.userProfile || {};
      const name = (profile.name || '[NAME]').toUpperCase();
      const city = profile.city || '';
      const state = profile.state || '';
      const location = [city, state].filter(Boolean).join(', ') || '[CITY], [STATE/PROVINCE]';
      const phone = profile.phone_number || profile.phone || '[PHONE]';
      const email = profile.email || '[EMAIL]';
      const website = profile.personal_website_url || '';
      const userLinks = profile.links || [];
      const linkTexts: string[] = [];
      if (website) linkTexts.push(website);
      userLinks.forEach((link: any) => {
        if (link.url) linkTexts.push(link.url);
      });
      const linksText = linkTexts.length > 0 ? linkTexts.join(' | ') : '[LINKEDIN] | [WEBSITE]';
      
      const headerSection = `<p data-spacing-after="0" style="text-align: center; margin-bottom: 0px;"><span style="font-size: 24px; font-family: &quot;Times New Roman&quot;, serif; color: rgb(77, 16, 47);"><strong>${name}</strong></span></p><hr data-width="100%" data-color="#4d102f" data-thickness="2px" data-spacing-before="0" data-spacing-after="0.5rem" style="border-right: none; border-bottom: none; border-left: none; border-image: initial; border-top: 2px solid rgb(77, 16, 47); width: 100%; margin-top: 0px; margin-bottom: 0.5rem; display: block;"><p data-spacing-before="0" data-spacing-after="0" style="text-align: center; margin-top: 0px; margin-bottom: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">${location} | ${phone} | ${email}</span></p><p data-spacing-before="0" style="text-align: center; margin-top: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">${linksText}</span></p>`;

      
      const formatSectionContent = (content: string, sectionKey: string) => {
        
        const sectionTitles: Record<string, string> = {
          'experience': 'EXPERIENCE',
          'projects': 'PROJECTS',
          'skills': 'SKILLS'
        };
        
        const sectionTitle = sectionTitles[sectionKey];
        let processedContent = content.trim();
        
        
        if (sectionTitle) {
          processedContent = processedContent.replace(
            new RegExp(`<h2[^>]*>\\s*${sectionTitle}\\s*</h2>`, 'gi'),
            ''
          );
          
          processedContent = processedContent.replace(/^<h2[^>]*>.*?<\/h2>\s*/i, '');
        }
        
        
        
        const hasStyling = processedContent.includes('font-family');
        
        if (!hasStyling) {
          processedContent = processedContent
            .replace(/<p([^>]*)>/g, '<p$1><span style="font-family: &quot;Times New Roman&quot;, serif;">')
            .replace(/<\/p>/g, '</span></p>')
            .replace(/<h3([^>]*)>/g, '<h3$1><span style="font-size: 18px; font-family: &quot;Times New Roman&quot;, serif;">')
            .replace(/<\/h3>/g, '</span></h3>')
            .replace(/<li([^>]*)>/g, '<li$1><p><span style="font-family: &quot;Times New Roman&quot;, serif;">')
            .replace(/<\/li>/g, '</span></p></li>');
        }
        
        
        if (sectionTitle) {
          return `${createSectionHeading(sectionTitle)}${processedContent}`;
        }
        
        return processedContent;
      };

      
      const modelSections = Object.entries(sections)
        .filter(([key]) => ['profile', 'experience', 'projects', 'skills'].includes(key))
        .sort(([keyA], [keyB]) => {
          const order = ['profile', 'experience', 'projects', 'skills'];
          return order.indexOf(keyA) - order.indexOf(keyB);
        })
        .map(([key, section]) => {
          
          if (key === 'profile') {
            const content = section.content.trim();
            
            let summaryContent = content
              .replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi, '') 
              .replace(/<p>.*?\|.*?\|.*?<\/p>/gi, '') 
              .replace(/<p>.*?@.*?<\/p>/gi, '') 
              .replace(/<p>.*?http.*?<\/p>/gi, 'i') 
              .trim();
            
            
            summaryContent = summaryContent.replace(/<p>\s*<\/p>/gi, '').trim();
            
            
            if (summaryContent && !summaryContent.includes('font-family')) {
              summaryContent = summaryContent
                .replace(/<p>/g, '<p><span style="font-family: &quot;Times New Roman&quot;, serif;">')
                .replace(/<\/p>/g, '</span></p>');
            }
            
            
            if (summaryContent) {
              return `${createSectionHeading("SUMMARY")}${summaryContent}`;
            } else {
              return `${createSectionHeading("SUMMARY")}<p><span style="font-family: &quot;Times New Roman&quot;, serif;">[SUMMARY]</span></p>`;
            }
          }
          
          const content = section.content.trim();
          const isHTML = content.includes('<') && (content.includes('</') || content.includes('/>') || content.includes('<h') || content.includes('<p') || content.includes('<ul') || content.includes('<li'));
          
          if (isHTML) {
            return formatSectionContent(content, key);
          } else {
            
            const lines = content.split('\n').filter(line => line.trim());
            const htmlLines = lines.map(line => {
              const trimmed = line.trim();
              if (trimmed.match(/^#{1,6}\s/)) {
                const level = trimmed.match(/^#+/)?.[0].length || 2;
                const text = trimmed.replace(/^#+\s*/, '');
                if (level === 2) {
                  
                  return createSectionHeading(text.toUpperCase());
                }
                return `<h${Math.min(level, 6)}><span style="font-size: ${level === 3 ? '18px' : '20px'}; font-family: &quot;Times New Roman&quot;, serif;">${text}</span></h${Math.min(level, 6)}>`;
              }
              if (trimmed.match(/^[-*]\s/)) {
                return `<li><p><span style="font-family: &quot;Times New Roman&quot;, serif;">${trimmed.replace(/^[-*]\s*/, '')}</span></p></li>`;
              }
              return `<p><span style="font-family: &quot;Times New Roman&quot;, serif;">${trimmed}</span></p>`;
            });
            
            let result = '';
            let inList = false;
            for (let i = 0; i < htmlLines.length; i++) {
              if (htmlLines[i].startsWith('<li>')) {
                if (!inList) {
                  result += '<ul>';
                  inList = true;
                }
                result += htmlLines[i];
              } else {
                if (inList) {
                  result += '</ul>';
                  inList = false;
                }
                result += htmlLines[i];
              }
            }
            if (inList) {
              result += '</ul>';
            }
            
            
            return formatSectionContent(result, key);
          }
        })
        .join("");

      
      const staticSections = buildStaticSections(userDetails);

      
      const hasProfileSection = Object.keys(sections).includes('profile');
      const professionalSummaryPlaceholder = hasProfileSection ? '' : `${createSectionHeading("SUMMARY")}<p><span style="font-family: &quot;Times New Roman&quot;, serif;">[SUMMARY]</span></p>`;
      
      
      const combinedContent = `${headerSection}\n\n${professionalSummaryPlaceholder}${professionalSummaryPlaceholder ? '\n\n' : ''}${modelSections}\n\n${staticSections}`;
      
      
      if (savedTemplate && Object.keys(sections).length === 0) {
        
        let templateWithData = replacePlaceholdersWithData(savedTemplate, userDetails);
        
        templateWithData = formatDatesInContent(templateWithData);
        setResumeContent(templateWithData);
      } else {
        
        const formattedContent = formatDatesInContent(combinedContent);
        setResumeContent(formattedContent);
      }
    }
  }, [sections, userDetails, savedTemplate]);

  const generateResume = async () => {
    if (!prompt.trim() || !jobDescription.trim()) {
      setError("Please fill in both prompt and job description");
      return;
    }

    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError(null);
    setSections({});
    setProgress({ current: 0, total: 0, message: "Starting..." });

    
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          job_description: jobDescription,
          user_id: user.id,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === "progress") {
                setProgress({
                  current: data.current || 0,
                  total: data.total || 0,
                  message: data.message || "",
                });
              } else if (data.type === "section") {
                setSections((prev) => ({
                  ...prev,
                  [data.section]: {
                    title: data.title,
                    content: data.content,
                  },
                }));
                setProgress({
                  current: data.progress?.current || 0,
                  total: data.progress?.total || 0,
                  message: `Completed: ${data.title}`,
                });
              } else if (data.type === "section_error") {
                setError(`Error in ${data.title}: ${data.error}`);
                
              } else if (data.type === "complete") {
                setProgress({
                  current: data.total,
                  total: data.total,
                  message: "Resume generation completed!",
                });
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Generation cancelled");
      } else {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportHTML = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    
    if (!file.name.endsWith('.html') && !file.type.includes('html')) {
      setError("Please select an HTML file");
      return;
    }

    try {
      const text = await file.text();
      
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      
      const bodyElement = doc.body;
      if (!bodyElement) {
        setError("Invalid HTML file: No body content found");
        return;
      }

      
      const bodyContent = bodyElement.innerHTML;
      
      
      setResumeContent(bodyContent);
      setError(null);
      
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import HTML file");
    }
  };

  
  
  const extractPlaceholders = (htmlContent: string): string => {
    let template = htmlContent;
    
    if (!userDetails) {
      
      return template;
    }
    
    const profile = userDetails.userProfile || {};
    
    
    if (profile.name) {
      const name = profile.name.toUpperCase();
      template = template.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[NAME]');
    }
    
    
    const city = profile.city || '';
    const state = profile.state || profile.province || '';
    const location = [city, state].filter(Boolean).join(', ');
    if (location) {
      template = template.replace(new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[CITY], [STATE/PROVINCE]');
    }
    
    const phone = profile.phone_number || '';
    if (phone) {
      template = template.replace(new RegExp(phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[PHONE]');
    }
    
    const email = profile.email || '';
    if (email) {
      template = template.replace(new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[EMAIL]');
    }
    
    
    const links = profile.links || [];
    const allLinkUrls: string[] = [];
    links.forEach((link: any) => {
      if (link.url) allLinkUrls.push(link.url);
    });
    if (profile.personal_website_url) {
      allLinkUrls.push(profile.personal_website_url);
    }
    
    
    allLinkUrls.forEach((url: string) => {
      template = template.replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[LINKEDIN] | [WEBSITE]');
    });
    
    
    template = template.replace(/(\[LINKEDIN\]\s*\|\s*\[WEBSITE\])(\s*\|\s*\[LINKEDIN\]\s*\|\s*\[WEBSITE\])+/gi, '$1');
    
    
    if (userDetails.education && userDetails.education.length > 0) {
      
      const seenValues = new Set<string>();
      userDetails.education.forEach((edu: any) => {
        if (edu.university_name && !seenValues.has(edu.university_name)) {
          template = template.replace(new RegExp(edu.university_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[UNIVERSITY NAME]');
          seenValues.add(edu.university_name);
        }
        if (edu.location && !seenValues.has(`loc_${edu.location}`)) {
          template = template.replace(new RegExp(edu.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[LOCATION]');
          seenValues.add(`loc_${edu.location}`);
        }
        if (edu.degree && !seenValues.has(edu.degree)) {
          template = template.replace(new RegExp(edu.degree.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[DEGREE TYPE] in [FIELD OF STUDY]');
          seenValues.add(edu.degree);
        }
        if (edu.from_date && !seenValues.has(edu.from_date)) {
          template = template.replace(new RegExp(edu.from_date.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[START DATE]');
          seenValues.add(edu.from_date);
        }
        if (edu.end_date && !seenValues.has(edu.end_date)) {
          template = template.replace(new RegExp(edu.end_date.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[END DATE]');
          seenValues.add(edu.end_date);
        }
        if (edu.cgpa && !seenValues.has(`cgpa_${edu.cgpa}`)) {
          template = template.replace(new RegExp(`CGPA:?\\s*${edu.cgpa.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), 'CGPA: [CGPA]');
          seenValues.add(`cgpa_${edu.cgpa}`);
        }
      });
      
      
      
      
      const educationBlockPattern = /(<h3[^>]*>.*?\[UNIVERSITY NAME\].*?\[LOCATION\].*?<\/h3>[\s\S]*?<p[^>]*>.*?\[START DATE\].*?\[END DATE\].*?(?:CGPA:.*?\[CGPA\])?.*?<\/p>)/gi;
      const educationMatches = template.match(educationBlockPattern);
      if (educationMatches && educationMatches.length > 1) {
        
        let isFirst = true;
        template = template.replace(educationBlockPattern, (match) => {
          if (isFirst) {
            isFirst = false;
            return match;
          }
          return ''; 
        });
        
        template = template.replace(/\s*<h3[^>]*>\[UNIVERSITY NAME\].*?<\/h3>\s*/gi, (match, offset) => {
          
          return match;
        });
      }
    }
    
    
    if (userDetails.publications && userDetails.publications.length > 0) {
      
      const seenValues = new Set<string>();
      userDetails.publications.forEach((pub: any) => {
        if (pub.paper_name && !seenValues.has(pub.paper_name)) {
          template = template.replace(new RegExp(pub.paper_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[PUBLICATION TITLE]');
          seenValues.add(pub.paper_name);
        }
        if (pub.description || pub.publisher || pub.date) {
          const details = pub.description || pub.publisher || pub.date || '';
          if (details && !seenValues.has(`pub_${details}`)) {
            template = template.replace(new RegExp(details.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[PUBLICATION DETAILS]');
            seenValues.add(`pub_${details}`);
          }
        }
      });
      
      
      
      const publicationBlockPattern = /(<p[^>]*><span[^>]*><strong>\[PUBLICATION TITLE\]<\/strong>.*?<\/p>\s*<p[^>]*><span[^>]*>\[PUBLICATION DETAILS\].*?<\/p>)/gi;
      const publicationMatches = template.match(publicationBlockPattern);
      if (publicationMatches && publicationMatches.length > 1) {
        
        let isFirst = true;
        template = template.replace(publicationBlockPattern, (match) => {
          if (isFirst) {
            isFirst = false;
            return match;
          }
          return ''; 
        });
        
        template = template.replace(/\n{3,}/g, '\n\n');
      }
    }
    
    
    if (userDetails.certifications) {
      const seenValues = new Set<string>();
      userDetails.certifications.forEach((cert: any) => {
        const name = cert.name || cert.certification_name || '';
        if (name && !seenValues.has(name)) {
          template = template.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[CERTIFICATION NAME]');
          seenValues.add(name);
        }
      });
    }
    
    
    if (userDetails.achievements) {
      const seenValues = new Set<string>();
      userDetails.achievements.forEach((ach: any) => {
        const description = ach.description || '';
        if (description && !seenValues.has(description)) {
          template = template.replace(new RegExp(description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[ACHIEVEMENT DESCRIPTION]');
          seenValues.add(description);
        }
      });
    }
    
    return template;
  };

  const handleSaveTemplate = async () => {
    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    try {
      
      const templateContent = extractPlaceholders(resumeContent);
      
      setError(null);
      
      const response = await fetch('/api/save-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          template: templateContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setError(null);
      toast.success('Template saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-white font-sans dark:bg-[#212121] p-8">
      <main className="w-full max-w-7xl">
        <Card className="dark:bg-[#212121] bg-white border-0 shadow-none">

          <CardContent className="space-y-6">
            {/* Prompt Input */}
            <div className="space-y-2">
              <label htmlFor="prompt" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Prompt
              </label>
              <Textarea
                id="prompt"
                placeholder="Enter your prompt here..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                className="min-h-10 bg-[#F9F9F9] dark:bg-[#303030] dark:text-white dark:border-0 mt-2"
              />
              <p className="text-muted-foreground text-sm">
                Enter instructions or details for resume generation.
              </p>
            </div>

            {/* Job Description Input */}
            <div className="space-y-2">
              <label htmlFor="job-description" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Job Description
              </label>
              <Textarea
                id="job-description"
                placeholder="Enter job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={loading}
                className="min-h-64 resize-none bg-[#F9F9F9] dark:bg-[#303030] dark:text-white dark:border-0 mt-2"
              />
            </div>

            {/* Generate Button */}
            <div className="flex gap-2">
              <Button 
                onClick={generateResume} 
                disabled={loading || !prompt.trim() || !jobDescription.trim()}
                className="flex-1 dark:bg-secondary dark:text-secondary-foreground hover:dark:text-white"
              >
                {loading ? "Generating..." : "Generate Resume"}
              </Button>
              {loading && (
                <Button 
                  onClick={cancelGeneration}
                  variant="outline"
                  className="dark:bg-[#303030] dark:text-white"
                >
                  Cancel
                </Button>
              )}
            </div>

            {/* Progress Bar */}
            {loading && progress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                  <span>{progress.message}</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <Progress 
                  value={(progress.current / progress.total) * 100} 
                  className="h-2"
                />
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 rounded-lg border border-red-500">
                <div className="text-red-600 dark:text-red-400 font-medium">
                  ✗ Error
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                  Failed to generate resume please try again.
                </div>
              </div>
            )}

            {/* Resume Editor - Shows template by default, updates when sections are generated */}
            <div className="mt-6 space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Resume Editor {Object.keys(sections).length > 0 ? "(Generated)" : "(Template)"}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,text/html"
                onChange={handleFileChange}
                className="hidden"
              />
              <ResumeEditor 
                content={resumeContent}
                onContentChange={(content) => setResumeContent(content)}
                onImportHTML={handleImportHTML}
                onSaveTemplate={handleSaveTemplate}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
