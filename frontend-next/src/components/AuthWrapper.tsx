"use client";

import { useUser } from "@/contexts/UserContext";
import { Navbar } from "@/components/Navbar";
import { UnauthorizedPage } from "@/components/UnauthorizedPage";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, loading, isAuthenticated } = useUser();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <UnauthorizedPage />;
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

