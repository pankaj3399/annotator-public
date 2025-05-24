// lib/menu-list.ts
import {
  BookUser,
  Bot,
  ClipboardList,
  Folder,
  LayoutDashboard,
  LucideIcon,
  MessageCircle,
  SquarePen,
  User,
  BarChart2,
  Settings,
  Bell,
  BarChart,
  GraduationCap,
  Heart,
  List,
  Dock,
  TrendingUp,
  Landmark,
  Home,
  Star,
  Tag,
  Users,
  ShoppingCart,
  FileText,
  Database,
  Key,
  LogOut,
  CreditCard,
  BookOpen,
  FolderOpen,
  FilePlus,
  FileSpreadsheet,
  PieChart,
  Activity,
  Gauge,
  CheckCircle,
  CheckSquare,
  MessageSquare,
  Mail,
  UserPlus,
  MousePointerClick,
  ChevronRight,
  HelpCircle,
  Eye,
  CircleUser,
  PlugZap,
  NotebookText,
  Link,
  FileType2,
  FileType,
  TestTube,
  Rocket,
  BookA,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { BookIcon } from '@/components/BookIcon'; // Adjust path if needed

// Define user roles
export type UserRole =
  | 'project manager'
  | 'annotator'
  | 'agency owner'
  | 'system admin'
  | 'data scientist';

type Submenu = {
href: string;
label: string;
active?: boolean;
icon?: LucideIcon | any;
};

type Menu = {
href: string;
label: string;
active: boolean;
icon: LucideIcon | any;
submenus?: Submenu[];
visibleTo?: UserRole[]; // Role-based visibility
};

type Group = {
groupLabel: string;
menus: Menu[];
visibleTo?: UserRole[]; // Role-based visibility for groups
icon?: LucideIcon | any; // Icon for the group itself (used in Menu.tsx)
};

// Keywords that are part of paths but are NOT project IDs
const PATH_KEYWORDS_NOT_IDS = ['new', 'create', 'edit', 'data', 'task', 'test', 'training', 'core', 'job-list', 'template', 'pipeline', 'guidelines', 'discussion', 'benchmark-proposals', 'analytics', 'leaderboard', 'settings', 'notification', 'ai-config', 'all', 'annotatorDashboard', 'chat', 'profile', 'wishlist', 'bank', 'viewCourses', 'myCourses', 'benchmark-arena', 'review', 'providerKeys', 'history', 'orders', 'label', 'teams', 'experts', 'reviewsAndRatings', 'landing', 'dashboard', 'annotator', 'courses', 'dataScientist'];


function isNotebookPath(pathname: string): boolean {
return pathname.includes('/dataScientist/notebook');
}

// Get project ID from URL query parameters (for notebook pages)
export function getProjectIdFromQuery(): string | null {
  // Export if used in Menu.tsx directly
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(window.location.href);
      const projectId = url.searchParams.get('projectId');
      if (
        projectId &&
        !PATH_KEYWORDS_NOT_IDS.includes(projectId.toLowerCase())
      ) {
        return projectId;
      }
    } catch (e) {
      console.error('Error parsing URL for query projectId:', e);
    }
  }
  return null;
}

