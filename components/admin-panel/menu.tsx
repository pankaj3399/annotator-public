// components/Menu.tsx (adjust path as needed)
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
  Home, // Added Home for getGroupIcon fallback
} from 'lucide-react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react'; // Added useCallback

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getMenuList, UserRole, getProjectIdFromQuery } from '@/lib/menu-list'; // Ensure path is correct
import { cn } from '@/lib/utils';
import { signOut, useSession } from 'next-auth/react';

// Keywords that are part of paths but are NOT project IDs
const INVALID_ID_KEYWORDS_LIST = [
  'new',
  'create',
  'edit',
  'data',
  'task',
  'test',
  'training',
  'core',
  'job-list',
  'template',
  'pipeline',
  'guidelines',
  'discussion',
  'benchmark-proposals',
  'analytics',
  'leaderboard',
  'settings',
  'notification',
  'ai-config',
  'all',
  'annotatorDashboard',
  'chat',
  'profile',
  'wishlist',
  'bank',
  'viewCourses',
  'myCourses',
  'benchmark-arena',
  'review',
  'providerKeys',
  'history',
  'orders',
  'label',
  'teams',
  'experts',
  'reviewsAndRatings',
  'landing',
  'dashboard',
  'annotator',
  'courses',
  'dataScientist',
];

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
  icon?: LucideIcon | any; // For group icon
};

interface MenuProps {
  isOpen: boolean | undefined;
  projectName?: string;
  projectType?: string;
}

