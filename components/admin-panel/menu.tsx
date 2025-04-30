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
  icon?: LucideIcon | any; // Using 'any' for icon to match existing code
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
  groupIcon?: LucideIcon | any; // Using 'any' for icon to match existing code
  icon?: LucideIcon | any; // Some groups use 'icon' instead of 'groupIcon'
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

  // Memoize menuList to prevent recreation on every render and cast to our type
  const menuList = useMemo(() => {
    const list = getMenuList(pathname, userRole);
    return list as MenuGroup[]; // Explicit casting
  }, [pathname, userRole]);

  // Update "Contents" to "Projects" if needed
  const updatedMenuList = useMemo(() => {
    return menuList.map((group) => {
      // Convert "Contents" to "Projects" if needed
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
  const pathSegments = pathname.split('/');
  const projectId = pathSegments[pathSegments.length - 1];
  const inProjectContext =
    pathSegments.includes('projects') && projectId !== 'projects';

  // Toggle section expansion
  const toggleSection = (groupLabel: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  // Initialize all accordions to be expanded by default
  useEffect(() => {
    console.log('--- Menu useEffect Start --- Pathname:', pathname); // For debugging
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
  
    console.log('--- Menu useEffect End --- Final initialState:', initialState); // Debug log
    setExpandedSections(initialState); // Update the state
  }, [pathname, userRole, updatedMenuList, inProjectContext]);

  // Get the appropriate icon for a group based on its label
  const getGroupIcon = (group: MenuGroup) => {
    // First check if the group already has an icon defined
    if (group.icon) return group.icon;
    if (group.groupIcon) return group.groupIcon;
    
    // If no icon is defined, assign one based on the group label
    // Using different icons than what's used in the child menu items
    switch (group.groupLabel) {
      case 'Knowledge': return Book; // Different from FileText, FileType2, FileType
      case 'Data': return Database; // Already different from Link and NotebookText
      case 'UI Builder': return LayoutTemplate; // Using the custom TemplateIcon component
      case 'Task Management': return Briefcase; // Different from CheckSquare
      case 'Resources': return PersonStanding; // Different from FileSpreadsheet, UserPlus
      case 'Analytics': return LineChart; // Different from PieChart, Activity
      case 'Settings & Configuration': return Cog; // Different from Bot, Settings, Bell
      case 'Project Management': return FolderKanban; // Different from LayoutDashboard, FolderOpen
      case 'Expert Management': return UserCog; // Different from User, User2Icon, MessageSquare, Heart
      case 'Settings': return Wrench; // Different from Key, CreditCard, CircleUser
      case 'AI Academy': return School; // Different from GraduationCap, BookOpen, BookIcon
      case 'Contents': 
      case 'Projects': return Folders; // Different from FolderOpen, CheckSquare, CheckCircle, TrendingUp
      case 'Project': return FolderCode; // Different from TrendingUp, GraduationCap
      case 'User': return User; // Different but related to CircleUser
      default: return FolderOpen; // Default fallback icon
    }
  };

  return (
    <nav className='mt-8 h-full w-full'>
      {inProjectContext && userRole !== 'data scientist' && (
        <div className='mb-6 px-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center text-sm text-blue-500 mt-1'>
              <NextLink
                href={`/projects/pipeline/${projectId}`}
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
                    {' '}
                    {/* Wrap icon and text */}
                    {/* Always render an icon for groups with groupLabel */}
                    {group.groupLabel && (
                      <GroupIcon
                        className={cn(
                          'h-5 w-5 mr-2', // Basic icon styling
                          expandedSections[group.groupLabel]
                            ? 'text-gray-800'
                            : 'text-gray-500' // Match text color based on expansion
                        )}
                      />
                    )}
                    <p
                      className={cn(
                        'text-sm font-medium max-w-[180px] truncate', // Adjust max-width if needed
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
                                  <NextLink href={item.href}>
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
                                          className='w-full justify-start h-10 mb-1' // Keep justify-start
                                          asChild
                                        >
                                          {/* --- Start of Modified Link Content --- */}
                                          <NextLink
                                            href={submenu.href}
                                            className='flex items-center w-full'
                                          >
                                            {/* Always render an icon for submenus */}
                                            <span
                                              className={cn(
                                                !isOpen ? '' : 'mr-2'
                                              )}
                                            >
                                              {' '}
                                              {/* Adjust margin as needed */}
                                              {SubmenuIcon ? (
                                                <SubmenuIcon size={16} />
                                              ) : (
                                                <ChevronRight size={16} />
                                              )}
                                              {' '}
                                            </span>
                                            {/* Render Label */}
                                            <p
                                              className={cn(
                                                'max-w-[180px] truncate', // Adjust max-width if needed due to icon
                                                !isOpen // This condition might not be relevant here as submenus only show when open
                                                  ? 'opacity-0 invisible' // Keep consistent hiding logic if needed
                                                  : 'opacity-100 visible'
                                              )}
                                            >
                                              {submenu.label}
                                            </p>
                                          </NextLink>
                                          {/* --- End of Modified Link Content --- */}
                                        </Button>
                                      </TooltipTrigger>
                                      {/* Tooltip logic remains the same */}
                                      {!isOpen && ( // Tooltip should only show when sidebar is collapsed
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