function extractPotentialProjectIdFromPath(pathname: string): string | null {
  const segments = pathname.split('/');
  if (segments.length < 2) return null;

  // Pattern: /projects/{section}/{id} or /projects/{section}/{action}/{id}
  if (segments.includes('projects')) {
    const projectsIndex = segments.indexOf('projects');
    if (segments.length > projectsIndex + 2) {
      const potentialId = segments[projectsIndex + 2];
      // /projects/template/test/{id}, /projects/job-list/new/{id}
      if (
        segments.length > projectsIndex + 3 &&
        !PATH_KEYWORDS_NOT_IDS.includes(
          segments[projectsIndex + 3].toLowerCase()
        )
      ) {
        return segments[projectsIndex + 3];
      }
      // /projects/guidelines/{id}
      if (!PATH_KEYWORDS_NOT_IDS.includes(potentialId.toLowerCase())) {
        return potentialId;
      }
    }
  }
  // Pattern: /pipeline/{id}
  if (segments.includes('pipeline')) {
    const pipelineIndex = segments.indexOf('pipeline');
    if (segments.length > pipelineIndex + 1) {
      const potentialId = segments[pipelineIndex + 1];
      if (!PATH_KEYWORDS_NOT_IDS.includes(potentialId.toLowerCase())) {
        return potentialId;
      }
    }
  }

  if (isNotebookPath(pathname)) {
    return getProjectIdFromQuery();
  }
  return null;
}
function getAnnotatorMenu(pathname: string): Group[] {
  return [
    {
      groupLabel: '',
      menus: [
        {
          href: '/landing',
          label: 'Home',
          active: pathname.includes('/landing'),
          icon: Home,
          submenus: [],
        },
        {
          href: '/tasks/annotatorDashboard',
          label: 'Dashboard',
          active: pathname.includes('/annotatorDashboard'),
          icon: LayoutDashboard,
          submenus: [],
        },
        {
          href: '/tasks/chat',
          label: 'Chat',
          active: pathname.includes('/chat'),
          icon: MessageSquare,
          submenus: [],
        },
        {
          href: '/tasks/wishlist',
          label: 'Buy me this!',
          active: pathname.includes('/wishlist'),
          icon: Heart,
          submenus: [],
        },
      ],
    },
    {
      groupLabel: 'AI Academy',
      menus: [
        {
          href: '/tasks/viewCourses',
          label: 'All Courses',
          active: pathname.includes('/viewCourses'),
          icon: BookOpen,
          submenus: [],
        },
        {
          href: '/tasks/myCourses',
          label: 'My Courses',
          active: pathname.includes('/myCourses'),
          icon: BookIcon,
          submenus: [],
        },
      ],
    },
    {
      groupLabel: "Payments",
      menus: [
        {
          href: "/payments/history",
          label: "Payment History",
          active: pathname.includes("/payments/history"),
          icon: FileText,
        },
        {
          href: "/payments/bank-settings",
          label: "Bank Settings",
          active: pathname.includes("/payments/bank-settings"),
          icon: CreditCard,
        }
      ],
    },

    {
      groupLabel: 'Projects',
      menus: [
        {
          href: '/tasks',
          label: 'All Projects',
          active:
            pathname.includes('/tasks') &&
            !pathname.includes('/tasks/all') &&
            !pathname.includes('/viewCourses') &&
            !pathname.includes('/annotatorDashboard') &&
            !pathname.includes('/tasks/benchmark-arena'),
          icon: FolderOpen,
        },
        {
          href: '/tasks/all',
          label: 'All Tasks',
          active: pathname === '/tasks/all',
          icon: CheckSquare,
        },
        {
          href: '/tasks/review',
          label: 'Review Tasks',
          active: pathname.includes('/tasks/review'),
          icon: CheckCircle,
        },
        {
          href: '/tasks/benchmark-arena',
          label: 'Benchmark Arena',
          icon: TrendingUp,
          active: pathname.includes('/tasks/benchmark-arena'),
        },
      ],
    },
    {
      groupLabel: 'User',
      menus: [
        {
          href: '/profile',
          label: 'Profile',
          active: pathname.includes('/profile'),
          icon: CircleUser,
        },
      ],
    },
  ];
}
export function getMenuList(
  pathname: string,
  userRole: UserRole,
  dynamicProjectId?: string | null
): Group[] {
  const fpath = pathname.split('/')[1] || ''; // Ensure fpath is not undefined
  // Use dynamicProjectId if provided and valid, otherwise try to extract from path
  const effectiveProjectId =
    dynamicProjectId &&
      !PATH_KEYWORDS_NOT_IDS.includes(dynamicProjectId.toLowerCase())
      ? dynamicProjectId
      : extractPotentialProjectIdFromPath(pathname);

  if (userRole === 'data scientist') {
    return [
      {
        groupLabel: '',
        menus: [
          {
            href: '/landing',
            label: 'Home',
            active: pathname.includes('/landing'),
            icon: Home,
          },
        ],
      },
      {
        groupLabel: '',
        menus: [
          {
            href: '/dataScientist/dashboard',
            label: 'Dashboard',
            active: pathname.includes('/dataScientist/dashboard'),
            icon: LayoutDashboard,
          },
          {
            href: '/projects/data', // Base path, Menu.tsx adds ?projectId
            label: 'Data',
            active:
              pathname.startsWith('/projects/data') ||
              pathname.startsWith('/dataScientist/notebook'),
            icon: Database,
            submenus: [
              {
                href: `/projects/data`,
                label: 'Connector',
                active: pathname.startsWith(`/projects/data`),
                icon: Link,
              },
              {
                href: `/dataScientist/notebook`,
                label: 'Notebook',
                active: pathname.startsWith(`/dataScientist/notebook`),
                icon: NotebookText,
              },
            ],
          },
        ],
      },
      {
        groupLabel: 'User',
        menus: [
          {
            href: '/profile',
            label: 'Profile',
            active: pathname.includes('/profile'),
            icon: CircleUser,
          },
        ],
      },
    ];
  }

  if (userRole === 'agency owner') {
    return [
      {
        groupLabel: '',
        menus: [
          {
            href: '/landing',
            label: 'Home',
            active: pathname.includes('/landing'),
            icon: Home,
          },
          {
            href: '/agencyOwner',
            label: 'Dashboard',
            active: pathname === '/agencyOwner',
            icon: LayoutDashboard,
          },
          {
            href: '/agencyOwner/experts',
            label: 'Experts',
            active: pathname.includes('/agencyOwner/experts'),
            icon: BookUser,
          },
          {
            href: '/agencyOwner/reviewsAndRatings',
            label: 'Reviews & Ratings',
            active: pathname.includes('/agencyOwner/reviewsAndRatings'),
            icon: Star,
          },
        ],
      },
    ];
  }

  if (userRole === 'system admin') {
    return [
      {
        groupLabel: '',
        menus: [
          {
            href: '/landing',
            label: 'Home',
            active: pathname.includes('/landing'),
            icon: Home,
          },
          {
            href: '/',
            label: 'Custom Fields',
            active: pathname === '/',
            icon: FileText,
          },
          {
            href: '/admin/orders',
            label: 'View Orders',
            active: pathname.includes('/admin/orders'),
            icon: ShoppingCart,
          },
          {
            href: '/admin/label',
            label: 'Add Label',
            active: pathname.includes('/admin/label'),
            icon: Tag,
          },
          {
            href: '/admin/teams',
            label: 'Manage Teams',
            active: pathname.includes('/admin/teams'),
            icon: Users,
          },
        ],
      },
    ];
  }

  if (
    userRole === 'annotator' &&
    (pathname.includes('/projects/') || // Annotator might view a specific project page
      pathname.includes('/task/') || // Annotator working on a task within a project context
      (pathname.split('/').length > 2 && !pathname.startsWith('/tasks/'))) // More general project context
  ) {
    // If an annotator is deep within a project path, they should see annotator menu
    // This helps if they land on a URL that's not under /tasks/ but is project specific for them
    return getAnnotatorMenu(pathname);
  }

  const projectManagerCommonGroups: Group[] = [
    {
      groupLabel: 'Knowledge',
      icon: FileText,
      visibleTo: ['project manager'],
      menus: [
        {
          href: `/projects/guidelines`,
          label: 'Guidelines',
          active: effectiveProjectId
            ? pathname.includes(`/projects/guidelines/${effectiveProjectId}`)
            : pathname.startsWith(`/projects/guidelines/`),
          icon: BookA,
        },
        {
          href: `/projects/discussion`,
          label: 'Discussion',
          active: effectiveProjectId
            ? pathname.includes(`/projects/discussion/${effectiveProjectId}`)
            : pathname.startsWith(`/projects/discussion/`),
          icon: MessageSquare,
        },
      ],
    },
    {
      groupLabel: 'Data',
      visibleTo: ['project manager'],
      menus: [
        {
          href: `/projects/data`,
          label: 'Connector',
          active: pathname.startsWith(`/projects/data`),
          icon: Link,
        },
        {
          href: `/dataScientist/notebook`,
          label: 'Notebook',
          active: pathname.startsWith(`/dataScientist/notebook`),
          icon: NotebookText,
        },
      ],
    },
    {
      groupLabel: 'UI Builder',
      visibleTo: ['project manager'],
      menus: [
        {
          href: `/projects/template/test`,
          label: 'Create Test',
          active: effectiveProjectId
            ? pathname.includes(`/projects/template/test/${effectiveProjectId}`)
            : pathname.startsWith(`/projects/template/test/`),
          icon: TestTube,
        },
        {
          href: `/projects/template/training`,
          label: 'Create Training',
          active: effectiveProjectId
            ? pathname.includes(
              `/projects/template/training/${effectiveProjectId}`
            )
            : pathname.startsWith(`/projects/template/training/`),
          icon: GraduationCap,
        },
        {
          href: `/projects/template/core`,
          label: 'Create Production',
          active: effectiveProjectId
            ? pathname.includes(`/projects/template/core/${effectiveProjectId}`)
            : pathname.startsWith(`/projects/template/core/`),
          icon: Rocket,
        },
      ],
    },
    {
      groupLabel: 'Task Management',
      visibleTo: ['project manager'],
      menus: [
        {
          href: `/projects/task`,
          label: 'Tasks',
          active: effectiveProjectId
            ? pathname.includes(`/projects/task/${effectiveProjectId}`)
            : pathname.startsWith(`/projects/task/`),
          icon: CheckSquare,
        },
      ],
    },
    {
      groupLabel: 'Project Management',
      visibleTo: ['project manager'],
      menus: [
        {
          href: `/projects/benchmark-proposals`,
          label: 'Benchmark Proposals',
          active: effectiveProjectId
            ? pathname.includes(
              `/projects/benchmark-proposals/${effectiveProjectId}`
            )
            : pathname.startsWith(`/projects/benchmark-proposals/`),
          icon: TrendingUp,
        },
        {
          href: `/projects/training`,
          label: 'Kickoff Session',
          active: effectiveProjectId
            ? pathname.includes(`/projects/training/${effectiveProjectId}`)
            : pathname.startsWith(`/projects/training/`),
          icon: GraduationCap,
        },
      ],
    },
    {
      groupLabel: 'Resources',
      visibleTo: ['project manager'],
      menus: [
        {
          href: `/projects/job-list`,
          label: 'Job List',
          active: effectiveProjectId
            ? pathname.startsWith(`/projects/job-list/${effectiveProjectId}`) &&
            !pathname.includes('/new')
            : pathname.startsWith(`/projects/job-list/`) &&
            !pathname.includes('/new'),
          icon: FileSpreadsheet,
        },
        {
          href: `/projects/job-applications`,
          label: 'Job Applicants',
          active: effectiveProjectId
            ? pathname.includes(
              `/projects/job-applications/${effectiveProjectId}`
            )
            : pathname.startsWith(`/projects/job-applications/`),
          icon: UserPlus,
        },
        {
          href: `/projects/job-list/new`,
          label: 'Post Job',
          active:
            pathname.includes('/projects/job-list/new') ||
            pathname.includes('/projects/job-list/create'),
          icon: FilePlus,
        },
      ],
    },
    {
      groupLabel: 'Analytics',
      visibleTo: ['project manager'],
      menus: [
        {
          href: `/projects/analytics/view`,
          label: 'Overview',
          active: effectiveProjectId
            ? pathname.includes(
              `/projects/analytics/view/${effectiveProjectId}`
            )
            : pathname.startsWith(`/projects/analytics/view/`),
          icon: PieChart,
        },
        {
          href: `/projects/leaderboard`,
          label: 'Leaderboard',
          active: effectiveProjectId
            ? pathname.includes(`/projects/leaderboard/${effectiveProjectId}`)
            : pathname.startsWith(`/projects/leaderboard/`),
          icon: Activity,
        },
      ],
    },
    {
      groupLabel: 'Settings & Configuration',
      visibleTo: ['project manager'],
      menus: [
        {
          href: `/projects/ai-config`,
          label: 'AI Expert',
          active: effectiveProjectId
            ? pathname.includes(`/projects/ai-config/${effectiveProjectId}`)
            : pathname.startsWith(`/projects/ai-config/`),
          icon: Bot,
        },
        {
          href: `/projects/settings`,
          label: 'Settings',
          active: effectiveProjectId
            ? pathname.includes(`/projects/settings/${effectiveProjectId}`)
            : pathname.startsWith(`/projects/settings/`),
          icon: Settings,
        },
        {
          href: `/projects/notification`,
          label: 'Notification',
          active: effectiveProjectId
            ? pathname.includes(`/projects/notification/${effectiveProjectId}`)
            : pathname.startsWith(`/projects/notification/`),
          icon: Bell,
        },
      ],
    },
  ];

  if (fpath === 'tasks') {
    const tasksMenuBase = getAnnotatorMenu(pathname); // Annotator menu also serves as base for PM in /tasks
    if (userRole === 'project manager') {
      // Add PM specific general links to the tasks menu if not already present by context
      const pmGeneralLinks = [
        {
          href: '/courses',
          label: 'Courses',
          active: pathname.startsWith('/courses'),
          icon: GraduationCap,
          visibleTo: ['project manager'] as UserRole[],
        },
      ];
      // Modify AI Academy for PM
      const aiAcademyGroup = tasksMenuBase.find(
        (g) => g.groupLabel === 'AI Academy'
      );
      if (aiAcademyGroup) {
        aiAcademyGroup.menus = aiAcademyGroup.menus.filter(
          (m) =>
            !m.label.includes('All Courses') && !m.label.includes('My Courses')
        ); // Remove annotator courses
        aiAcademyGroup.menus.push(
          ...pmGeneralLinks.filter((link) => link.label === 'Courses')
        );
      } else {
        tasksMenuBase.push({
          groupLabel: 'AI Academy',
          menus: pmGeneralLinks.filter((link) => link.label === 'Courses'),
          visibleTo: ['project manager'],
        });
      }

      // If effectiveProjectId is available (e.g. /tasks/PROJECT_ID/...),
      // PM should also see projectManagerCommonGroups
      if (effectiveProjectId) {
        return filterMenusByRole(
          [...tasksMenuBase, ...projectManagerCommonGroups],
          userRole
        );
      }
      return filterMenusByRole(tasksMenuBase, userRole);
    }
    return filterMenusByRole(tasksMenuBase, userRole);
  }

  const nonProjectSpecificRoots = [
    '',
    'landing',
    'dashboard',
    'annotator',
    'chat',
    'profile',
    'wishlist',
    'bank',
    'providerKeys',
    'history',
    'courses',
    'admin',
    'agencyOwner',
    'payments-manager',
  ];
  if (!effectiveProjectId || nonProjectSpecificRoots.includes(fpath)) {
    const homeMenu: Group[] = [
      {
        groupLabel: '',
        menus: [
          {
            href: '/landing',
            label: 'Home',
            active: pathname.includes('/landing'),
            icon: Home,
          },
        ],
      },
      {
        groupLabel: 'Project Management',
        visibleTo: [
          'project manager',
          'annotator',
          'agency owner',
          'system admin',
        ],
        menus: [
          {
            href: '/dashboard',
            label: 'Dashboard',
            active: pathname.includes('/dashboard'),
            icon: LayoutDashboard,
          },
          {
            href: '/',
            label: 'Projects',
            active: pathname === '/',
            icon: FolderOpen,
          },
        ],
      },
      {
        groupLabel: 'Expert Management',
        visibleTo: ['project manager'],
        menus: [
          {
            href: '/annotator',
            label: 'Expert',
            active: pathname.includes('/annotator'),
            icon: User,
          },
          {
            href: '/chat',
            label: 'Chat',
            active: pathname.includes('/chat'),
            icon: MessageSquare,
            visibleTo: ['project manager', 'annotator'],
          },
          {
            href: '/wishlist',
            label: userRole === 'project manager' ? 'Wishlist' : 'Buy me this!',
            active: pathname.includes('/wishlist'),
            icon: Heart,
            visibleTo: ['project manager', 'annotator'],
          },
        ],
      },
      {
        groupLabel: 'AI Academy',
        menus: [
          {
            href: '/courses',
            label: 'Courses',
            active: pathname.startsWith('/courses'),
            icon: GraduationCap,
            visibleTo: ['project manager'],
          },
          {
            href: '/tasks/viewCourses',
            label: 'All Courses',
            active: pathname.includes('/tasks/viewCourses'),
            icon: BookOpen,
            visibleTo: ['annotator'],
          },
          {
            href: '/tasks/myCourses',
            label: 'My Courses',
            active: pathname.includes('/tasks/myCourses'),
            icon: BookIcon,
            visibleTo: ['annotator'],
          },
        ],
      },
      {
        groupLabel: 'Settings',
        menus: [
          {
            href: '/providerKeys',
            label: 'Provider Keys',
            active: pathname.includes('/providerKeys'),
            icon: Key,
            visibleTo: ['project manager'],
          },
          {
            href: '/profile',
            label: 'Profile',
            active: pathname.includes('/profile'),
            icon: CircleUser,
          },
        {
      href: "/payments-manager/history", // For project managers
      label: "Payment History",
      active: pathname.includes("/payments-manager/history"),
      icon: DollarSign,
      visibleTo: ["project manager"], // Only PM sees this in Settings
    }
        ],
      },
    ];
    return filterMenusByRole(homeMenu, userRole);
  }

  // Default for project context (PM viewing a specific project)
  const defaultMenu: Group[] = [];
  if (userRole === 'project manager' && effectiveProjectId) {
    defaultMenu.push(...projectManagerCommonGroups);
  }
  // This case might be for annotators viewing specific project analytics if that's a feature
  if (
    pathname.includes('/tasks/annotator') &&
    pathname.includes('/analytics')
  ) {
    defaultMenu.push({
      groupLabel: 'Analytics',
      menus: [
        {
          href: '/tasks/annotatorDashboard',
          label: 'Overview',
          active: pathname.includes('/tasks/annotatorDashboard'),
          icon: PieChart,
        },
      ],
      visibleTo: ['project manager', 'annotator'], // Or just annotator
    });
  }

  return filterMenusByRole(defaultMenu, userRole);
}

function filterMenusByRole(groups: Group[], userRole: UserRole): Group[] {
  const filteredGroups = groups.filter(
    (group) => !group.visibleTo || group.visibleTo.includes(userRole)
  );

  return filteredGroups
    .map((group) => {
      const filteredMenus = group.menus.filter(
        (menu) => !menu.visibleTo || menu.visibleTo.includes(userRole)
      );
      return { ...group, menus: filteredMenus };
    })
    .filter((group) => group.menus.length > 0);
}