"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/contexts/UserContext";
import { Progress } from "@/components/ui/progress";
import { ResumeEditor } from "@/components/ResumeEditor";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react";

interface SectionData {
  title: string;
  content: string;
  section?: string;
  company_name?: string;
  project_name?: string;
  index?: number;
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
<ul><li><p data-spacing-after="0" style="margin-bottom: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">[DESCRIPTION]</span></p></li></ul>
${createSectionHeading("PROJECTS")}
<h3><span style="font-size: 18px; font-family: &quot;Times New Roman&quot;, serif;">[PROJECT NAME]</span></h3>
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>Technologies:</strong> [TECHNOLOGIES]</span></p>
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>Link:</strong> [PROJECT LINK]</span></p>
<ul><li><p data-spacing-after="0" style="margin-bottom: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">[DESCRIPTION]</span></p></li></ul>
${createSectionHeading("SKILLS")}
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>[SKILL CATEGORY]:</strong> [SKILLS]</span></p>
${createSectionHeading("EDUCATION")}
<h3><span style="font-family: &quot;Times New Roman&quot;, serif;">[UNIVERSITY NAME], [LOCATION]</span></h3>
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>[DEGREE TYPE] in [FIELD OF STUDY]</strong></span></p>
<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><em>[START DATE] - [END DATE]</em> | [CGPA]</span></p>
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
  const [isResponsesOpen, setIsResponsesOpen] = useState(false);

  
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
        
        entry = entry.replace(/CGPA:\s*\[CGPA\]/gi, `${data.cgpa}`);
        
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

        const bulletPoints = data.description
          .split('\n')
          .map((line: string) => line.replace(/^●\s*/, '').trim())
          .filter((line: string) => line.length > 0);
        
