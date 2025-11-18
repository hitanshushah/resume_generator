"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserProfile {
  user_id: number;
  username: string;
  email: string;
  profile_id: number | null;
  name: string | null;
  designation: string | null;
  bio: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  phone_number: string | null;
  secondary_email: string | null;
  introduction: string | null;
  profile_photo_url: string | null;
  links: Array<{ title: string; url: string; type: string }>;
  documents: Array<{ id: number; name: string; display_name: string; filename: string; url: string; type: string }>;
}

interface Project {
  id: number;
  key: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  category: string | null;
  status: string | null;
  technologies: string[];
  links: Array<{ title: string; url: string; type: string }>;
}

interface Certification {
  id: number;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  institute_name: string | null;
}

interface Experience {
  id: number;
  company_name: string;
  role: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  location: string | null;
}

interface Education {
  id: number;
  university_name: string;
  degree: string;
  from_date: string | null;
  end_date: string | null;
  location: string | null;
  cgpa: string | null;
}

interface Skill {
  id: number;
  name: string;
  category: { id: number; name: string; user_id: number | null } | null;
  proficiency_level: string | null;
  description: string | null;
}

interface UserDetailsData {
  userProfile: UserProfile;
  projects: Project[];
  certifications: Certification[];
  achievements: Array<{ id: number; description: string }>;
  experiences: Experience[];
  publications: Array<{
    id: number;
    paper_name: string;
    conference_name: string | null;
    description: string | null;
    published_date: string | null;
    paper_link: string | null;
  }>;
  skills: Skill[];
  education: Education[];
  categories: Array<{ id: number; name: string; key: string }>;
  technologies: string[];
}

export default function DetailsPage() {
  const { user, loading: userLoading } = useUser();
  const [data, setData] = useState<UserDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for user context to finish loading
    if (userLoading) {
      return;
    }

    const fetchUserDetails = async () => {
      if (!user?.id) {
        setError("User not found. Please log in.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/user-details/${user.id}`);
        
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
  }, [user?.id, userLoading]);

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
                <div className="flex flex-wrap gap-2 pt-2">
                  {userProfile.links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {link.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        {userProfile.introduction && (
          <CardContent>
            <Separator className="my-4" />
            <p className="text-muted-foreground whitespace-pre-wrap">{userProfile.introduction}</p>
          </CardContent>
        )}
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          {projects && projects.length > 0 ? (
            projects.map((project) => (
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
                    <div className="text-sm text-muted-foreground">
                      {formatDate(project.start_date)} - {formatDate(project.end_date)}
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
                    <div className="flex flex-wrap gap-2">
                      {project.links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {link.title}
                        </a>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No projects found
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Experience Tab */}
        <TabsContent value="experience" className="space-y-4">
          {experiences && experiences.length > 0 ? (
            experiences.map((exp) => (
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
                {exp.description && (
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{exp.description}</p>
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No experience found
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Education Tab */}
        <TabsContent value="education" className="space-y-4">
          {education && education.length > 0 ? (
            education.map((edu) => (
              <Card key={edu.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{edu.degree}</CardTitle>
                      <CardDescription className="mt-1">{edu.university_name}</CardDescription>
                      {edu.location && <CardDescription>{edu.location}</CardDescription>}
                      {edu.cgpa && <CardDescription>CGPA: {edu.cgpa}</CardDescription>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(edu.from_date)} - {formatDate(edu.end_date)}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No education found
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4">
          {skills && skills.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {skills.map((skill) => (
                    <div key={skill.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{skill.name}</span>
                        {skill.proficiency_level && (
                          <Badge variant="outline">{skill.proficiency_level}</Badge>
                        )}
                      </div>
                      {skill.category && (
                        <p className="text-sm text-muted-foreground">{skill.category.name}</p>
                      )}
                      {skill.description && (
                        <p className="text-sm text-muted-foreground">{skill.description}</p>
                      )}
                      <Separator />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No skills found
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Other Tab (Certifications, Achievements, Publications) */}
        <TabsContent value="other" className="space-y-4">
          {/* Certifications */}
          {certifications && certifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Certifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          )}

          {/* Achievements */}
          {achievements && achievements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Achievements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <p className="text-muted-foreground">{achievement.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Publications */}
          {publications && publications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Publications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                        View Paper
                      </a>
                    )}
                    <Separator />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(!certifications || certifications.length === 0) &&
            (!achievements || achievements.length === 0) &&
            (!publications || publications.length === 0) && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No additional information found
                </CardContent>
              </Card>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
