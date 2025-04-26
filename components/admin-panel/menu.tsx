import { Ellipsis, LogOut, ChevronDown, ChevronRight, ArrowLeft, LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getMenuList, UserRole } from "@/lib/menu-list";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";

// Define more explicit types to ensure TypeScript understands the structure
type Submenu = {
  href: string;
  label: string;
  active?: boolean;
};

type MenuItem = {
  href: string;
  label: string;
  active: boolean;
  icon: LucideIcon | any; // Using 'any' for icon to match existing code
  submenus?: Submenu[];
};

type MenuGroup = {
  groupLabel: string;
  menus: MenuItem[];
};

interface MenuProps {
  isOpen: boolean | undefined;
  projectName?: string;
  projectType?: string;
}

export function Menu({ isOpen }: MenuProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // Get user role from session data
  const userRole = (session?.user?.role as UserRole) || "annotator"; // Default to annotator if no role found
  
  // Memoize menuList to prevent recreation on every render and cast to our type
  const menuList = useMemo(() => {
    const list = getMenuList(pathname, userRole);
    return list as MenuGroup[]; // Explicit casting
  }, [pathname, userRole]);

  // Update "Contents" to "Projects" if needed
  const updatedMenuList = useMemo(() => {
    return menuList.map(group => {
      // Convert "Contents" to "Projects" if needed
      if (group.groupLabel === "Contents") {
        return { ...group, groupLabel: "Projects" };
      }
      return group;
    });
  }, [menuList]);

  // Track expanded sections
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});

  // Check if in a project context
  const pathSegments = pathname.split("/");
  const projectId = pathSegments[pathSegments.length - 1];
  const inProjectContext = pathSegments.includes("projects") && projectId !== "projects";
  
  // Check if on projects route
  const isOnProjectsRoute = pathname === "/projects" || pathname.startsWith("/projects/");
  
  // Toggle section expansion
  const toggleSection = (groupLabel: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  // Initialize expandedSections based on active items, route and user role
  useEffect(() => {
    const initialState: {[key: string]: boolean} = {};
    
    // For project context, always expand the Project group
    if (inProjectContext) {
      initialState["Project"] = true;
      
      // Check for specific project sections
      if (pathname.includes("/job-list") || pathname.includes("/job-applications")) {
        initialState["Resources"] = true;
      }
      
      if (pathname.includes("/analytics/view") || pathname.includes("/leaderboard")) {
        initialState["Analytics"] = true;
      }
      
      if (pathname.includes("/ai-config") || pathname.includes("/settings") || pathname.includes("/notification")) {
        initialState["Settings & Configuration"] = true;
      }
    }
    
    // Always expand groups with active items
    updatedMenuList.forEach((group) => {
      if (!group.groupLabel) return;
      
      const hasActiveItem = group.menus.some((item) => {
        if (item.active) return true;
        
        // Check submenus for active items
        if (item.submenus && item.submenus.some((submenu) => submenu.active)) {
          initialState[item.label] = true; // Also expand the parent item
          return true;
        }
        
        return false;
      });
      
      if (hasActiveItem) {
        initialState[group.groupLabel] = true;
      }
    });
    
    // Role-specific expansions
    if (userRole === "project manager") {
      // Project Management section in home view
      if (!inProjectContext && pathname === "/") {
        initialState["Project Management"] = true;
      }
      
      // Expert Management section in home view
      if (!inProjectContext && (pathname.includes("/annotator") || pathname.includes("/chat"))) {
        initialState["Expert Management"] = true;
      }
      
      // Settings section in home view
      if (!inProjectContext && pathname.includes("/providerKeys")) {
        initialState["Settings"] = true;
      }
    }
    
    setExpandedSections(initialState);
  }, [pathname, userRole, updatedMenuList, inProjectContext]);

  return (
    <nav className="mt-8 h-full w-full">
      {/* Project title and back link (for project context) */}
      {inProjectContext && (
        <div className="mb-6 px-4">
          <div className="flex items-center text-sm text-blue-500 mt-1">
            <Link href="/" className="flex items-center ml-1">
              <ArrowLeft className="h-3 w-3 mr-1" />
              <span className="hover:underline">Back to all projects</span>
            </Link>
          </div>
        </div>
      )}

      <ul className="flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] lg:min-h-[calc(100vh-32px-40px-32px)] items-start space-y-1 px-2">
        {updatedMenuList.map((group, groupIndex) => {
          // Skip empty groups
          if (group.menus.length === 0) return null;
          
          return (
            <li 
              className={cn("w-full", group.groupLabel ? "pt-5" : "")} 
              key={groupIndex}
            >
              {/* Group Label */}
              {(isOpen && group.groupLabel) || isOpen === undefined ? (
                <div 
                  className={cn(
                    "flex items-center justify-between px-4 pb-1",
                    group.groupLabel ? "cursor-pointer hover:text-gray-900" : ""
                  )}
                  onClick={() => group.groupLabel && toggleSection(group.groupLabel)}
                >
                  <p className={cn(
                    "text-sm font-medium max-w-[220px] truncate",
                    expandedSections[group.groupLabel || ""] ? "text-gray-900" : "text-gray-500"
                  )}>
                    {group.groupLabel}
                  </p>
                  {group.groupLabel && (
                    expandedSections[group.groupLabel] 
                      ? <ChevronDown className={cn("h-3 w-3", expandedSections[group.groupLabel] ? "text-gray-900" : "text-gray-500")} /> 
                      : <ChevronRight className={cn("h-3 w-3", expandedSections[group.groupLabel] ? "text-gray-900" : "text-gray-500")} />
                  )}
                </div>
              ) : !isOpen && isOpen !== undefined && group.groupLabel ? (
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger className="w-full">
                      <div className="w-full flex justify-center items-center">
                        <Ellipsis className="h-5 w-5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{group.groupLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <p className="pb-2"></p>
              )}

              {/* Display menus if section is expanded or if there's no groupLabel */}
              {(!group.groupLabel || expandedSections[group.groupLabel] || isOpen === false) && (
                <div className={cn(group.groupLabel ? "pl-2" : "")}>
                  {group.menus.map((item, menuIndex) => {
                    // Determine if this menu item has active submenus
                    const hasActiveSubmenu = item.submenus?.some(submenu => submenu.active) || false;
                    
                    // Determine if this item should be highlighted
                    let isHighlighted = item.active || hasActiveSubmenu;
                    
                    const Icon = item.icon;
                    
                    return (
                      <div className="w-full" key={menuIndex}>
                        <TooltipProvider disableHoverableContent>
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <Button
                                variant={isHighlighted ? "secondary" : "ghost"}
                                className="w-full justify-between h-10 mb-1"
                                asChild={!item.submenus?.length}
                                onClick={item.submenus?.length ? () => toggleSection(item.label) : undefined}
                              >
                                {!item.submenus?.length ? (
                                  <Link href={item.href}>
                                    <div className="flex items-center w-full">
                                      <span className={cn(isOpen === false ? "" : "mr-4")}>
                                        <Icon size={18} />
                                      </span>
                                      <p
                                        className={cn(
                                          "max-w-[200px] truncate text-left",
                                          isOpen === false
                                            ? "-translate-x-96 opacity-0"
                                            : "translate-x-0 opacity-100"
                                        )}
                                      >
                                        {item.label}
                                      </p>
                                    </div>
                                  </Link>
                                ) : (
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center">
                                      <span className={cn(isOpen === false ? "" : "mr-4")}>
                                        <Icon size={18} />
                                      </span>
                                      <p
                                        className={cn(
                                          "max-w-[150px] truncate",
                                          isOpen === false
                                            ? "-translate-x-96 opacity-0"
                                            : "translate-x-0 opacity-100"
                                        )}
                                      >
                                        {item.label}
                                      </p>
                                    </div>
                                    {isOpen !== false && item.submenus?.length > 0 && (
                                      expandedSections[item.label]
                                        ? <ChevronDown size={16} />
                                        : <ChevronRight size={16} />
                                    )}
                                  </div>
                                )}
                              </Button>
                            </TooltipTrigger>
                            {isOpen === false && (
                              <TooltipContent side="right">{item.label}</TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>

                        {/* Submenu items */}
                        {item.submenus && item.submenus.length > 0 && expandedSections[item.label] && isOpen !== false && (
                          <div className="pl-8 space-y-1">
                            {item.submenus.map((submenu, submenuIndex) => (
                              <TooltipProvider key={submenuIndex} disableHoverableContent>
                                <Tooltip delayDuration={100}>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant={submenu.active ? "secondary" : "ghost"}
                                      className="w-full justify-start h-10 mb-1"
                                      asChild
                                    >
                                      <Link href={submenu.href}>
                                        <p
                                          className={cn(
                                            "max-w-[200px] truncate",
                                            !isOpen
                                              ? "-translate-x-96 opacity-0"
                                              : "translate-x-0 opacity-100"
                                          )}
                                        >
                                          {submenu.label}
                                        </p>
                                      </Link>
                                    </Button>
                                  </TooltipTrigger>
                                  {!isOpen && (
                                    <TooltipContent side="right">{submenu.label}</TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}

        {/* Logout Button */}
        <li className="w-full grow flex items-end">
          <TooltipProvider disableHoverableContent>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => signOut()}
                  variant="ghost"
                  className="w-full justify-start h-10 mt-5 mb-1"
                >
                  <span className={cn(isOpen === false ? "" : "mr-4")}>
                    <LogOut size={18} />
                  </span>
                  <p
                    className={cn(
                      "whitespace-nowrap",
                      isOpen === false ? "opacity-0 hidden" : "opacity-100"
                    )}
                  >
                    Logout
                  </p>
                </Button>
              </TooltipTrigger>
              {isOpen === false && (
                <TooltipContent side="right">Logout</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </li>
      </ul>
    </nav>
  );
}