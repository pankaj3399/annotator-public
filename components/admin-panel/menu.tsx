import {
  Ellipsis,
  LogOut,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  LucideIcon,
  FileText,
  Database,
  GraduationCap,
  ClipboardList,
  Users,
  BarChart,
  Settings,
  FolderOpen,
  Rocket,
  Bell,
  TestTube,
  TrendingUp,
  Heart,
  BookOpen,
  Bot,
  User,
  CircleUser,
  Link,
  NotebookText,
  FileType,
  FileType2,
  // Additional icons for distinct accordion group headers
  Folders,
  Book,
  LineChart,
  BookMarked,
  FileCode,
  Wrench,
  PersonStanding,
  LayoutDashboard,
  Library,
  Briefcase,
  Cog,
  UserCog,
  School,
  BookText,
  FolderKanban,
  FolderCode,
  LayoutTemplate,
} from 'lucide-react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';


import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getMenuList, UserRole } from '@/lib/menu-list';
import { cn } from '@/lib/utils';
import { signOut, useSession } from 'next-auth/react';
import { TemplateIcon } from '../TemplateIcon';

// Define more explicit types to ensure TypeScript understands the structure
type Submenu = {
  href: string;
  label: string;
  active?: boolean;
  icon?: LucideIcon | any; 
};

type MenuItem = {
  href: string;
  label: string;
  active: boolean;
  icon: LucideIcon | any;
  submenus?: Submenu[];
};

