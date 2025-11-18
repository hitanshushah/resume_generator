export interface UserProfile {
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
  introduction: string | null;
  profile_photo_url: string | null;
  website_url: string | null;
  personal_website_url: string | null;
  links: Array<{ title: string; url: string; type: string }>;
}

export interface Project {
  id: number;
  key: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  sorting_order: number | null;
  created_at: string | null;
  updated_at: string | null;
  category: string | null;
  status: string | null;
  settings: any | null;
  links: Array<{ title: string; url: string; type: string }>;
  technologies: string[];
}

export interface Certification {
  id: number;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  institute_name: string | null;
}

export interface Experience {
  id: number;
  company_name: string;
  role: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  skills: string | null;
  location: string | null;
}

export interface Education {
  id: number;
  university_name: string;
  degree: string;
  from_date: string | null;
  end_date: string | null;
  location: string | null;
  cgpa: string | null;
}

export interface Skill {
  id: number;
  name: string;
  category: { id: number; name: string; user_id: number | null } | null;
  proficiency_level: string | null;
  description: string | null;
}

export interface Publication {
  id: number;
  paper_name: string;
  conference_name: string | null;
  description: string | null;
  published_date: string | null;
  paper_link: string | null;
}

export interface Achievement {
  id: number;
  description: string;
}

export interface Category {
  id: number;
  name: string;
  key: string;
}

export interface UserDetailsData {
  userProfile: UserProfile;
  projects: Project[];
  certifications: Certification[];
  achievements: Achievement[];
  experiences: Experience[];
  publications: Publication[];
  skills: Skill[];
  education: Education[];
  categories: Category[];
  technologies: string[];
}

