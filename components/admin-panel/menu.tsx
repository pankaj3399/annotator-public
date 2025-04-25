"use client";

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

  // Track expanded sections
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});

  // Check if in a project context
  const pathSegments = pathname.split("/");
  const projectId = pathSegments[pathSegments.length - 1];
  const inProjectContext = pathSegments.includes("projects") && projectId !== "projects";
  
  // Check if on projects route
  const isOnProjectsRoute = pathname === "/projects" || pathname.startsWith("/projects/");
  
  // Check if in tasks route with task-specific content
  const isInTasksContext = pathname.includes("/tasks/");
  const isTaskSpecificRoute = pathname.includes("/tasks/all") || 
                              pathname.includes("/tasks/review") || 
                              pathname.includes("/tasks/benchmark-arena");

  // Check route type for role-specific highlighting
  const isDataScientistRoute = pathname.includes("/dataScientist/");
  const isAgencyOwnerRoute = pathname.includes("/agencyOwner/");
  const isAdminRoute = pathname.includes("/admin/");

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
    
    // Detect task-related routes that should open the Projects accordion
    const isTaskRelatedRoute = pathname.includes("/tasks/all") || 
                               pathname.includes("/tasks/review") || 
                               pathname.includes("/tasks/benchmark-arena");
    
    // Only expand Projects accordion when on actual project routes or task-related routes,
    // but not when on general routes like wishlist
    if ((isOnProjectsRoute && !pathname.includes("/wishlist")) || 
        pathname.includes("/templates") || 
        pathname.includes("/guidelines") || 
        pathname.includes("/data") || 
        pathname.includes("/task/") ||
        pathname.includes("/benchmark-proposals/") ||
        pathname.includes("/training/") ||
        (pathname === "/" && !pathname.includes("/tasks/wishlist")) ||
        isTaskRelatedRoute) {
      initialState["Projects"] = true;
    }
    
    // Don't auto-expand Projects when on wishlist
    if (pathname.includes("/wishlist")) {
      initialState["Projects"] = false;
    }
    
    // Auto-expand based on user role and route context
    if (userRole === "data scientist" && isDataScientistRoute) {
      initialState[""] = true; // Expand the unnamed group for data scientists
    }
    
    if (userRole === "agency owner" && isAgencyOwnerRoute) {
      initialState[""] = true; // Expand the unnamed group for agency owners
    }
    
    if (userRole === "system admin" && isAdminRoute) {
      initialState[""] = true; // Expand the unnamed group for system admins
    }
    
    // For annotators and project managers in tasks context
    if (isInTasksContext) {
      // For tasks-specific routes, open the Projects accordion
      if (isTaskSpecificRoute) {
        initialState["Projects"] = true;
      }
      
      // Check if viewing courses
      if (pathname.includes("/viewCourses") || pathname.includes("/myCourses")) {
        initialState["AI Academy"] = true;
      }
    }
    
    // Check active items in each menu category
    menuList.forEach((group) => {
      if (!group.groupLabel) return;
      
      // Auto-expand sections with active items or active submenus
      const hasActiveItem = group.menus.some((item) => {
        if (item.active) {
          // If this is a project-related item that's active, ensure Project group is expanded
          if (item.label === "Guidelines" || 
              item.label === "Data" || 
              item.label === "Templates" || 
              item.label === "Tasks" || 
              item.label === "Training" ||
              item.label === "Benchmark Proposals" ||
              item.label === "All Tasks") {
            initialState["Projects"] = true;
          }
          return true;
        }
        
        // Check submenus for active items
        if (item.submenus && item.submenus.some((submenu) => submenu.active)) {
          initialState[item.label] = true; // Also expand the parent item
          
          // If a project-related submenu is active, expand the Projects group
          if (group.groupLabel === "Projects") {
            initialState["Projects"] = true;
          }
          return true;
        }
        
        return false;
      });
      
      if (hasActiveItem) {
        initialState[group.groupLabel] = true;
      }
    });
    
    // Role-specific section expansion for project managers
    if (userRole === "project manager") {
      // Check if any Sourcing, Analytics, or Project Settings tabs have active items
      if (pathname.includes("/job-list") || pathname.includes("/job-applications")) {
        initialState["Sourcing"] = true;
        
        // If we're in a project context, also ensure the Projects accordion is open
        if (inProjectContext || pathname.includes("/projects/")) {
          initialState["Projects"] = true;
        }
      }
      
      if (pathname.includes("/analytics/view") || pathname.includes("/leaderboard")) {
        initialState["Analytics"] = true;
        
        // If we're in a project context, also ensure the Projects accordion is open
        if (inProjectContext || pathname.includes("/projects/")) {
          initialState["Projects"] = true;
        }
      }
      
      if (pathname.includes("/ai-config") || pathname.includes("/settings") || pathname.includes("/notification")) {
        initialState["Project settings"] = true;
        
        // If we're in a project context, also ensure the Projects accordion is open
        if (inProjectContext || pathname.includes("/projects/")) {
          initialState["Projects"] = true;
        }
      }
      
      // For training section
      if (pathname.includes("/training/")) {
        initialState["Projects"] = true;
      }
      
      // For guidelines, data, templates, or tasks sections
      if (pathname.includes("/guidelines/") || 
          pathname.includes("/data/") || 
          pathname.includes("/templates/") || 
          pathname.includes("/task/") ||
          pathname.includes("/benchmark-proposals/")) {
        initialState["Projects"] = true;
      }
    }
    
    // Role-specific section expansion for annotators - ensure Projects opens for task-related routes
    if (userRole === "annotator") {
      if (pathname.includes("/tasks/all") || 
          pathname.includes("/tasks/review") || 
          pathname.includes("/tasks/benchmark-arena")) {
        initialState["Projects"] = true;
      }
    }
    
    // Role-specific expansions for annotators
    if (userRole === "annotator") {
      if (pathname.includes("/tasks/all") || pathname.includes("/tasks/review")) {
        initialState["Contents"] = true;
      }
      
      if (pathname.includes("/tasks/benchmark-arena")) {
        initialState["Contents"] = true;
      }
    }
    
    setExpandedSections(initialState);
  }, [pathname, userRole, isOnProjectsRoute, isInTasksContext, isDataScientistRoute, isAgencyOwnerRoute, isAdminRoute, menuList]);

  // Update "Contents" to "Projects" if needed and handle special case for Projects
  const updatedMenuList = useMemo(() => {
    return menuList.map(group => {
      // Convert "Contents" to "Projects"
      if (group.groupLabel === "Contents") {
        // Create a modified group with Projects as the groupLabel
        const modifiedGroup = { ...group, groupLabel: "Projects" };
        
        // Filter out the redundant "Projects" item from the menus array or
        // ensure it's not marked as active when we're on a non-projects path
        modifiedGroup.menus = modifiedGroup.menus.map(menu => {
          if (menu.label === "Projects") {
            // Keep the item but ensure it's not incorrectly marked as active
            // Only mark active if we're specifically on the projects routes and not on wishlist
            const shouldBeActive = pathname === "/" || 
                                   pathname === "/projects" || 
                                   (pathname.startsWith("/projects/") && 
                                    !pathname.includes("/wishlist"));
            
            return {
              ...menu,
              active: shouldBeActive
            };
          }
          return menu;
        });
        
        return modifiedGroup;
      }
      return group;
    });
  }, [menuList, pathname]);

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
                    
                    // Determine if this item should be highlighted based on role-specific routes and the exact path
                    // Important: Make sure only one item is highlighted based on the current path
                    let isHighlighted = false;
                    
                    // Check if this is the correct item to highlight for the current path
                    if (item.active && !pathname.includes("/wishlist")) {
                      isHighlighted = true;
                    } else if (hasActiveSubmenu) {
                      isHighlighted = true;
                    }
                    
                    // Handle "Buy me this!" highlighting specifically
                    if (item.label === "Buy me this!" && pathname.includes("/wishlist")) {
                      isHighlighted = true;
                    }
                    
                    // Role-specific highlight logic - but only if not on wishlist
                    if (!pathname.includes("/wishlist")) {
                      if (userRole === "data scientist" && item.label === "Dashboard" && isDataScientistRoute) {
                        isHighlighted = true;
                      } else if (userRole === "agency owner" && item.label === "Dashboard" && isAgencyOwnerRoute) {
                        isHighlighted = true;
                      } else if (userRole === "annotator" && item.label === "All Tasks" && pathname.includes("/tasks/all")) {
                        isHighlighted = true;
                      } else if (userRole === "project manager" && item.label === "Training" && pathname.includes("/training/")) {
                        isHighlighted = true;
                      }
                    }
                    
                    // Project-related items highlighting - only if not on wishlist
                    if (!pathname.includes("/wishlist")) {
                      if (item.label === "Guidelines" && pathname.includes("/guidelines/")) {
                        isHighlighted = true;
                      }
                      
                      if (item.label === "Data" && pathname.includes("/data/")) {
                        isHighlighted = true;
                      }
                      
                      if (item.label === "Templates" && 
                          pathname.includes(`/projects/`) && 
                          !pathname.includes("/task") &&
                          !pathname.includes("/ai-config") &&
                          !pathname.includes("/analytics/view") &&
                          !pathname.includes("/settings") &&
                          !pathname.includes("/notification") &&
                          !pathname.includes("/leaderboard") &&
                          !pathname.includes("/job-list") &&
                          !pathname.includes("/job-applications") &&
                          !pathname.includes("/guidelines") &&
                          !pathname.includes("/data")) {
                        isHighlighted = true;
                      }
                      
                      if (item.label === "Tasks" && pathname.includes("/task/")) {
                        isHighlighted = true;
                      }
                      
                      if (item.label === "All Tasks" && pathname.includes("/tasks/all")) {
                        isHighlighted = true;
                      }
                      
                      if (item.label === "Review Tasks" && pathname.includes("/tasks/review")) {
                        isHighlighted = true;
                      }
                      
                      if (item.label === "Benchmark Arena" && pathname.includes("/benchmark-arena")) {
                        isHighlighted = true;
                      }
                      
                      if (item.label === "Benchmark Proposals" && pathname.includes("/benchmark-proposals/")) {
                        isHighlighted = true;
                      }
                    }
                    
                    // Special case for Projects tab to avoid conflict with Buy me this!
                    if (item.label === "Projects" && pathname.includes("/wishlist")) {
                      isHighlighted = false;
                    }
                    
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
                            {item.submenus.map((submenu, submenuIndex) => {
                              // Additional role-specific active check for submenus
                              let isSubmenuActive = submenu.active;
                              
                              // Role-specific submenu highlighting
                              if (userRole === "project manager" && 
                                  item.label === "Analytics" && 
                                  submenu.label === "Overview" && 
                                  pathname.includes("/analytics/view")) {
                                isSubmenuActive = true;
                              }
                              
                              return (
                                <TooltipProvider key={submenuIndex} disableHoverableContent>
                                  <Tooltip delayDuration={100}>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant={isSubmenuActive ? "secondary" : "ghost"}
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
                              );
                            })}
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