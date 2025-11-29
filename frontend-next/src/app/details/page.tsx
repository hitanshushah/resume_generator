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
  // Fallback to store user if context user is not available
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
      <div className="container mx-auto p-8 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-8">
        <Alert>
          <AlertDescription>No data available</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { userProfile, projects, certifications, achievements, experiences, publications, skills, education } = data;

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = process.env.NEXT_PUBLIC_WEBBSTYLE_URL;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };


  return (
    <div className="container mx-auto p-8 space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24">
              {userProfile.profile_photo_url ? (
                <AvatarImage src={userProfile.profile_photo_url} alt={userProfile.name || userProfile.username} />
              ) : null}
              <AvatarFallback className="text-2xl">
                {getInitials(userProfile.name, userProfile.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <CardTitle className="text-3xl">{userProfile.name || userProfile.username}</CardTitle>
              {userProfile.designation && (
                <CardDescription className="text-lg">{userProfile.designation}</CardDescription>
              )}
              {userProfile.bio && <p className="text-muted-foreground">{userProfile.bio}</p>}
              <div className="flex flex-wrap gap-2">
                {userProfile.city && <Badge variant="outline">{userProfile.city}</Badge>}
                {userProfile.province && <Badge variant="outline">{userProfile.province}</Badge>}
                {userProfile.country && <Badge variant="outline">{userProfile.country}</Badge>}
              </div>
              {userProfile.links && userProfile.links.length > 0 && (
                <div className="flex flex-wrap flex-col gap-2 pt-2 w-fit">
                  {userProfile.links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {link.title} -{link.url}
                    </a>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap pt-2 gap-4">
                {userProfile.email && <Badge variant="outline">{userProfile.email}</Badge>}
                {userProfile.phone_number && <Badge variant="outline">{userProfile.phone_number}</Badge>}
              </div>
            </div> 
            <Button
                  onClick={handleAddClick}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button> 
          </div>
        </CardHeader>
        {userProfile.introduction && (
          <CardContent>
            <Separator className="my-4" />
            <p className="text-muted-foreground whitespace-pre-wrap">{userProfile.introduction}</p>
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
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{project.name}</CardTitle>
                      {project.category && (
                        <CardDescription className="mt-1">
                          {project.category} {project.status && `• ${project.status}`}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.description && <p className="text-muted-foreground">{project.description}</p>}
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.technologies.map((tech, idx) => (
                        <Badge key={idx} variant="secondary">{tech}</Badge>
                      ))}
                    </div>
                  )}
                  {project.links && project.links.length > 0 && (
                    <div className="flex flex-col flex-wrap gap-2 w-fit">
                      {project.links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
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
              <Card key={exp.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{exp.role}</CardTitle>
                      <CardDescription className="mt-1">{exp.company_name}</CardDescription>
                      {exp.location && <CardDescription>{exp.location}</CardDescription>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(exp.start_date)} - {formatDate(exp.end_date)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {exp.description && (
                    <p className="text-muted-foreground whitespace-pre-wrap">{exp.description}</p>
                  )}
                 {exp.skills && exp.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {exp.skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary">{skill}</Badge>
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
              <Card key={edu.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{edu.degree}</CardTitle>
                      <CardDescription className="mt-1">{edu.university_name}</CardDescription>
                      {edu.location && <CardDescription>{edu.location}</CardDescription>}
                      {edu.cgpa && <CardDescription>Grade: {edu.cgpa}</CardDescription>}
                    </div>
                    <div className="text-sm text-muted-foreground">
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
                    <h3 className="text-lg font-semibold">{categoryName}</h3>
                    <div className="space-y-3 pl-4">
                      {groupedSkills[categoryName].map((skill) => (
                        <div key={skill.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{skill.name}</span>
                            {skill.proficiency_level && (
                              <Badge variant="outline">{skill.proficiency_level}</Badge>
                            )}
                          </div>
                          {skill.description && (
                            <p className="text-sm text-muted-foreground">{skill.description}</p>
                          )}
                          <Separator />
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
                <div className="font-medium">{cert.name}</div>
                {cert.institute_name && (
                  <CardDescription>{cert.institute_name}</CardDescription>
                )}
                {cert.description && (
                  <p className="text-sm text-muted-foreground">{cert.description}</p>
                )}
                <div className="text-sm text-muted-foreground">
                  {formatDate(cert.start_date)} - {formatDate(cert.end_date)}
                </div>
                <Separator />
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
                <span className="text-primary">•</span>
                <p className="text-muted-foreground">{achievement.description}</p>
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
                <div className="font-medium">{pub.paper_name}</div>
                {pub.conference_name && (
                  <CardDescription>{pub.conference_name}</CardDescription>
                )}
                {pub.description && (
                  <p className="text-sm text-muted-foreground">{pub.description}</p>
                )}
                {pub.published_date && (
                  <div className="text-sm text-muted-foreground">
                    Published: {formatDate(pub.published_date)}
                  </div>
                )}
                {pub.paper_link && (
                  <a
                    href={pub.paper_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Paper Link - {pub.paper_link}
                  </a>
                )}
                <Separator />
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