        if (bulletPoints.length > 0) {

          const listItems = bulletPoints.map((point: string) => 
            `<li><p data-spacing-after="0" style="margin-bottom: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">${point}</span></p></li>`
          ).join('');
          

          entry = entry.replace(
            /<ul>[\s\S]*?<li>[\s\S]*?<p[^>]*>[\s\S]*?<span[^>]*>\[DESCRIPTION\]<\/span>[\s\S]*?<\/p>[\s\S]*?<\/li>[\s\S]*?<\/ul>/gi,
            `<ul>${listItems}</ul>`
          );
        }
      }
    } else if (type === 'project') {
      if (data.name || data.project_name) {
        entry = entry.replace(/\[PROJECT NAME\]/gi, data.name || data.project_name);
      }
      if (data.technologies || data.tech_stack) {
        const tech = Array.isArray(data.technologies) 
          ? data.technologies.join(', ')
          : (data.tech_stack || '');
        if (tech) {
          entry = entry.replace(/\[TECHNOLOGIES\]/gi, tech);
        }
      }
      const liveLink = data.links && Array.isArray(data.links) 
        ? data.links.find((link: any) => link.type === 'liveurl')
        : null;
      const link = liveLink ? liveLink.url : (data.link || data.project_link || '');
      if (link) {
        entry = entry.replace(/\[PROJECT LINK\]/gi, link);
      }
      if (data.description) {

        const bulletPoints = data.description
          .split('\n')
          .map((line: string) => line.replace(/^●\s*/, '').trim())
          .filter((line: string) => line.length > 0);
        
        if (bulletPoints.length > 0) {

          const listItems = bulletPoints.map((point: string) => 
            `<li><p data-spacing-after="0" style="margin-bottom: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">${point}</span></p></li>`
          ).join('');
          

          entry = entry.replace(
            /<ul>[\s\S]*?<li>[\s\S]*?<p[^>]*>[\s\S]*?<span[^>]*>\[DESCRIPTION\]<\/span>[\s\S]*?<\/p>[\s\S]*?<\/li>[\s\S]*?<\/ul>/gi,
            `<ul>${listItems}</ul>`
          );
        }
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
    }
    if (city) {
      content = content.replace(/\[CITY\]/gi, city);
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
    
    if (profile.bio) {
      content = content.replace(/\[SUMMARY\]/gi, profile.bio);
    }
    


    
    const processSection = (sectionName: string, items: any[], entryType: string) => {
      if (!items || items.length === 0) return;
      

      const sectionHeadingPattern = new RegExp(
        `(<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>${sectionName}<\/strong><\/span><\/p><hr[^>]*>|<p[^>]*><span[^>]*><strong>${sectionName}<\/strong><\/span><\/p><hr[^>]*>)`,
        'i'
      );
      
      const sectionMatch = content.match(sectionHeadingPattern);
      if (!sectionMatch) return;
      
      const headingEnd = sectionMatch.index! + sectionMatch[0].length;
      

      const nextSectionPattern = /<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|PROJECTS|SKILLS|EDUCATION|PUBLICATIONS|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>|<p[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|PROJECTS|SKILLS|EDUCATION|PUBLICATIONS|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>/i;
      const remainingContent = content.substring(headingEnd);
      const nextSectionMatch = remainingContent.match(nextSectionPattern);
      const sectionEnd = nextSectionMatch 
        ? headingEnd + nextSectionMatch.index!
        : content.length;
      
      const sectionContent = content.substring(headingEnd, sectionEnd);
      

      let placeholderPattern: RegExp;
      let entryStartTag = '';
      let nextEntryMarker = '';
      
      if (entryType === 'experience') {
        placeholderPattern = /\[COMPANY NAME\]/i;
        entryStartTag = '<h3';
        nextEntryMarker = '<h3';
      } else if (entryType === 'project') {
        placeholderPattern = /\[PROJECT NAME\]/i;
        entryStartTag = '<h3';
        nextEntryMarker = '<h3';
      } else if (entryType === 'education') {
        placeholderPattern = /\[UNIVERSITY NAME\]/i;
        entryStartTag = '<h3';
        nextEntryMarker = '<h3';
      } else if (entryType === 'publication') {
        placeholderPattern = /\[PUBLICATION TITLE\]/i;
        entryStartTag = '<p';
        nextEntryMarker = '[PUBLICATION TITLE]';
      } else if (entryType === 'certification') {
        placeholderPattern = /\[CERTIFICATION NAME\]/i;
        entryStartTag = '<p';
        nextEntryMarker = '[CERTIFICATION NAME]';
      } else if (entryType === 'achievement') {
        placeholderPattern = /\[ACHIEVEMENT DESCRIPTION\]/i;
        entryStartTag = '<p';
        nextEntryMarker = '[ACHIEVEMENT DESCRIPTION]';
      } else {
        return; 
      }
      

      const placeholderIndex = sectionContent.search(placeholderPattern);
      if (placeholderIndex === -1) return;
      

      let entryStartIndex = 0;
      
      if (entryType === 'certification' || entryType === 'publication' || entryType === 'achievement') {



        const beforePlaceholder = sectionContent.substring(0, placeholderIndex);


        let lastPStart = beforePlaceholder.lastIndexOf('<p');
        if (lastPStart !== -1) {

          const between = sectionContent.substring(lastPStart, placeholderIndex);
          const hasClosingP = between.includes('</p>');
          if (!hasClosingP) {
            entryStartIndex = lastPStart;
          } else {


            const beforeClosing = beforePlaceholder.substring(0, lastPStart);
            const prevPStart = beforeClosing.lastIndexOf('<p');
            if (prevPStart !== -1) {
              entryStartIndex = prevPStart;
            }
          }
        }
      } else {

        const beforePlaceholder = sectionContent.substring(0, placeholderIndex);
        const lastEntryStart = beforePlaceholder.lastIndexOf(entryStartTag);
        if (lastEntryStart !== -1) {
          entryStartIndex = lastEntryStart;
        }
      }
      

      let entryEndIndex = sectionContent.length;
      const afterCurrentEntry = sectionContent.substring(entryStartIndex);
      
      if (nextEntryMarker.startsWith('<')) {


        if (entryType === 'experience' || entryType === 'project') {
          const ulEndMatch = afterCurrentEntry.match(/<\/ul>/i);
          if (ulEndMatch) {
            const afterUl = ulEndMatch.index! + ulEndMatch[0].length;
            const nextH3 = afterCurrentEntry.substring(afterUl).search(/<h3/i);
            entryEndIndex = entryStartIndex + (nextH3 > 0 ? afterUl + nextH3 : afterUl);
          }
        } else {

          const nextH3 = afterCurrentEntry.substring(1).search(/<h3/i);
          entryEndIndex = nextH3 > 0 ? entryStartIndex + 1 + nextH3 : sectionContent.length;
        }
      } else {


        const pEndMatches = [...afterCurrentEntry.matchAll(/<\/p>/gi)];
        
        if (pEndMatches.length > 0) {



          let selectedPEndIndex = pEndMatches.length - 1; 
          

          for (let i = 0; i < pEndMatches.length; i++) {
            const pEndPos = pEndMatches[i].index! + pEndMatches[i][0].length;
            const afterThisP = afterCurrentEntry.substring(pEndPos);
            const nextMarkerIndex = afterThisP.search(new RegExp(nextEntryMarker, 'i'));
            
            if (nextMarkerIndex > 0) {

              selectedPEndIndex = i;
              break;
            }
          }
          
          const selectedPEnd = pEndMatches[selectedPEndIndex];
          const afterP = selectedPEnd.index! + selectedPEnd[0].length;
          entryEndIndex = entryStartIndex + afterP;
        } else {

          const nextMarkerIndex = afterCurrentEntry.substring(1).search(new RegExp(nextEntryMarker, 'i'));
          entryEndIndex = nextMarkerIndex > 0 ? entryStartIndex + 1 + nextMarkerIndex : sectionContent.length;
        }
      }
      

      const entryTemplate = sectionContent.substring(entryStartIndex, entryEndIndex);
      

      const entries = items.map((item: any) => {
        let entry = entryTemplate;
        entry = replaceEntryPlaceholders(entry, item, entryType);
        return entry;
      }).join('');
      

      const newSectionContent = sectionMatch[0] + entries;
      content = content.substring(0, sectionMatch.index!) + 
                newSectionContent + 
                content.substring(sectionEnd);
    };
    

    if (userData.experiences && userData.experiences.length > 0) {
      processSection('EXPERIENCE', userData.experiences, 'experience');
    }
    
    if (userData.projects && userData.projects.length > 0) {
      processSection('PROJECTS', userData.projects, 'project');
    }
    
    if (userData.education && userData.education.length > 0) {
      processSection('EDUCATION', userData.education, 'education');
    }
    
    if (userData.publications && userData.publications.length > 0) {
      processSection('PUBLICATIONS', userData.publications, 'publication');
    }
    
    if (userData.certifications && userData.certifications.length > 0) {
      processSection('CERTIFICATIONS', userData.certifications, 'certification');
    }
    
    if (userData.achievements && userData.achievements.length > 0) {
      processSection('ACHIEVEMENTS', userData.achievements, 'achievement');
    }
    

    if (userData.skills && userData.skills.length > 0) {
      const skillsSectionPattern = /(<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>SKILLS<\/strong><\/span><\/p><hr[^>]*>|<p[^>]*><span[^>]*><strong>SKILLS<\/strong><\/span><\/p><hr[^>]*>)([\s\S]*?)(?=<p[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|PROJECTS|EDUCATION|PUBLICATIONS|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>|<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|PROJECTS|EDUCATION|PUBLICATIONS|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>|$)/i;
      const skillsSectionMatch = content.match(skillsSectionPattern);
      
      if (skillsSectionMatch) {
        const sectionHeader = skillsSectionMatch[1];
        
        const skillsByCategory: Record<string, string[]> = {};
        userData.skills.forEach((skill: any) => {
          const categoryName = skill.category?.name || 'Other';
          if (!skillsByCategory[categoryName]) {
            skillsByCategory[categoryName] = [];
          }
          skillsByCategory[categoryName].push(skill.name);
        });
        
        const skillsHtml = Object.entries(skillsByCategory)
          .map(([category, skillNames]) => {
            return `<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>${category}:</strong> ${skillNames.join(', ')}</span></p>`;
          })
          .join('');
        
        content = content.replace(skillsSectionPattern, sectionHeader + skillsHtml);
      }
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
                const cgpa = edu.cgpa ? `${edu.cgpa}` : '';
                return `<h3><span style="font-family: &quot;Times New Roman&quot;, serif;">${university}, ${location}</span></h3><p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>${degree}</strong></span></p><p><span style="font-family: &quot;Times New Roman&quot;, serif;"><em>${fromDate} - ${endDate}</em>${cgpa ? ` | ${cgpa}` : ''}</span></p>`;
              }).join('')
            : '<h3><span style="font-family: &quot;Times New Roman&quot;, serif;">[UNIVERSITY NAME], [LOCATION]</span></h3><p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>[DEGREE TYPE] in [FIELD OF STUDY]</strong></span></p><p><span style="font-family: &quot;Times New Roman&quot;, serif;"><em>[START DATE] - [END DATE]</em> | [CGPA]</span></p>';

          
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
            <ul><li><p data-spacing-after="0" style="margin-bottom: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">[DESCRIPTION]</span></p></li></ul>
            ${createSectionHeading("PROJECTS")}
            <h3><span style="font-size: 18px; font-family: &quot;Times New Roman&quot;, serif;">[PROJECT NAME]</span></h3>
            <p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>Technologies:</strong> [TECHNOLOGIES]</span></p>
            <p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>Link:</strong> [PROJECT LINK]</span></p>
            <ul><li><p data-spacing-after="0" style="margin-bottom: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">[DESCRIPTION]</span></p></li></ul>
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
        const cgpa = edu.cgpa ? ` | ${edu.cgpa}` : '';
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
    if (userDetails) {
      
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

      
      const staticSections = buildStaticSections(userDetails);

      
      const bio = profile.bio || '[SUMMARY]';
      const summarySection = `${createSectionHeading("SUMMARY")}<p><span style="font-family: &quot;Times New Roman&quot;, serif;">${bio}</span></p>`;
      
      
      const experienceSection = userDetails.experiences && userDetails.experiences.length > 0
        ? `${createSectionHeading("EXPERIENCE")}${userDetails.experiences.map((exp: any) => {
            const company = exp.company_name || '[COMPANY NAME]';
            const role = exp.role || exp.job_title || '[JOB TITLE]';
            const loc = exp.location || '[LOCATION]';
            const startDate = exp.start_date ? formatDate(exp.start_date) : '[START DATE]';
            const endDate = exp.end_date ? formatDate(exp.end_date) : 'Present';
            const techStack = exp.skills && Array.isArray(exp.skills) ? exp.skills.join(', ') : '[TECHNOLOGIES]';
            const description = exp.description || '[DESCRIPTION]';
            

            const bulletPoints = description
              .split('\n')
              .map((line: string) => line.replace(/^●\s*/, '').trim())
              .filter((line: string) => line.length > 0);
            
            const listItems = bulletPoints.length > 0
              ? bulletPoints.map((point: string) => 
                  `<li><p data-spacing-after="0" style="margin-bottom: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">${point}</span></p></li>`
                ).join('')
              : `<li><p data-spacing-after="0" style="margin-bottom: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">${description}</span></p></li>`;
            
            return `<h3><span style="font-size: 18px; font-family: &quot;Times New Roman&quot;, serif;">${company}, ${role}, ${loc}</span></h3><p><span style="font-family: &quot;Times New Roman&quot;, serif;"><em>${startDate} - ${endDate}</em></span></p><p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>Tech Stack:</strong> ${techStack}</span></p><ul>${listItems}</ul>`;
          }).join('')}`
        : `${createSectionHeading("EXPERIENCE")}<h3><span style="font-size: 18px; font-family: &quot;Times New Roman&quot;, serif;">[COMPANY NAME], [JOB TITLE], [LOCATION]</span></h3><p><span style="font-family: &quot;Times New Roman&quot;, serif;"><em>[START DATE] - [END DATE]</em></span></p><p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>Tech Stack:</strong> [TECHNOLOGIES]</span></p><ul><li><p data-spacing-after="0" style="margin-bottom: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">[DESCRIPTION]</span></p></li></ul>`;
      
      
      const projectsSection = userDetails.projects && userDetails.projects.length > 0
        ? `${createSectionHeading("PROJECTS")}${userDetails.projects.map((proj: any) => {
            const name = proj.name || proj.project_name || '[PROJECT NAME]';
            const tech = (proj.technologies && Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.tech_stack) || '[TECHNOLOGIES]';
            
            const liveLink = proj.links && Array.isArray(proj.links) 
              ? proj.links.find((link: any) => link.type === 'liveurl')
              : null;
            const link = liveLink ? liveLink.url : '[PROJECT LINK]';
            
            const description = proj.description || '[DESCRIPTION]';
            

            const bulletPoints = description
              .split('\n')
              .map((line: string) => line.replace(/^●\s*/, '').trim())
              .filter((line: string) => line.length > 0);
            
            const listItems = bulletPoints.length > 0
              ? bulletPoints.map((point: string) => 
                  `<li><p data-spacing-after="0" style="margin-bottom: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">${point}</span></p></li>`
                ).join('')
              : `<li><p data-spacing-after="0" style="margin-bottom: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">${description}</span></p></li>`;
            
            return `<h3><span style="font-size: 18px; font-family: &quot;Times New Roman&quot;, serif;">${name}</span></h3><p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>Technologies:</strong> ${tech}</span></p>${link !== '[PROJECT LINK]' ? `<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>Link:</strong> ${link}</span></p>` : ''}<ul>${listItems}</ul>`;
          }).join('')}`
        : `${createSectionHeading("PROJECTS")}<h3><span style="font-size: 18px; font-family: &quot;Times New Roman&quot;, serif;">[PROJECT NAME]</span></h3><p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>Technologies:</strong> [TECHNOLOGIES]</span></p><p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>Link:</strong> [PROJECT LINK]</span></p><ul><li><p data-spacing-after="0" style="margin-bottom: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">[DESCRIPTION]</span></p></li></ul>`;
      
      
      const skillsSection = (() => {
        if (!userDetails.skills || userDetails.skills.length === 0) {
          return `${createSectionHeading("SKILLS")}<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>[SKILL CATEGORY]:</strong> [SKILLS]</span></p>`;
        }
        
        const skillsByCategory: Record<string, string[]> = {};
        userDetails.skills.forEach((skill: any) => {
          const categoryName = skill.category?.name || 'Other';
          if (!skillsByCategory[categoryName]) {
            skillsByCategory[categoryName] = [];
          }
          skillsByCategory[categoryName].push(skill.name);
        });
        
        const skillsHtml = Object.entries(skillsByCategory)
          .map(([category, skillNames]) => {
            return `<p><span style="font-family: &quot;Times New Roman&quot;, serif;"><strong>${category}:</strong> ${skillNames.join(', ')}</span></p>`;
          })
          .join('');
        
        return `${createSectionHeading("SKILLS")}${skillsHtml}`;
      })();
      
      
      const combinedContent = `${headerSection}\n\n${summarySection}\n\n${experienceSection}\n\n${projectsSection}\n\n${skillsSection}\n\n${staticSections}`;
      
      
      if (savedTemplate && Object.keys(sections).length === 0) {
        
        let templateWithData = replacePlaceholdersWithData(savedTemplate, userDetails);
        
        templateWithData = formatDatesInContent(templateWithData);
        setResumeContent(templateWithData);
      } else {


        let templateWithData = replacePlaceholdersWithData(savedTemplate || TEMPLATE_RESUME_CONTENT, userDetails);
        templateWithData = formatDatesInContent(templateWithData);
        setResumeContent(templateWithData);
      }
    }
  }, [userDetails, savedTemplate, sections]);

  
  const convertToHtmlBullets = (text: string): string => {
    if (!text) return '';
    
    
    const points = text.split('\n').filter(line => line.trim().length > 0);
    
    if (points.length === 0) return '';
    
    
    const listItems = points.map(point => {
      const trimmedPoint = point.trim();
      
      const cleanPoint = trimmedPoint.replace(/^[●•\-\*]\s*/, '');
      return `<li><p data-spacing-after="0" style="margin-bottom: 0px;"><span style="font-family: &quot;Times New Roman&quot;, serif;">${cleanPoint}</span></p></li>`;
    }).join('');
    
    return `<ul>${listItems}</ul>`;
  };

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
                
                const sectionKey = data.section === 'experience' || data.section === 'project' 
                  ? `${data.section}_${data.index || 0}`
                  : data.section;
                
                setSections((prev) => ({
                  ...prev,
                  [sectionKey]: {
                    title: data.title,
                    content: data.content,
                    section: data.section,
                    company_name: data.company_name,
                    project_name: data.project_name,
                    index: data.index,
                  },
                }));
                
                
                if (data.section === 'summary' && data.content) {
                  
                  setUserDetails((prevDetails: any) => {
                    if (!prevDetails) return prevDetails;
                    
                    
                    const updatedDetails = {
                      ...prevDetails,
                      userProfile: {
                        ...prevDetails.userProfile,
                        bio: data.content,
                      },
                    };
                    
                    
                    
                    
                    const template = savedTemplate || TEMPLATE_RESUME_CONTENT;
                    let contentWithData = replacePlaceholdersWithData(template, updatedDetails);
                    contentWithData = formatDatesInContent(contentWithData);
                    setResumeContent(contentWithData);
                    
                    return updatedDetails;
                  });
                } else if (data.section === 'experience' && data.content && typeof data.index === 'number') {
                  
                  setUserDetails((prevDetails: any) => {
                    if (!prevDetails || !prevDetails.experiences) return prevDetails;
                    
                    
                    const updatedExperiences = [...prevDetails.experiences];
                    if (updatedExperiences[data.index]) {
                      updatedExperiences[data.index] = {
                        ...updatedExperiences[data.index],
                        description: data.content,
                      };
                    }
                    
                    
                    const updatedDetails = {
                      ...prevDetails,
                      experiences: updatedExperiences,
                    };
                    
                    
                    const template = savedTemplate || TEMPLATE_RESUME_CONTENT;
                    let contentWithData = replacePlaceholdersWithData(template, updatedDetails);
                    contentWithData = formatDatesInContent(contentWithData);
                    setResumeContent(contentWithData);
                    
                    return updatedDetails;
                  });
                } else if (data.section === 'project' && data.content && typeof data.index === 'number') {

                  
                  setUserDetails((prevDetails: any) => {
                    if (!prevDetails || !prevDetails.projects) return prevDetails;
                    
                    
                    const updatedProjects = [...prevDetails.projects];
                    if (updatedProjects[data.index]) {
                      updatedProjects[data.index] = {
                        ...updatedProjects[data.index],
                        description: data.content,
                      };
                    }
                    
                    
                    const updatedDetails = {
                      ...prevDetails,
                      projects: updatedProjects,
                    };
                    
                    
                    const template = savedTemplate || TEMPLATE_RESUME_CONTENT;
                    let contentWithData = replacePlaceholdersWithData(template, updatedDetails);
                    contentWithData = formatDatesInContent(contentWithData);
                    setResumeContent(contentWithData);
                    
                    return updatedDetails;
                  });
                }
                
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
    

    const allowedTags = ['h3', 'h1', 'h2', 'p', 'em'];
    

    const replaceValueInAllowedTags = (
      content: string,
      value: string,
      placeholder: string,
      tags: string[] = allowedTags
    ): string => {
      if (!value) return content;
      
      const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      for (const tag of tags) {

        const tagPattern = new RegExp(`(<${tag}[^>]*>)([\\s\\S]*?)(<\\/${tag}>)`, 'gi');
        
        content = content.replace(tagPattern, (match, openTag, tagContent, closeTag) => {

          if (new RegExp(escapedValue, 'i').test(tagContent)) {

            const updatedContent = tagContent.replace(new RegExp(escapedValue, 'gi'), placeholder);
            return openTag + updatedContent + closeTag;
          }
          return match;
        });
      }
      
      return content;
    };
    

    const extractTextContent = (html: string): string => {
      return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
    };
    

    const replaceValueInNestedStructures = (
      content: string,
      value: string,
      placeholder: string,
      structurePattern: RegExp
    ): string => {
      if (!value) return content;
      
      const cleanValue = extractTextContent(value).replace(/\n/g, ' ').replace(/●\s*/g, '').replace(/\s+/g, ' ').trim();
      
      return content.replace(structurePattern, (match, openTags, innerContent, closeTags) => {
        const cleanInner = extractTextContent(innerContent);
        

        const lengthDiff = Math.abs(cleanInner.length - cleanValue.length);
        const maxLength = Math.max(cleanInner.length, cleanValue.length);
        
        if (lengthDiff / maxLength < 0.2 || 
            cleanInner === cleanValue || 
            cleanInner.includes(cleanValue) || 
            cleanValue.includes(cleanInner) ||
            (cleanInner.length > 50 && cleanValue.length > 50 && 
             (cleanInner.substring(0, 50) === cleanValue.substring(0, 50) || 
              cleanInner.substring(cleanInner.length - 50) === cleanValue.substring(cleanValue.length - 50)))) {
          return openTags + placeholder + closeTags;
        }
        return match;
      });
    };
    
    if (profile.name) {
      const name = profile.name.toUpperCase();
      template = template.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[NAME]');
    }
    
    
    const city = profile.city || '';
    const state = profile.state || profile.province || '';
    const location = [city, state].filter(Boolean).join(', ');
    


    if (city) {

      if (location && state) {

        template = template.replace(new RegExp(`${location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\|`, 'gi'), '[CITY], [STATE/PROVINCE] |');
      } else if (city) {


        const cityEscaped = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        template = template.replace(new RegExp(`${cityEscaped}\\s*\\|`, 'gi'), '[CITY] |');

        template = template.replace(new RegExp(`${cityEscaped}(?=\\s*\\|\\s*\\[PHONE\\])`, 'gi'), '[CITY]');

        template = template.replace(new RegExp(`(<p[^>]*>.*?)${cityEscaped}(.*?\\|.*?</p>)`, 'gi'), '$1[CITY]$2');
      }
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
    
    
    if (profile.bio) {

      const bioText = profile.bio.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      template = template.replace(new RegExp(bioText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[SUMMARY]');

      const bioEscaped = profile.bio.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      if (bioEscaped !== profile.bio) {
        template = template.replace(new RegExp(bioEscaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[SUMMARY]');
      }

      const summaryPattern = /(<p[^>]*><span[^>]*>)(.*?)(<\/span><\/p>)/gi;
      template = template.replace(summaryPattern, (match, openTag, content, closeTag) => {

        const cleanContent = content.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
        const cleanBio = profile.bio.replace(/\s+/g, ' ').trim();
        if (cleanContent === cleanBio || cleanContent.includes(cleanBio) || cleanBio.includes(cleanContent)) {
          return openTag + '[SUMMARY]' + closeTag;
        }
        return match;
      });
    }
    
    
    if (userDetails.experiences && userDetails.experiences.length > 0) {
      const firstExp = userDetails.experiences[0];
      
      const experienceSectionPattern = /(<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>EXPERIENCE<\/strong><\/span><\/p><hr[^>]*>|<p[^>]*><span[^>]*><strong>EXPERIENCE<\/strong><\/span><\/p><hr[^>]*>)([\s\S]*?)(?=<p[^>]*><span[^>]*><strong>(?:SUMMARY|PROJECTS|SKILLS|EDUCATION|PUBLICATIONS|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>|<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>(?:SUMMARY|PROJECTS|SKILLS|EDUCATION|PUBLICATIONS|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>|$)/i;
      const experienceSectionMatch = template.match(experienceSectionPattern);
      
      if (experienceSectionMatch) {
        const experienceContent = experienceSectionMatch[2];
        

        const experienceEntryPattern = new RegExp(
          `(<(?:${allowedTags.join('|')})[^>]*>.*?<\\/(?:${allowedTags.join('|')})>[\\s\\S]*?<ul>[\\s\\S]*?<\\/ul>)`,
          'gi'
        );
        const experienceEntries = experienceContent.match(experienceEntryPattern);
        
        if (experienceEntries && experienceEntries.length > 0) {
          let firstEntryTemplate = experienceEntries[0];
          

          if (firstExp.company_name) {
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, firstExp.company_name, '[COMPANY NAME]');
          }
          

          if (firstExp.role || firstExp.job_title) {
            const role = firstExp.role || firstExp.job_title;
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, role, '[JOB TITLE]');
          }
          

          if (firstExp.location) {
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, firstExp.location, '[LOCATION]');
          }
          

          if (firstExp.start_date) {
            const formattedStart = formatDate(firstExp.start_date);
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, formattedStart, '[START DATE]');

            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, firstExp.start_date, '[START DATE]');
          }
          
          if (firstExp.end_date) {
            const formattedEnd = formatDate(firstExp.end_date);
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, formattedEnd, '[END DATE]');

            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, firstExp.end_date, '[END DATE]');
          } else {
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, 'Present', '[END DATE]');
          }
          

          if (firstExp.skills && Array.isArray(firstExp.skills)) {
            const techStack = firstExp.skills.join(', ');
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, techStack, '[TECHNOLOGIES]');
          }
          

          if (firstExp.description) {
            const descPattern = /(<ul>[\s\S]*?<li>[\s\S]*?<p[^>]*>[\s\S]*?<span[^>]*>)([\s\S]*?)(<\/span>[\s\S]*?<\/p>[\s\S]*?<\/li>[\s\S]*?<\/ul>)/gi;
            firstEntryTemplate = replaceValueInNestedStructures(firstEntryTemplate, firstExp.description, '[DESCRIPTION]', descPattern);
            

            if (!firstEntryTemplate.includes('[DESCRIPTION]')) {
              firstEntryTemplate = firstEntryTemplate.replace(/(<ul>[\s\S]*?<li>[\s\S]*?<p[^>]*>[\s\S]*?<span[^>]*>)[\s\S]*?(<\/span>[\s\S]*?<\/p>[\s\S]*?<\/li>[\s\S]*?<\/ul>)/gi, '$1[DESCRIPTION]$2');
            }
            
            firstEntryTemplate = firstEntryTemplate.replace(/(<ul>)([\s\S]*?)(<\/ul>)/gi, (match, openUl, ulContent, closeUl) => {
              const liPattern = /(<li>[\s\S]*?<\/li>)/gi;
              const listItems = ulContent.match(liPattern) || [];
              
              if (listItems.length > 0) {
                let firstLi = listItems[0];
                
                if (!firstLi.includes('[DESCRIPTION]')) {
                  firstLi = firstLi.replace(/(<li>[\s\S]*?<p[^>]*>[\s\S]*?<span[^>]*>)([\s\S]*?)(<\/span>[\s\S]*?<\/p>[\s\S]*?<\/li>)/gi, 
                    (liMatch: string, openTags: string, content: string, closeTags: string) => {
                      return openTags + '[DESCRIPTION]' + closeTags;
                    });
                }
                
                return openUl + firstLi + closeUl;
              }
              
              return match;
            });
          }
          

          if (experienceEntries.length > 1) {
            let isFirst = true;
            const newExperienceContent = experienceContent.replace(experienceEntryPattern, (match) => {
              if (isFirst) {
                isFirst = false;
                return firstEntryTemplate;
              }
              return '';
            });
            
            template = template.replace(experienceSectionPattern, (match, header) => {
              return header + newExperienceContent;
            });
          } else {
            template = template.replace(experienceSectionPattern, (match, header) => {
              return header + firstEntryTemplate;
            });
          }
        }
      }
    }
    
    
    if (userDetails.projects && userDetails.projects.length > 0) {
      const firstProj = userDetails.projects[0];
      
      const projectsSectionPattern = /(<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>PROJECTS<\/strong><\/span><\/p><hr[^>]*>|<p[^>]*><span[^>]*><strong>PROJECTS<\/strong><\/span><\/p><hr[^>]*>)([\s\S]*?)(?=<p[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|SKILLS|EDUCATION|PUBLICATIONS|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>|<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|SKILLS|EDUCATION|PUBLICATIONS|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>|$)/i;
      const projectsSectionMatch = template.match(projectsSectionPattern);
      
      if (projectsSectionMatch) {
        const projectsContent = projectsSectionMatch[2];
        

        const projectEntryPattern = new RegExp(
          `(<(?:${allowedTags.join('|')})[^>]*>.*?<\\/(?:${allowedTags.join('|')})>[\\s\\S]*?<ul>[\\s\\S]*?<\\/ul>)`,
          'gi'
        );
        const projectEntries = projectsContent.match(projectEntryPattern);
        
        if (projectEntries && projectEntries.length > 0) {
          let firstEntryTemplate = projectEntries[0];
          

          if (firstProj.name || firstProj.project_name) {
            const name = firstProj.name || firstProj.project_name;
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, name, '[PROJECT NAME]');
          }
          

          if (firstProj.technologies || firstProj.tech_stack) {
            const tech = Array.isArray(firstProj.technologies) 
              ? firstProj.technologies.join(', ')
              : (firstProj.tech_stack || '');
            if (tech) {
              firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, tech, '[TECHNOLOGIES]');
            }
          }
          

          const liveLink = firstProj.links && Array.isArray(firstProj.links) 
            ? firstProj.links.find((link: any) => link.type === 'liveurl')
            : null;
          const link = liveLink ? liveLink.url : (firstProj.link || firstProj.project_link || '');
          if (link) {
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, link, '[PROJECT LINK]');
          }
          

          if (firstProj.description) {
            const desc = firstProj.description.replace(/\n/g, '').replace(/●\s*/g, '').trim();
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, desc, '[DESCRIPTION]');

            const descPattern = /(<ul>[\s\S]*?<li>[\s\S]*?<p[^>]*>[\s\S]*?<span[^>]*>)([\s\S]*?)(<\/span>[\s\S]*?<\/p>[\s\S]*?<\/li>[\s\S]*?<\/ul>)/gi;
            firstEntryTemplate = replaceValueInNestedStructures(firstEntryTemplate, firstProj.description, '[DESCRIPTION]', descPattern);
            
            firstEntryTemplate = firstEntryTemplate.replace(/(<ul>)([\s\S]*?)(<\/ul>)/gi, (match, openUl, ulContent, closeUl) => {

              const liPattern = /(<li>[\s\S]*?<\/li>)/gi;
              const listItems = ulContent.match(liPattern) || [];
              
              if (listItems.length > 0) {
                let firstLi = listItems[0];
                
                if (!firstLi.includes('[DESCRIPTION]')) {
                  firstLi = firstLi.replace(/(<li>[\s\S]*?<p[^>]*>[\s\S]*?<span[^>]*>)([\s\S]*?)(<\/span>[\s\S]*?<\/p>[\s\S]*?<\/li>)/gi, 
                    (liMatch: string, openTags: string, content: string, closeTags: string) => {
                      return openTags + '[DESCRIPTION]' + closeTags;
                    });
                }
                
                return openUl + firstLi + closeUl;
              }
              
              return match;
            });
          }
          

          if (projectEntries.length > 1) {
            let isFirst = true;
            const newProjectsContent = projectsContent.replace(projectEntryPattern, (match) => {
              if (isFirst) {
                isFirst = false;
                return firstEntryTemplate;
              }
              return '';
            });
            
            template = template.replace(projectsSectionPattern, (match, header) => {
              return header + newProjectsContent;
            });
          } else {
            template = template.replace(projectsSectionPattern, (match, header) => {
              return header + firstEntryTemplate;
            });
          }
        }
      }
    }
    
    

    const skillsSectionPattern = /(<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>SKILLS<\/strong><\/span><\/p><hr[^>]*>|<p[^>]*><span[^>]*><strong>SKILLS<\/strong><\/span><\/p><hr[^>]*>)([\s\S]*?)(?=<p[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|PROJECTS|EDUCATION|PUBLICATIONS|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>|<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|PROJECTS|EDUCATION|PUBLICATIONS|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>|$)/i;
    const skillsSectionMatch = template.match(skillsSectionPattern);
    
    if (skillsSectionMatch) {
      const skillsContent = skillsSectionMatch[2];
      

      const skillEntryPattern = new RegExp(
        `(<(?:${allowedTags.join('|')})[^>]*><span[^>]*><strong>.*?:<\/strong>.*?<\/span><\/(?:${allowedTags.join('|')})>)`,
        'gi'
      );
      const skillEntries = skillsContent.match(skillEntryPattern);
      
      if (skillEntries && skillEntries.length > 0) {
        let firstEntryTemplate = skillEntries[0];
        


        const categoryMatch = firstEntryTemplate.match(/<strong>([^<]*?):<\/strong>/i);
        if (categoryMatch && categoryMatch[1]) {
          const categoryName = categoryMatch[1].trim();
          firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, categoryName, '[SKILL CATEGORY]');
        }
        

        const fullMatch = firstEntryTemplate.match(/<strong>.*?<\/strong>\s*([\s\S]*?)\s*<\/span><\/(?:p|h3|h1)>/i);
        if (fullMatch && fullMatch[1]) {
          const skillsList = fullMatch[1].trim();

          if (!skillsList.includes('[SKILLS]') && skillsList) {
            firstEntryTemplate = firstEntryTemplate.replace(
              new RegExp(skillsList.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
              '[SKILLS]'
            );
          }
        }
        

        if (skillEntries.length > 1) {
          let isFirst = true;
          const newSkillsContent = skillsContent.replace(skillEntryPattern, (match) => {
            if (isFirst) {
              isFirst = false;
              return firstEntryTemplate;
            }
            return '';
          });
          
          template = template.replace(skillsSectionPattern, (match, header) => {
            return header + newSkillsContent;
          });
        } else {
          template = template.replace(skillsSectionPattern, (match, header) => {
            return header + firstEntryTemplate;
          });
        }
      }
    }
    
    
    if (userDetails.education && userDetails.education.length > 0) {
      const firstEdu = userDetails.education[0];
      
      const educationSectionPattern = /(<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>EDUCATION<\/strong><\/span><\/p><hr[^>]*>|<p[^>]*><span[^>]*><strong>EDUCATION<\/strong><\/span><\/p><hr[^>]*>)([\s\S]*?)(?=<p[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|PROJECTS|SKILLS|PUBLICATIONS|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>|<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|PROJECTS|SKILLS|PUBLICATIONS|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>|$)/i;
      const educationSectionMatch = template.match(educationSectionPattern);
      
      if (educationSectionMatch) {
        const educationContent = educationSectionMatch[2];
        




        const educationEntryPattern = new RegExp(
          `(<(?:${allowedTags.join('|')})[^>]*>.*?<\\/(?:${allowedTags.join('|')})>[\\s\\S]*?)(?=<h3[^>]*>|$)`,
          'gi'
        );
        const educationEntries: string[] = [];
        let match;
        while ((match = educationEntryPattern.exec(educationContent)) !== null) {
          educationEntries.push(match[1]);
        }
        
        if (educationEntries && educationEntries.length > 0) {
          let firstEntryTemplate = educationEntries[0];
          

          if (firstEdu.university_name) {
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, firstEdu.university_name, '[UNIVERSITY NAME]');
          }
          

          if (firstEdu.location) {
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, firstEdu.location, '[LOCATION]');
          }
          

          if (firstEdu.degree) {
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, firstEdu.degree, '[DEGREE TYPE] in [FIELD OF STUDY]');
          }
          

          if (firstEdu.from_date) {
            const formattedStart = formatDate(firstEdu.from_date);
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, formattedStart, '[START DATE]');
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, firstEdu.from_date, '[START DATE]');
          }
          
          if (firstEdu.end_date) {
            const formattedEnd = formatDate(firstEdu.end_date);
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, formattedEnd, '[END DATE]');
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, firstEdu.end_date, '[END DATE]');
          } else {
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, 'Present', '[END DATE]');
          }
          

          if (firstEdu.cgpa) {
            const cgpaValue = firstEdu.cgpa.toString();

            firstEntryTemplate = firstEntryTemplate.replace(new RegExp(`CGPA:?\\s*${cgpaValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), '[CGPA]');

            firstEntryTemplate = firstEntryTemplate.replace(new RegExp(`CGPA\\s+${cgpaValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), 'CGPA [CGPA]');

            firstEntryTemplate = firstEntryTemplate.replace(new RegExp(`(CGPA[^:]*?)\\s*${cgpaValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), '$1 [CGPA]');

            firstEntryTemplate = firstEntryTemplate.replace(new RegExp(`CGPA[^<]*?${cgpaValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*?`, 'gi'), '[CGPA]');
          }
          


          firstEntryTemplate = firstEntryTemplate.replace(/(<em>)((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\s*-\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|Present)(<\/em>)/gi, '$1[START DATE] - [END DATE]$4');

          firstEntryTemplate = firstEntryTemplate.replace(/CGPA[^<]*?\d+[^<]*?/gi, (match) => {
            if (!match.includes('[CGPA]')) {
              return '[CGPA]';
            }
            return match;
          });
          

          template = template.replace(educationSectionPattern, (match, header) => {
            return header + firstEntryTemplate;
          });
        }
      }
    }
    
    
    if (userDetails.publications && userDetails.publications.length > 0) {
      const firstPub = userDetails.publications[0];
      
      const publicationsSectionPattern = /(<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>PUBLICATIONS<\/strong><\/span><\/p><hr[^>]*>|<p[^>]*><span[^>]*><strong>PUBLICATIONS<\/strong><\/span><\/p><hr[^>]*>)([\s\S]*?)(?=<p[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|PROJECTS|SKILLS|EDUCATION|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>|<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|PROJECTS|SKILLS|EDUCATION|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>|$)/i;
      const publicationsSectionMatch = template.match(publicationsSectionPattern);
      
      if (publicationsSectionMatch) {
        const publicationsContent = publicationsSectionMatch[2];
        

        const publicationEntryPattern = /(<(?:p|h3|h1)[^>]*><span[^>]*><strong>.*?<\/strong>.*?<\/span><\/(?:p|h3|h1)>\s*<(?:p|h3|h1)[^>]*><span[^>]*>.*?<\/span><\/(?:p|h3|h1)>)/gi;
        const publicationEntries = publicationsContent.match(publicationEntryPattern);
        
        if (publicationEntries && publicationEntries.length > 0) {
          let firstEntryTemplate = publicationEntries[0];
          

          if (firstPub.paper_name) {
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, firstPub.paper_name, '[PUBLICATION TITLE]');
          }
          

          const pubDetailsPattern = /(<(?:p|h3|h1)[^>]*><span[^>]*><strong>.*?<\/strong>.*?<\/span><\/(?:p|h3|h1)>\s*<(?:p|h3|h1)[^>]*><span[^>]*>)(.*?)(<\/span><\/(?:p|h3|h1)>)/gi;
          firstEntryTemplate = firstEntryTemplate.replace(pubDetailsPattern, (match, openTags, content, closeTags) => {

            if (content.includes('<strong>')) {
              return match;
            }
            

            const cleanContent = extractTextContent(content);
            

            const details = firstPub.description || firstPub.publisher || firstPub.date || '';
            if (details) {
              const cleanDetails = details.replace(/\s+/g, ' ').trim();

              if (cleanContent === cleanDetails || cleanContent.includes(cleanDetails) || cleanDetails.includes(cleanContent)) {
                return openTags + '[PUBLICATION DETAILS]' + closeTags;
              }
            }
            return match;
          });
          

          if (firstPub.description || firstPub.publisher || firstPub.date) {
            const details = firstPub.description || firstPub.publisher || firstPub.date || '';
            if (details && !firstEntryTemplate.includes('[PUBLICATION DETAILS]')) {
              firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, details, '[PUBLICATION DETAILS]');
            }
          }
          

          if (publicationEntries.length > 1) {
            let isFirst = true;
            const newPublicationsContent = publicationsContent.replace(publicationEntryPattern, (match) => {
              if (isFirst) {
                isFirst = false;
                return firstEntryTemplate;
              }
              return '';
            });
            
            template = template.replace(publicationsSectionPattern, (match, header) => {
              return header + newPublicationsContent;
            });
          } else {
            template = template.replace(publicationsSectionPattern, (match, header) => {
              return header + firstEntryTemplate;
            });
          }
        }
      }
    }
    
    
    if (userDetails.certifications && userDetails.certifications.length > 0) {
      const firstCert = userDetails.certifications[0];
      const certName = firstCert.name || firstCert.certification_name || '';
      
      const certificationsSectionPattern = /(<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>CERTIFICATIONS<\/strong><\/span><\/p><hr[^>]*>|<p[^>]*><span[^>]*><strong>CERTIFICATIONS<\/strong><\/span><\/p><hr[^>]*>)([\s\S]*?)(?=<p[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|PROJECTS|SKILLS|EDUCATION|PUBLICATIONS|ACHIEVEMENTS)<\/strong>|<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|PROJECTS|SKILLS|EDUCATION|PUBLICATIONS|ACHIEVEMENTS)<\/strong>|$)/i;
      const certificationsSectionMatch = template.match(certificationsSectionPattern);
      
      if (certificationsSectionMatch) {
        const certificationsContent = certificationsSectionMatch[2];
        

        const certificationEntryPattern = new RegExp(
          `(<(?:${allowedTags.join('|')})[^>]*><span[^>]*>.*?<\/span><\/(?:${allowedTags.join('|')})>)`,
          'gi'
        );
        const certificationEntries = certificationsContent.match(certificationEntryPattern);
        
        if (certificationEntries && certificationEntries.length > 0) {
          let firstEntryTemplate = certificationEntries[0];
          

          if (certName) {
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, certName, '[CERTIFICATION NAME]');
          }
          

          if (certificationEntries.length > 1) {
            let isFirst = true;
            const newCertificationsContent = certificationsContent.replace(certificationEntryPattern, (match) => {
              if (isFirst) {
                isFirst = false;
                return firstEntryTemplate;
              }
              return '';
            });
            
            template = template.replace(certificationsSectionPattern, (match, header) => {
              return header + newCertificationsContent;
            });
          } else {
            template = template.replace(certificationsSectionPattern, (match, header) => {
              return header + firstEntryTemplate;
            });
          }
        }
      } else {

        const seenValues = new Set<string>();
        userDetails.certifications.forEach((cert: any) => {
          const name = cert.name || cert.certification_name || '';
          if (name && !seenValues.has(name)) {
            template = replaceValueInAllowedTags(template, name, '[CERTIFICATION NAME]');
            seenValues.add(name);
          }
        });
      }
    }
    
    
    if (userDetails.achievements && userDetails.achievements.length > 0) {
      const firstAch = userDetails.achievements[0];
      
      const achievementsSectionPattern = /(<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>ACHIEVEMENTS<\/strong><\/span><\/p><hr[^>]*>|<p[^>]*><span[^>]*><strong>ACHIEVEMENTS<\/strong><\/span><\/p><hr[^>]*>)([\s\S]*?)(?=<p[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|PROJECTS|SKILLS|EDUCATION|PUBLICATIONS|CERTIFICATIONS)<\/strong>|<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>(?:SUMMARY|EXPERIENCE|PROJECTS|SKILLS|EDUCATION|PUBLICATIONS|CERTIFICATIONS)<\/strong>|$)/i;
      const achievementsSectionMatch = template.match(achievementsSectionPattern);
      
      if (achievementsSectionMatch) {
        const achievementsContent = achievementsSectionMatch[2];
        

        const achievementEntryPattern = new RegExp(
          `(<(?:${allowedTags.join('|')})[^>]*><span[^>]*>.*?<\/span><\/(?:${allowedTags.join('|')})>)`,
          'gi'
        );
        const achievementEntries = achievementsContent.match(achievementEntryPattern);
        
        if (achievementEntries && achievementEntries.length > 0) {
          let firstEntryTemplate = achievementEntries[0];
          

          if (firstAch.description) {
            firstEntryTemplate = replaceValueInAllowedTags(firstEntryTemplate, firstAch.description, '[ACHIEVEMENT DESCRIPTION]');
          }
          

          if (achievementEntries.length > 1) {
            let isFirst = true;
            const newAchievementsContent = achievementsContent.replace(achievementEntryPattern, (match) => {
              if (isFirst) {
                isFirst = false;
                return firstEntryTemplate;
              }
              return '';
            });
            
            template = template.replace(achievementsSectionPattern, (match, header) => {
              return header + newAchievementsContent;
            });
          } else {
            template = template.replace(achievementsSectionPattern, (match, header) => {
              return header + firstEntryTemplate;
            });
          }
        }
      }
    }
    


    const finalCity = profile.city || '';
    

    if (finalCity) {
      const cityEscaped = finalCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      template = template.replace(
        new RegExp(`(<p[^>]*>.*?<span[^>]*>)${cityEscaped}(\\s*\\|\\s*\\[PHONE\\]\\s*\\|\\s*\\[EMAIL\\].*?</span>.*?</p>)`, 'gi'),
        '$1[CITY]$2'
      );

      template = template.replace(
        new RegExp(`(<p[^>]*>.*?<span[^>]*>)${cityEscaped}(\\s*\\|.*?</span>.*?</p>)`, 'gi'),
        '$1[CITY]$2'
      );
    }
    

    if (userDetails.experiences && userDetails.experiences.length > 0) {
      const firstExp = userDetails.experiences[0];
      if (firstExp.description) {

        const expSectionPattern = /(<p[^>]*data-spacing-after[^>]*><span[^>]*><strong>EXPERIENCE<\/strong><\/span><\/p><hr[^>]*>)([\s\S]*?)(?=<p[^>]*><span[^>]*><strong>(?:SUMMARY|PROJECTS|SKILLS|EDUCATION|PUBLICATIONS|CERTIFICATIONS|ACHIEVEMENTS)<\/strong>|$)/i;
        template = template.replace(expSectionPattern, (match, header, content) => {


          let updatedContent = content;
          

          updatedContent = updatedContent.replace(
            /(<ul>[\s\S]*?<li>[\s\S]*?<p[^>]*>[\s\S]*?<span[^>]*>)([\s\S]*?)(<\/span>[\s\S]*?<\/p>[\s\S]*?<\/li>[\s\S]*?<\/ul>)/gi,
            (match: string, openTags: string, spanContent: string, closeTags: string) => {

              if (!spanContent.includes('[DESCRIPTION]')) {
                return openTags + '[DESCRIPTION]' + closeTags;
              }
              return match;
            }
          );
          
          return header + updatedContent;
        });
      }
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
      

      const userDetailsResponse = await fetch(`/api/user-details/${user.id}`);
      if (userDetailsResponse.ok) {
        const userData = await userDetailsResponse.json();
        setUserDetails(userData);
        

        const profile = userData.userProfile || {};
        const template = profile.resume_template;
        
        if (template) {
          setSavedTemplate(template);
          

          let contentWithData = replacePlaceholdersWithData(template, userData);
          contentWithData = formatDatesInContent(contentWithData);
          setResumeContent(contentWithData);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    }
  };

  const handleRestoreDefaultTemplate = async () => {
    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    try {
      setError(null);
      
      const response = await fetch('/api/restore-default-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setError(null);
      toast.success('Default template restored successfully!');
      

      const userDetailsResponse = await fetch(`/api/user-details/${user.id}`);
      if (userDetailsResponse.ok) {
        const userData = await userDetailsResponse.json();
        setUserDetails(userData);
        setSavedTemplate(null);

      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore default template");
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-white font-sans dark:bg-[#212121] p-4 lg:p-8">
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
            <div className="mt-6 space-y-2">
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <Alert
                    variant="default"
                    className="cursor-pointer flex items-center justify-between bg-gray-50 dark:bg-[#181818]"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-gray-600 dark:text-white" />
                      <AlertTitle className="text-gray-900 dark:text-gray-100">Generate Resume</AlertTitle>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-600 dark:text-white" />
                  </Alert>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="bg-white dark:bg-[#303030] p-4 space-y-2 rounded-b-md">
                    <AlertDescription className="text-gray-700 dark:text-gray-300">
                      When generating the resume, the editor will automatically replace the old content with the AI generated responses in real time.
                    </AlertDescription>
                    <AlertDescription className="text-gray-700 dark:text-gray-300">
                      You can view all AI generated responses in the "View All Generated Responses" dropdown in case required for formatting after generation.
                    </AlertDescription>
                    <AlertDescription className="text-gray-700 dark:text-gray-300">
                      Generating the resume may take a few minutes. Please stay on this page while it's processing; an error will be shown if the generation fails.
                    </AlertDescription>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>


            <div className="mt-6 space-y-2">
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                <Alert
                    variant="default"
                    className="cursor-pointer flex items-center justify-between bg-gray-50 dark:bg-[#181818]"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-gray-600 dark:text-white" />
                      <AlertTitle className="text-gray-900 dark:text-white">Editor Tips!</AlertTitle>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-600 dark:text-white" />
                  </Alert>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="bg-white dark:bg-[#303030] p-4 space-y-2 rounded-b-md">
                    <AlertDescription className="text-gray-700 dark:text-gray-300">
                      Save Template: You need to edit only the first entry of each section to save the template; it will automatically format the rest of the entries.
                    </AlertDescription>
                    <AlertDescription className="text-gray-700 dark:text-gray-300">
                      Select Function: This selects the nearest horizontal line to the cursor, as it can be difficult to select a horizontal line manually.
                    </AlertDescription>
                    <AlertDescription className="text-gray-700 dark:text-gray-300">
                      Editor Tips: Click on a tooltip to see what each function does. All toolbar functions have tooltips with descriptions.
                    </AlertDescription>
                  </div>
                </CollapsibleContent>
              </Collapsible>
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

            {/* Collapsible Responses Section */}
            {Object.keys(sections).length > 0 && (
              <Collapsible open={isResponsesOpen} onOpenChange={setIsResponsesOpen} className="mt-4">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between dark:bg-[#303030] dark:text-white"
                  >
                    <span>View All Generated Responses ({Object.keys(sections).length})</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isResponsesOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-4">
                  <div className="p-4 rounded-lg border bg-[#F9F9F9] dark:bg-[#303030] dark:border-zinc-700 space-y-4 max-h-[600px] overflow-y-auto">
                    {Object.entries(sections).map(([key, section]) => (
                      <div key={key} className="border-b dark:border-zinc-700 pb-4 last:border-b-0 last:pb-0">
                        <div className="font-semibold text-sm mb-2 text-zinc-700 dark:text-zinc-300">
                          {section.title}
                          {section.company_name && (
                            <span className="text-zinc-500 dark:text-zinc-400 ml-2">
                              ({section.company_name})
                            </span>
                          )}
                          {section.project_name && (
                            <span className="text-zinc-500 dark:text-zinc-400 ml-2">
                              ({section.project_name})
                            </span>
                          )}
                        </div>
                        <div 
                          className="text-sm text-zinc-600 dark:text-zinc-400 prose prose-sm dark:prose-invert max-w-none whitespace-pre-line"
                        >
                          {section.section === 'summary' ? (
                            <p>{section.content}</p>
                          ) : (
                            <div dangerouslySetInnerHTML={{ __html: convertToHtmlBullets(section.content) }} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
            {/* Resume Editor - Shows template by default, updates when sections are generated */}
            <div className="mt-6 space-y-2">
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
                onRestoreDefaultTemplate={handleRestoreDefaultTemplate}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}