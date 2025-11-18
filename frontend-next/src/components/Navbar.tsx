"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  IconHome,
  IconFileText,
  IconUser,
  IconLogout,
} from "@tabler/icons-react";

export function Navbar() {
  const { user, clearUser } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const getInitials = (username: string, email: string) => {
    if (username) return username.substring(0, 2).toUpperCase();
    if (email) return email.substring(0, 2).toUpperCase();
    return "U";
  };

  const handleLogout = () => {
    clearUser();
    router.push(process.env.NEXT_PUBLIC_LOGOUT_URL || "/");
  };

  const navItems = [
    { href: "/", label: "Home", icon: IconHome },
    { href: "/resume", label: "Resume", icon: IconFileText },
    { href: "/details", label: "Details", icon: IconUser },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-8 w-full ">
        {/* Logo */}
          <Image src="/logo.png" alt="Logo" width={80} height={80} onClick={() => router.push("/")} className="cursor-pointer"/>

        {/* Desktop Navigation - Centered */}
        {!isMobile && (
          <div className="flex flex-1 items-center justify-center gap-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => router.push(item.href)}
                  className="flex items-center gap-2"
                >
                  <item.icon size={16} />
                  {item.label}
                </Button>
              );
            })}
          </div>
        )}

        {/* Right side: Avatar */}
        <div className="ml-auto flex items-center gap-4">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="w-14 h-14">
                    {user.profile_photo ? (
                      <AvatarImage src={user.profile_photo} alt={user.username} />
                    ) : null}
                    <AvatarFallback>
                      {getInitials(user.username, user.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Mobile Navigation Items */}
                {isMobile && (
                  <>
                    {navItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <DropdownMenuItem key={item.href} asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(item.href)}
                            className={`w-full justify-start gap-2 ${isActive ? "bg-accent" : ""}`}
                          >
                            <item.icon size={16} />
                            {item.label}
                          </Button>
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer flex items-center gap-2"
                >
                  <IconLogout size={16} />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
}
