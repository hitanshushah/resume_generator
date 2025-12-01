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
  IconCurrencyDollar,
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
    { href: "/resume", label: "File Storage", icon: IconFileText },
    { href: "/details", label: "User Details", icon: IconUser },
    { href: "/pricing", label: "Pricing Plans", icon: IconCurrencyDollar },
  ];

  return (
    <nav className="sticky py-2 top-0 z-50 w-full border-b bg-[#F9F9F9] dark:bg-[#181818] border-b-slate-700 dark:border-b-slate-200">
      <div className="flex h-16 items-center px-12 w-full ">
        {/* Logo */}
          <Image src="/light_logo.png" alt="Logo" width={120} height={120} onClick={() => router.push("/")} className="cursor-pointer"/>

        {/* Desktop Navigation - Centered */}
        {!isMobile && (
          <div className="flex flex-1 items-center justify-center gap-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => router.push(item.href)}
                  className={
                    `flex items-center gap-2 ` +
                    (isActive ? "dark:bg-secondary dark:text-secondary-foreground" : "dark:bg-primary dark:text-primary-foreground")
                  }
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

              <DropdownMenuContent
                align="end"
                className="
                  w-56
                  dark:bg-[#181818] dark:text-white
                  dark:border dark:border-gray-700
                "
              >
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.username}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>

                {/* Plan Banner */}
                <div className={`px-3 py-2 border-b dark:border-gray-700 ${
                  user.is_pro 
                    ? 'bg-primary/10 border-primary/20' 
                    : 'bg-muted/50 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground dark:text-gray-400">
                      Plan
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      user.is_pro
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {user.plan_name || 'Basic'}
                    </span>
                  </div>
                </div>

                <DropdownMenuSeparator className="dark:bg-gray-700" />

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
                            className={`
                              w-full justify-start gap-2
                              dark:bg-[#181818] dark:text-white dark:hover:bg-gray-900
                              ${isActive ? "dark:bg-gray-800 bg-gray-100" : ""}
                            `}
                          >
                            <item.icon size={16} />
                            {item.label}
                          </Button>
                        </DropdownMenuItem>
                      );
                    })}

                    <DropdownMenuSeparator className="dark:bg-gray-700" />
                  </>
                )}

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="
                    cursor-pointer flex items-center gap-2
                   dark:bg-[#181818] dark:text-white
                  "
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
