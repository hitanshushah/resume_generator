"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useUserStore } from "@/store/userStore";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type {
  UserDetailsData,
} from "@/types/user-details";
import { CollapsibleSection } from "./components/CollapsibleSection";
import { EmptyState } from "./components/EmptyState";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export default function DetailsPage() {
  const { user, loading: userLoading } = useUser();
  const { user: storeUser } = useUserStore();

  const currentUser = user || storeUser;
  const [data, setData] = useState<UserDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    projects: false,
    experience: false,
    education: false,
    skills: false,
    certifications: false,
    achievements: false,
    publications: false,
  });

  useEffect(() => {
    
    if (userLoading) {
      return;
    }

    const fetchUserDetails = async () => {
      if (!currentUser?.id) {
        setError("User not found. Please log in.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/user-details/${currentUser.id}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch user details: ${response.status}`);
        }

        const userData = await response.json();
        setData(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch user details");
        console.error("Error fetching user details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [currentUser?.id, userLoading]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Present";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });
    } catch {
      return dateString;
    }
  };

  const getInitials = (name: string | null, username: string) => {
    if (name) return name.substring(0, 2).toUpperCase();
    if (username) return username.substring(0, 2).toUpperCase();
    return "U";
  };

  if (loading) {
    return (
      <div className="mx-auto p-4 sm:p-8 space-y-6 bg-white dark:bg-[#212121] min-h-screen">
        <Skeleton className="h-32 w-full bg-gray-200 dark:bg-[#303030]" />
        <Skeleton className="h-64 w-full bg-gray-200 dark:bg-[#303030]" />
        <Skeleton className="h-64 w-full bg-gray-200 dark:bg-[#303030]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto p-4 sm:p-8 bg-white dark:bg-[#212121] min-h-screen">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto p-4 sm:p-8 bg-white dark:bg-[#212121] min-h-screen">
        <Alert className="bg-white dark:bg-[#303030] border-gray-200 dark:border-gray-700">
          <AlertDescription className="text-gray-700 dark:text-gray-300">No data available</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { userProfile, projects, certifications, achievements, experiences, publications, skills, education } = data;

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = process.env.NEXT_PUBLIC_WEBBSTYLE_URL || "https://admin.webbstyle.com/pricing";
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };


  return (
    <div className="mx-auto p-4 sm:p-8 space-y-6 bg-white dark:bg-[#212121] min-h-screen">
      {/* Profile Header */}
      <Card className="bg-white dark:bg-[#303030] border-gray-200 dark:border-gray-700">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
              {userProfile.profile_photo_url ? (
                <AvatarImage src={userProfile.profile_photo_url} alt={userProfile.name || userProfile.username} />
              ) : null}
              <AvatarFallback className="text-xl sm:text-2xl bg-gray-100 dark:bg-[#404040] text-gray-900 dark:text-white">
                {getInitials(userProfile.name, userProfile.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2 w-full min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-2xl sm:text-3xl text-gray-900 dark:text-white break-words">{userProfile.name || userProfile.username}</CardTitle>
                  {userProfile.designation && (
                    <CardDescription className="text-base sm:text-lg text-gray-600 dark:text-gray-300">{userProfile.designation}</CardDescription>
                  )}
                </div>
                <Button
                  onClick={handleAddClick}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#404040] flex-shrink-0"
                >
                  <Pencil className="h-4 w-4 text-gray-600 dark:text-white" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </div>
              {userProfile.bio && <p className="text-sm sm:text-base text-muted-foreground dark:text-gray-300 break-words">{userProfile.bio}</p>}
              <div className="flex flex-wrap gap-2">
                {userProfile.city && <Badge variant="outline" className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">{userProfile.city}</Badge>}
                {userProfile.province && <Badge variant="outline" className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">{userProfile.province}</Badge>}
                {userProfile.country && <Badge variant="outline" className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">{userProfile.country}</Badge>}
              </div>
              {userProfile.links && userProfile.links.length > 0 && (
                <div className="flex flex-wrap flex-col gap-2 pt-2">
                  {userProfile.links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary dark:text-blue-400 hover:underline break-all"
                    >
                      {link.title} - {link.url}
                    </a>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap pt-2 gap-2 sm:gap-4">
                {userProfile.email && <Badge variant="outline" className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs sm:text-sm break-all">{userProfile.email}</Badge>}
                {userProfile.phone_number && <Badge variant="outline" className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs sm:text-sm">{userProfile.phone_number}</Badge>}
              </div>
            </div>
          </div>
        </CardHeader>
        {userProfile.introduction && (
          <CardContent>
            <Separator className="my-4 bg-gray-200 dark:bg-gray-700" />
            <p className="text-muted-foreground dark:text-gray-300 whitespace-pre-wrap">{userProfile.introduction}</p>
          </CardContent>
        )}
      </Card>

      {/* Projects Section */}
      <CollapsibleSection
        title="Projects"
        isOpen={openSections.projects}
        onToggle={(open) => setOpenSections({ ...openSections, projects: open })}
      >
        {projects && projects.length > 0 ? (
          <div className="space-y-4">
            {projects.map((project) => (
              <Card key={project.id} className="bg-white dark:bg-[#303030] border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-gray-900 dark:text-white">{project.name}</CardTitle>
                      {project.category && (
                        <CardDescription className="mt-1 text-gray-600 dark:text-gray-300">
                          {project.category} {project.status && `• ${project.status}`}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.description && <p className="text-muted-foreground dark:text-gray-300">{project.description}</p>}
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.technologies.map((tech, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-gray-100 dark:bg-[#404040] text-gray-700 dark:text-gray-300">{tech}</Badge>
                      ))}
                    </div>
                  )}
                  {project.links && project.links.length > 0 && (
                    <div className="flex flex-col flex-wrap gap-2">
                      {project.links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary dark:text-blue-400 hover:underline break-all"
                        >
                          {link.title} - {link.url}
                        </a>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState sectionName="project" />
        )}
      </CollapsibleSection>

      {/* Experience Section */}
      <CollapsibleSection
        title="Experience"
        isOpen={openSections.experience}
        onToggle={(open) => setOpenSections({ ...openSections, experience: open })}
      >
        {experiences && experiences.length > 0 ? (
          <div className="space-y-4">
            {experiences.map((exp) => (
              <Card key={exp.id} className="bg-white dark:bg-[#303030] border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-gray-900 dark:text-white break-words">{exp.role}</CardTitle>
                      <CardDescription className="mt-1 text-gray-600 dark:text-gray-300 break-words">{exp.company_name}</CardDescription>
                      {exp.location && <CardDescription className="text-gray-600 dark:text-gray-300 break-words">{exp.location}</CardDescription>}
                    </div>
                    <div className="text-sm text-muted-foreground dark:text-gray-300 whitespace-nowrap flex-shrink-0">
                      {formatDate(exp.start_date)} - {formatDate(exp.end_date)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {exp.description && (
                    <p className="text-muted-foreground dark:text-gray-300 whitespace-pre-wrap">{exp.description}</p>
                  )}
                 {exp.skills && exp.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {exp.skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-gray-100 dark:bg-[#404040] text-gray-700 dark:text-gray-300">{skill}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState sectionName="experience" />
        )}
      </CollapsibleSection>

      {/* Education Section */}
      <CollapsibleSection
        title="Education"
        isOpen={openSections.education}
        onToggle={(open) => setOpenSections({ ...openSections, education: open })}
      >
        {education && education.length > 0 ? (
          <div className="space-y-4">
            {education.map((edu) => (
              <Card key={edu.id} className="bg-white dark:bg-[#303030] border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-gray-900 dark:text-white break-words">{edu.degree}</CardTitle>
                      <CardDescription className="mt-1 text-gray-600 dark:text-gray-300 break-words">{edu.university_name}</CardDescription>
                      {edu.location && <CardDescription className="text-gray-600 dark:text-gray-300 break-words">{edu.location}</CardDescription>}
                      {edu.cgpa && <CardDescription className="text-gray-600 dark:text-gray-300">Grade: {edu.cgpa}</CardDescription>}
                    </div>
                    <div className="text-sm text-muted-foreground dark:text-gray-300 whitespace-nowrap flex-shrink-0">
                      {formatDate(edu.from_date)} - {formatDate(edu.end_date)}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState sectionName="education" />
        )}
      </CollapsibleSection>

      {/* Skills Section */}
      <CollapsibleSection
        title="Skills"
        isOpen={openSections.skills}
        onToggle={(open) => setOpenSections({ ...openSections, skills: open })}
      >
        {skills && skills.length > 0 ? (
          (() => {
            
            const groupedSkills = skills.reduce((acc, skill) => {
              const categoryName = skill.category?.name || "Uncategorized";
              if (!acc[categoryName]) {
                acc[categoryName] = [];
              }
              acc[categoryName].push(skill);
              return acc;
            }, {} as Record<string, typeof skills>);

            const categories = Object.keys(groupedSkills).sort();

            return (
              <div className="space-y-6">
                {categories.map((categoryName) => (
                  <div key={categoryName} className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{categoryName}</h3>
                    <div className="space-y-3 pl-4">
                      {groupedSkills[categoryName].map((skill) => (
                        <div key={skill.id} className="space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                            <span className="font-medium text-gray-900 dark:text-white break-words">{skill.name}</span>
                            {skill.proficiency_level && (
                              <Badge variant="outline" className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 w-fit">{skill.proficiency_level}</Badge>
                            )}
                          </div>
                          {skill.description && (
                            <p className="text-sm text-muted-foreground dark:text-gray-300">{skill.description}</p>
                          )}
                          <Separator className="bg-gray-200 dark:bg-gray-700" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
        ) : (
          <EmptyState sectionName="skill" />
        )}
      </CollapsibleSection>

      {/* Certifications Section */}
      <CollapsibleSection
        title="Certifications"
        isOpen={openSections.certifications}
        onToggle={(open) => setOpenSections({ ...openSections, certifications: open })}
      >
        {certifications && certifications.length > 0 ? (
          <div className="space-y-4">
            {certifications.map((cert) => (
              <div key={cert.id} className="space-y-1">
                <div className="font-medium text-gray-900 dark:text-white">{cert.name}</div>
                {cert.institute_name && (
                  <CardDescription className="text-gray-600 dark:text-gray-300">{cert.institute_name}</CardDescription>
                )}
                {cert.description && (
                  <p className="text-sm text-muted-foreground dark:text-gray-300">{cert.description}</p>
                )}
                <div className="text-sm text-muted-foreground dark:text-gray-300">
                  {formatDate(cert.start_date)} - {formatDate(cert.end_date)}
                </div>
                <Separator className="bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState sectionName="certification" />
        )}
      </CollapsibleSection>

      {/* Achievements Section */}
      <CollapsibleSection
        title="Achievements"
        isOpen={openSections.achievements}
        onToggle={(open) => setOpenSections({ ...openSections, achievements: open })}
      >
        {achievements && achievements.length > 0 ? (
          <div className="space-y-2">
            {achievements.map((achievement) => (
              <div key={achievement.id} className="flex items-start gap-2">
                <span className="text-primary dark:text-blue-400">•</span>
                <p className="text-muted-foreground dark:text-gray-300">{achievement.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState sectionName="achievement" />
        )}
      </CollapsibleSection>

      {/* Publications Section */}
      <CollapsibleSection
        title="Publications"
        isOpen={openSections.publications}
        onToggle={(open) => setOpenSections({ ...openSections, publications: open })}
      >
        {publications && publications.length > 0 ? (
          <div className="space-y-4">
            {publications.map((pub) => (
              <div key={pub.id} className="space-y-1">
                <div className="font-medium text-gray-900 dark:text-white">{pub.paper_name}</div>
                {pub.conference_name && (
                  <CardDescription className="text-gray-600 dark:text-gray-300">{pub.conference_name}</CardDescription>
                )}
                {pub.description && (
                  <p className="text-sm text-muted-foreground dark:text-gray-300">{pub.description}</p>
                )}
                {pub.published_date && (
                  <div className="text-sm text-muted-foreground dark:text-gray-300">
                    Published: {formatDate(pub.published_date)}
                  </div>
                )}
                {pub.paper_link && (
                  <a
                    href={pub.paper_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary dark:text-blue-400 hover:underline break-all"
                  >
                    Paper Link - {pub.paper_link}
                  </a>
                )}
                <Separator className="bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState sectionName="publication" />
        )}
      </CollapsibleSection>
    </div>
  );
}