type MenuGroup = {
  groupLabel: string;
  menus: MenuItem[];
  groupIcon?: LucideIcon | any;
  icon?: LucideIcon | any;
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
  const userRole = (session?.user?.role as UserRole) || 'annotator'; // Default to annotator if no role found

  // Store current project ID when it's available
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Project ID extraction logic
  useEffect(() => {
    const pathSegments = pathname.split('/');
    
    // First try to get stored project ID from localStorage (highest priority)
    try {
      const storedProjectId = localStorage.getItem('currentProjectId');
      if (storedProjectId) {
        // Only set it initially - we'll update it if we find a more current one
        if (!currentProjectId) {
          setCurrentProjectId(storedProjectId);
        }
      }
    } catch (e) {
      console.error('Error accessing localStorage:', e);
    }
    
    // Then check for project ID in various URL patterns
    
    // Check for pipeline page (main entry point to a project)
    if (pathSegments.includes('pipeline')) {
      const pipelineIndex = pathSegments.indexOf('pipeline');
      if (pipelineIndex + 1 < pathSegments.length) {
        const projectId = pathSegments[pipelineIndex + 1];
        if (projectId) {
          setCurrentProjectId(projectId);
          try {
            localStorage.setItem('currentProjectId', projectId);
          } catch (e) {
            console.error('Error storing in localStorage:', e);
          }
        }
      }
    } 
    // Handle template pages
    else if (pathSegments.includes('template')) {
      const templateIndex = pathSegments.indexOf('template');
      
      // Standard template URL pattern: /projects/template/[type]/[projectId]
      if (templateIndex + 2 < pathSegments.length) {
        const projectId = pathSegments[templateIndex + 2];
        if (projectId && projectId !== 'create' && projectId !== 'test' && 
            projectId !== 'training' && projectId !== 'core') {
          setCurrentProjectId(projectId);
          try {
            localStorage.setItem('currentProjectId', projectId);
          } catch (e) {
            console.error('Error storing in localStorage:', e);
          }
        }
      }
    }
    // Handle other project routes like guidelines, summary, etc.
    else if (pathSegments.includes('projects') && pathSegments.length >= 4) {
      // Path format like: /projects/section/projectId
      const projectsIndex = pathSegments.indexOf('projects');
      if (projectsIndex + 2 < pathSegments.length) {
        const projectId = pathSegments[projectsIndex + 2];
        if (projectId && projectId !== 'data') {
          setCurrentProjectId(projectId);
          try {
            localStorage.setItem('currentProjectId', projectId);
          } catch (e) {
            console.error('Error storing in localStorage:', e);
          }
        }
      }
    }
    // Check for project ID in query string (for notebook and data pages)
    else if (pathname.includes('/dataScientist/notebook') || pathname.includes('/projects/data')) {
      // Extract from URL query parameters
      try {
        const url = new URL(window.location.href);
        const projectId = url.searchParams.get('projectId');
        if (projectId) {
          setCurrentProjectId(projectId);
          try {
            localStorage.setItem('currentProjectId', projectId);
          } catch (e) {
            console.error('Error storing in localStorage:', e);
          }
        }
      } catch (e) {
        console.error('Error extracting projectId from URL:', e);
      }
    }
    
  }, [pathname]);

  // Memoize menuList
  const menuList = useMemo(() => {
    const list = getMenuList(pathname, userRole);
    return list as MenuGroup[];
  }, [pathname, userRole]);

  // Update "Contents" to "Projects" if needed
  const updatedMenuList = useMemo(() => {
    return menuList.map((group) => {
      if (group.groupLabel === 'Contents') {
        return { ...group, groupLabel: 'Projects' };
      }
      return group;
    });
  }, [menuList]);

  // Track expanded sections
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});

  // Check if in a project context
  const inProjectContext = currentProjectId !== null;

  // Toggle section expansion
  const toggleSection = (groupLabel: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  // Initialize all accordions to be expanded by default
  useEffect(() => {
    const initialState: { [key: string]: boolean } = {};
  
    // Make ALL groups expanded by default
    updatedMenuList.forEach((group) => {
      // If the group has a groupLabel, make it expanded by default
      if (group.groupLabel) {
        initialState[group.groupLabel] = true;
      }
      
      // Also expand each menu item that has submenus (like "Data" accordion)
      group.menus.forEach((item) => {
        if (item.submenus && item.submenus.length > 0) {
          initialState[item.label] = true;
        }
      });
    });
  
    setExpandedSections(initialState);
  }, [pathname, userRole, updatedMenuList, inProjectContext]);

  // Get the appropriate icon for a group based on its label
  const getGroupIcon = (group: MenuGroup) => {
    // First check if the group already has an icon defined
    if (group.icon) return group.icon;
    if (group.groupIcon) return group.groupIcon;
    
    // If no icon is defined, assign one based on the group label
    switch (group.groupLabel) {
      case 'Knowledge': return Book;
      case 'Data': return Database;
      case 'UI Builder': return LayoutTemplate;
      case 'Task Management': return Briefcase;
      case 'Resources': return PersonStanding;
      case 'Analytics': return LineChart;
      case 'Settings & Configuration': return Cog;
      case 'Project Management': return FolderKanban;
      case 'Expert Management': return UserCog;
      case 'Settings': return Wrench;
      case 'AI Academy': return School;
      case 'Contents': 
      case 'Projects': return Folders;
      case 'Project': return FolderCode;
      case 'User': return User;
      default: return FolderOpen;
    }
  };

  // Function to get proper href with project ID for any link
  const getHrefWithProjectId = (href: string, label: string) => {
    // If we don't have a project ID, return the original href
    if (!currentProjectId) return href;
        
    // Handle data-related links
    if (label === 'Connector') {
      return `/projects/data?projectId=${currentProjectId}`;
    } else if (label === 'Notebook') {
      return `/dataScientist/notebook?projectId=${currentProjectId}`;
    }
    
    // Specifically handle template URLs (UI Builder section)
    if (href.includes('/projects/template/')) {
      // For UI Builder template links, use this format
      const templateTypes = ['test', 'training', 'core'];
      for (const type of templateTypes) {
        if (href.includes(`/template/${type}/`)) {
          return `/projects/template/${type}/${currentProjectId}`;
        }
      }
    }
    
    // For other project-related paths, ensure they use the current project ID
    if (href.includes('/projects/') && !href.includes('/projects/data')) {
      const pathParts = href.split('/');
      
      // Check if this is a projects path with a project ID at the end
      // The pattern is typically /projects/something/projectId
      if (pathParts.length >= 4) {
        pathParts[pathParts.length - 1] = currentProjectId;
        const newHref = pathParts.join('/');
        return newHref;
      }
    }
    
    // If we don't match any pattern, return the original href
    return href;
  };

  // Always use the stored project ID for all links when in project context
  const backToProjectsHref = currentProjectId ? `/projects/pipeline/${currentProjectId}` : '/';

  return (
    <nav className='mt-8 h-full w-full'>
      {inProjectContext && userRole !== 'data scientist' && (
        <div className='mb-6 px-4'>
          {userRole === 'project manager' && (
            <div className='flex items-center justify-between'>
              <div className='flex items-center text-sm text-blue-500 mt-1'>
                <NextLink
                  href={backToProjectsHref} 
                  className='flex items-center ml-1'
                >
                  <span className='hover:underline'>Pipeline</span>
                </NextLink>
              </div>
              <div className='flex items-center text-sm text-blue-500 mt-1'>
                <NextLink href='/' className='flex items-center'>
                  <ArrowLeft className='h-3 w-3 mr-1' />
                  <span className='hover:underline'>Back to all projects</span>
                </NextLink>
              </div>
            </div>
          )}
        </div>
      )}

      <ul className='flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] lg:min-h-[calc(100vh-32px-40px-32px)] items-start space-y-1 px-2'>
        {updatedMenuList.map((group, groupIndex) => {
          // Skip empty groups
          if (group.menus.length === 0) return null;

          // Get the appropriate icon component for this group
          const GroupIcon = getGroupIcon(group);

          return (
            <li
              className={cn('w-full', group.groupLabel ? 'pt-5' : '')}
              key={groupIndex}
            >
              {/* Group Label */}
              {(isOpen && group.groupLabel) || isOpen === undefined ? (
                <div
                  className={cn(
                    'flex items-center justify-between px-3 pb-1 mb-2',
                    group.groupLabel ? 'cursor-pointer hover:text-gray-900' : ''
                  )}
                  onClick={() =>
                    group.groupLabel && toggleSection(group.groupLabel)
                  }
                >
                  <div className='flex items-center flex-grow mr-2'>
                    {group.groupLabel && (
                      <GroupIcon
                        className={cn(
                          'h-5 w-5 mr-2',
                          expandedSections[group.groupLabel]
                            ? 'text-gray-800'
                            : 'text-gray-500'
                        )}
                      />
                    )}
                    <p
                      className={cn(
                        'text-sm font-medium max-w-[180px] truncate',
                        expandedSections[group.groupLabel || '']
                          ? 'text-gray-900'
                          : 'text-gray-500'
                      )}
                    >
                      {group.groupLabel}
                    </p>
                  </div>

                  {group.groupLabel &&
                    (expandedSections[group.groupLabel] ? (
                      <ChevronDown
                        className={cn(
                          'h-3 w-3',
                          expandedSections[group.groupLabel]
                            ? 'text-gray-900'
                            : 'text-gray-500'
                        )}
                      />
                    ) : (
                      <ChevronRight
                        className={cn(
                          'h-3 w-3',
                          expandedSections[group.groupLabel]
                            ? 'text-gray-900'
                            : 'text-gray-500'
                        )}
                      />
                    ))}
                </div>
              ) : !isOpen && isOpen !== undefined && group.groupLabel ? (
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger className='w-full'>
                      <div className='w-full flex justify-center items-center'>
                        <Ellipsis className='h-5 w-5' />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side='right'>
                      <p>{group.groupLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <p className='pb-2'></p>
              )}

              {/* Display menus if section is expanded or if there's no groupLabel */}
              {(!group.groupLabel ||
                expandedSections[group.groupLabel] ||
                isOpen === false) && (
                <div className={cn(group.groupLabel ? 'pl-2' : '')}>
                  {group.menus.map((item, menuIndex) => {
                    // Determine if this menu item has active submenus
                    const hasActiveSubmenu =
                      item.submenus?.some((submenu) => submenu.active) || false;

                    // Determine if this item should be highlighted
                    let isHighlighted = item.active || hasActiveSubmenu;

                    const Icon = item.icon;
                    
                    // Get the proper href with project ID if needed
                    const menuHref = getHrefWithProjectId(item.href, item.label);

                    return (
                      <div className='w-full' key={menuIndex}>
                        <TooltipProvider disableHoverableContent>
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <Button
                                variant={isHighlighted ? 'secondary' : 'ghost'}
                                className='w-full justify-between h-10 mb-1'
                                asChild={!item.submenus?.length}
                                onClick={
                                  item.submenus?.length
                                    ? () => toggleSection(item.label)
                                    : undefined
                                }
                              >
                                {!item.submenus?.length ? (
                                  <NextLink href={menuHref}>
                                    <div className='flex items-center w-full'>
                                      <span
                                        className={cn(
                                          isOpen === false ? '' : 'mr-4'
                                        )}
                                      >
                                        <Icon size={18} />
                                      </span>
                                      <p
                                        className={cn(
                                          'max-w-[200px] truncate text-left',
                                          isOpen === false
                                            ? '-translate-x-96 opacity-0'
                                            : 'translate-x-0 opacity-100'
                                        )}
                                      >
                                        {item.label}
                                      </p>
                                    </div>
                                  </NextLink>
                                ) : (
                                  <div className='flex items-center justify-between w-full'>
                                    <div className='flex items-center'>
                                      <span
                                        className={cn(
                                          isOpen === false ? '' : 'mr-4'
                                        )}
                                      >
                                        <Icon size={18} />
                                      </span>
                                      <p
                                        className={cn(
                                          'max-w-[150px] truncate',
                                          isOpen === false
                                            ? '-translate-x-96 opacity-0'
                                            : 'translate-x-0 opacity-100'
                                        )}
                                      >
                                        {item.label}
                                      </p>
                                    </div>
                                    {isOpen !== false &&
                                      item.submenus?.length > 0 &&
                                      (expandedSections[item.label] ? (
                                        <ChevronDown size={16} />
                                      ) : (
                                        <ChevronRight size={16} />
                                      ))}
                                  </div>
                                )}
                              </Button>
                            </TooltipTrigger>
                            {isOpen === false && (
                              <TooltipContent side='right'>
                                {item.label}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>

                        {/* Submenu items */}
                        {item.submenus &&
                          item.submenus.length > 0 &&
                          expandedSections[item.label] &&
                          isOpen !== false && (
                            <div className='pl-8 space-y-1'>
                              {item.submenus.map((submenu, submenuIndex) => {
                                // Get the icon component from the submenu object
                                const SubmenuIcon = submenu.icon;
                                
                                // Add project ID to submenu hrefs if needed
                                const submenuHref = getHrefWithProjectId(submenu.href, submenu.label);

                                return (
                                  <TooltipProvider
                                    key={submenuIndex}
                                    disableHoverableContent
                                  >
                                    <Tooltip delayDuration={100}>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant={
                                            submenu.active
                                              ? 'secondary'
                                              : 'ghost'
                                          }
                                          className='w-full justify-start h-10 mb-1'
                                          asChild
                                        >
                                          <NextLink
                                            href={submenuHref}
                                            className='flex items-center w-full'
                                          >
                                            <span
                                              className={cn(
                                                !isOpen ? '' : 'mr-2'
                                              )}
                                            >
                                              {SubmenuIcon ? (
                                                <SubmenuIcon size={16} />
                                              ) : (
                                                <ChevronRight size={16} />
                                              )}
                                            </span>
                                            <p
                                              className={cn(
                                                'max-w-[180px] truncate',
                                                !isOpen
                                                  ? 'opacity-0 invisible'
                                                  : 'opacity-100 visible'
                                              )}
                                            >
                                              {submenu.label}
                                            </p>
                                          </NextLink>
                                        </Button>
                                      </TooltipTrigger>
                                      {!isOpen && (
                                        <TooltipContent side='right'>
                                          {submenu.label}
                                        </TooltipContent>
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
        <li className='w-full grow flex items-end'>
          <TooltipProvider disableHoverableContent>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => signOut()}
                  variant='ghost'
                  className='w-full justify-start h-10 mt-5 mb-1'
                >
                  <span className={cn(isOpen === false ? '' : 'mr-4')}>
                    <LogOut size={18} />
                  </span>
                  <p
                    className={cn(
                      'whitespace-nowrap',
                      isOpen === false ? 'opacity-0 hidden' : 'opacity-100'
                    )}
                  >
                    Logout
                  </p>
                </Button>
              </TooltipTrigger>
              {isOpen === false && (
                <TooltipContent side='right'>Logout</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </li>
      </ul>
    </nav>
  );
}