export function Menu({ isOpen }: MenuProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user?.role as UserRole) || 'annotator';

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const INVALID_ID_KEYWORDS = useMemo(() => INVALID_ID_KEYWORDS_LIST, []);

  useEffect(() => {
    let determinedProjectId: string | null = null;
    const pathSegments = pathname.split('/');

    const queryProjectId = getProjectIdFromQuery();
    if (queryProjectId) {
      determinedProjectId = queryProjectId;
    } else {
      if (pathSegments.includes('pipeline')) {
        const pipelineIndex = pathSegments.indexOf('pipeline');
        if (pipelineIndex + 1 < pathSegments.length) {
          const pid = pathSegments[pipelineIndex + 1];
          if (pid && !INVALID_ID_KEYWORDS.includes(pid.toLowerCase())) {
            determinedProjectId = pid;
          }
        }
      } else if (
        pathSegments.includes('projects') &&
        pathSegments.includes('template')
      ) {
        const templateIndex = pathSegments.indexOf('template');
        if (templateIndex + 2 < pathSegments.length) {
          const pid = pathSegments[templateIndex + 2];
          if (pid && !INVALID_ID_KEYWORDS.includes(pid.toLowerCase())) {
            determinedProjectId = pid;
          }
        }
      } else if (pathname.startsWith('/projects/job-list/new/')) {
        const pid = pathSegments[pathSegments.length - 1];
        if (pid && !INVALID_ID_KEYWORDS.includes(pid.toLowerCase())) {
          determinedProjectId = pid;
        }
      } else if (
        pathSegments.includes('projects') &&
        pathSegments.length >= 4
      ) {
        let pidCandidate = pathSegments[pathSegments.length - 1];
        if (
          pidCandidate &&
          INVALID_ID_KEYWORDS.includes(pidCandidate.toLowerCase()) &&
          pathSegments.length > 1
        ) {
          pidCandidate = pathSegments[pathSegments.length - 2];
        }
        if (
          pidCandidate &&
          !INVALID_ID_KEYWORDS.includes(pidCandidate.toLowerCase())
        ) {
          const projectsIndex = pathSegments.indexOf('projects');
          if (
            projectsIndex !== -1 &&
            pathSegments.indexOf(pidCandidate) > projectsIndex + 1
          ) {
            determinedProjectId = pidCandidate;
          }
        }
      }
    }

    if (!determinedProjectId) {
      try {
        const storedProjectId = localStorage.getItem('currentProjectId');
        if (
          storedProjectId &&
          !INVALID_ID_KEYWORDS.includes(storedProjectId.toLowerCase())
        ) {
          determinedProjectId = storedProjectId;
        }
      } catch (e) {
        console.error('Error accessing localStorage for projectId:', e);
      }
    }

    if (determinedProjectId && determinedProjectId !== currentProjectId) {
      setCurrentProjectId(determinedProjectId);
      try {
        localStorage.setItem('currentProjectId', determinedProjectId);
      } catch (e) {
        console.error('Error storing projectId in localStorage:', e);
      }
    } else if (!determinedProjectId && currentProjectId !== null) {
      const isProjectPath =
        pathname.includes('/projects/') ||
        pathname.includes('/pipeline/') ||
        pathname.includes('/dataScientist/notebook');
      if (!isProjectPath) {
        // setCurrentProjectId(null); // Optional: clear if navigating away from project context
      }
    }
  }, [pathname, currentProjectId, INVALID_ID_KEYWORDS]);

  const menuList = useMemo(() => {
    return getMenuList(pathname, userRole, currentProjectId) as MenuGroup[];
  }, [pathname, userRole, currentProjectId]);

  const updatedMenuList = useMemo(() => {
    return menuList.map((group) => {
      if (group.groupLabel === 'Contents')
        return { ...group, groupLabel: 'Projects' };
      return group;
    });
  }, [menuList]);

  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});

  // Function to toggle section expansion
  const toggleSection = useCallback((sectionLabel: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionLabel]: !prev[sectionLabel],
    }));
  }, []); // Empty dependency array as it doesn't depend on props/state outside its own scope

  useEffect(() => {
    const initialState: { [key: string]: boolean } = {};
    updatedMenuList.forEach((group) => {
      if (group.groupLabel) initialState[group.groupLabel] = true;
      group.menus.forEach((item) => {
        if (item.submenus && item.submenus.length > 0)
          initialState[item.label] = true;
      });
    });
    setExpandedSections(initialState);
  }, [updatedMenuList]);

  const getGroupIcon = (group: MenuGroup): LucideIcon | any => {
    if (group.icon) return group.icon;
    switch (group.groupLabel) {
      case 'Knowledge':
        return Book;
      case 'Data':
        return Database;
      case 'UI Builder':
        return LayoutTemplate;
      case 'Task Management':
        return Briefcase;
      case 'Resources':
        return PersonStanding;
      case 'Analytics':
        return LineChart;
      case 'Settings & Configuration':
        return Cog;
      case 'Project Management':
        return FolderKanban;
      case 'Expert Management':
        return UserCog;
      case 'Settings':
        return Wrench;
      case 'AI Academy':
        return School;
      case 'Contents':
      case 'Projects':
        return Folders;
      case 'Project':
        return FolderCode;
      case 'User':
        return User;
      default:
        return FolderOpen;
    }
  };

  const getHrefWithProjectId = (baseHref: string, label: string): string => {
    if (
      !currentProjectId ||
      INVALID_ID_KEYWORDS.includes(currentProjectId.toLowerCase())
    ) {
      if (
        (label === 'Connector' && baseHref === '/projects/data') ||
        (label === 'Notebook' && baseHref === '/dataScientist/notebook')
      ) {
        const queryPid = getProjectIdFromQuery();
        if (queryPid) return `${baseHref}?projectId=${queryPid}`;
      }
      return baseHref;
    }

    if (label === 'Connector' && baseHref === '/projects/data') {
      return `/projects/data?projectId=${currentProjectId}`;
    }
    if (label === 'Notebook' && baseHref === '/dataScientist/notebook') {
      return `/dataScientist/notebook?projectId=${currentProjectId}`;
    }

    if (baseHref === '/projects/job-list/new') {
      return `/projects/job-list/new/${currentProjectId}`;
    }

    const projectSpecificBasePaths = [
      '/projects/guidelines',
      '/projects/discussion',
      '/projects/template/test',
      '/projects/template/training',
      '/projects/template/core',
      '/projects/task',
      '/projects/benchmark-proposals',
      '/projects/training',
      '/projects/job-list',
      '/projects/job-applications',
      '/projects/analytics/view',
      '/projects/leaderboard',
      '/projects/ai-config',
      '/projects/settings',
      '/projects/notification',
    ];

    if (projectSpecificBasePaths.some((p) => baseHref === p)) {
      return `${baseHref}/${currentProjectId}`;
    }

    return baseHref;
  };

  const inProjectContext =
    currentProjectId !== null &&
    !INVALID_ID_KEYWORDS.includes(currentProjectId.toLowerCase());
  const backToProjectsHref = inProjectContext
    ? `/pipeline/${currentProjectId}`
    : '/';

  return (
    <nav className='mt-8 h-full w-full'>
      {inProjectContext &&
        userRole !== 'data scientist' &&
        pathname !== '/' && (
          <div className='mb-6 px-4'>
            {userRole === 'project manager' && (
              <div className='flex items-center justify-around'>
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
                    <span className='hover:underline'>
                      Back to all projects
                    </span>
                  </NextLink>
                </div>
              </div>
            )}
          </div>
        )}

      <ul className='flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] lg:min-h-[calc(100vh-32px-40px-32px)] items-start space-y-1 px-2'>
        {updatedMenuList.map((group, groupIndex) => {
          if (group.menus.length === 0) return null;
          const GroupIcon = getGroupIcon(group);

          return (
            <li
              className={cn('w-full', group.groupLabel ? 'pt-5' : '')}
              key={`${group.groupLabel}-${groupIndex}`}
            >
              {(isOpen && group.groupLabel) || isOpen === undefined ? (
                <div
                  className={cn(
                    'flex items-center justify-between px-3 pb-1 mb-2',
                    group.groupLabel ? 'cursor-pointer hover:text-gray-700' : ''
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

              {(!group.groupLabel ||
                expandedSections[group.groupLabel] ||
                isOpen === false) && (
                <div className={cn(group.groupLabel ? 'pl-2' : '')}>
                  {group.menus.map((item, menuIndex) => {
                    const hasActiveSubmenu =
                      item.submenus?.some((submenu) => submenu.active) || false;
                    let isHighlighted = item.active || hasActiveSubmenu;
                    const Icon = item.icon;
                    const menuHref = getHrefWithProjectId(
                      item.href,
                      item.label
                    );

                    return (
                      <div
                        className='w-full'
                        key={`${item.label}-${menuIndex}`}
                      >
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

                        {item.submenus &&
                          item.submenus.length > 0 &&
                          expandedSections[item.label] &&
                          isOpen !== false && (
                            <div className='pl-8 space-y-1'>
                              {item.submenus.map((submenu, submenuIndex) => {
                                const SubmenuIcon = submenu.icon;
                                const submenuHref = getHrefWithProjectId(
                                  submenu.href,
                                  submenu.label
                                );
                                return (
                                  <TooltipProvider
                                    key={`${submenu.label}-${submenuIndex}`}
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
                    {session?.user?.name
                      ? `Logout ${session.user.name}`
                      : 'Logout'}
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