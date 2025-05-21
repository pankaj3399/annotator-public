//menu-list.ts
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
  UserX2Icon,
  User2Icon,
  BookA,
  UserCheck,
} from "lucide-react";

import { BookIcon } from "@/components/BookIcon";

// Define user roles
export type UserRole = "project manager" | "annotator" | "agency owner" | "system admin" | "data scientist";

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
  icon?: LucideIcon | any;
};

// Check if we're in a notebook context
function isNotebookPath(pathname: string): boolean {
  return pathname.includes('/dataScientist/notebook');
}

// Get project ID from URL query parameters (for notebook pages)
function getProjectIdFromQuery(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('projectId');
    } catch (e) {
      console.error('Error parsing URL:', e);
    }
  }
  return null;
}
function getAnnotatorMenu(pathname: string): Group[] {
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: "/landing",
          label: "Home",
          active: pathname.includes("/landing"),
          icon: Home,
          submenus: [],
        },
        {
          href: "/tasks/annotatorDashboard",
          label: "Dashboard",
          active: pathname.includes("/annotatorDashboard"),
          icon: LayoutDashboard,
          submenus: [],
        },
        {
          href: "/tasks/chat",
          label: "Chat",
          active: pathname.includes("/chat"),
          icon: MessageSquare,
          submenus: [],
        },
        {
          href: "/tasks/wishlist",
          label: "Buy me this!",
          active: pathname.includes("/wishlist"),
          icon: Heart,
          submenus: [],
        },
      ],
    },
    {
      groupLabel: "AI Academy",
      menus: [
        {
          href: "/tasks/viewCourses",
          label: "All Courses",
          active: pathname.includes("/viewCourses"),
          icon: BookOpen,
          submenus: [],
        },
        {
          href: "/tasks/myCourses",
          label: "My Courses",
          active: pathname.includes("/myCourses"),
          icon: BookIcon,
          submenus: [],
        },
      ],
    },
    {
      groupLabel: "Projects", // Changed from "Contents" to be more descriptive
      menus: [
        {
          href: "/tasks",
          label: "All Projects",
          active: pathname.includes("/tasks") &&
            !pathname.includes("/tasks/all") &&
            !pathname.includes("/viewCourses") &&
            !pathname.includes("/annotatorDashboard") &&
            !pathname.includes("/tasks/benchmark-arena"),
          icon: FolderOpen,
        },
        {
          href: "/tasks/all",
          label: "All Tasks",
          active: pathname === "/tasks/all",
          icon: CheckSquare,
        },
        {
          href: "/tasks/review",
          label: "Review Tasks",
          active: pathname.includes("/tasks/review"),
          icon: CheckCircle,
        },
        {
          href: "/tasks/benchmark-arena",
          label: "Benchmark Arena",
          icon: TrendingUp,
          active: pathname.includes("/tasks/benchmark-arena")
        }
      ],
    },
    {
      groupLabel: "User",
      menus: [
        {
          href: "/profile",
          label: "Profile",
          active: pathname.includes("/profile"),
          icon: CircleUser,
        },
      ],
    },
  ];
}
export function getMenuList(pathname: string, userRole: UserRole): Group[] {
  // Extract projectId from pathname or query parameters
  let projectId = pathname.split("/")[pathname.split("/").length - 1];
  const fpath = pathname.split("/")[1];

  // For notebook pages, try to get projectId from query
  if (isNotebookPath(pathname)) {
    const queryProjectId = getProjectIdFromQuery();
    if (queryProjectId) {
      projectId = queryProjectId;
    }
  }

  // For data scientist role
  if (userRole === "data scientist") {
    return [
      {
        groupLabel: "",
        menus: [
          {
            href: "/landing",
            label: "Home",
            active: pathname.includes("/landing"),
            icon: Home,
            submenus: [],
          }
        ],
      }, {
        groupLabel: "",
        menus: [
          {
            href: "/dataScientist/dashboard",
            label: "Dashboard",
            active: pathname.includes("/dataScientist/dashboard"),
            icon: LayoutDashboard,
          },
          {
            href: "/projects/data",
            label: "Data",
            active: pathname.includes("/projects/data") || pathname.includes("/dataScientist/notebook"),
            icon: Database,
            submenus: [
              {
                href: `/projects/data`,
                label: "Connector",
                active: pathname.includes(`/projects/data`),
                icon: Link,
              },
              {
                href: `/dataScientist/notebook`,
                label: "Notebook",
                active: pathname.includes(`/dataScientist/notebook`),
                icon: NotebookText,
              },
            ],
          }
        ],
      },
      {
        groupLabel: "User",
        menus: [
          {
            href: "/profile",
            label: "Profile",
            active: pathname.includes("/profile"),
            icon: CircleUser,
          }
        ],
      }
    ];
  }

  // For agency owner role
  if (userRole === "agency owner") {
    return [
      {
        groupLabel: "",
        menus: [
          {
            href: "/landing",
            label: "Home",
            active: pathname.includes("/landing"),
            icon: Home,
            submenus: [],
          },
          {
            href: "/agencyOwner",
            label: "Dashboard",
            active: pathname === "/agencyOwner",
            icon: LayoutDashboard,
            submenus: [],
          },
          {
            href: "/agencyOwner/experts",
            label: "Experts",
            active: pathname.includes("/agencyOwner/experts"),
            icon: BookUser,
            submenus: [],
          },
          {
            href: "/agencyOwner/reviewsAndRatings",
            label: "Reviews & Ratings",
            active: pathname.includes("/agencyOwner/reviewsAndRatings"),
            icon: Star,
            submenus: [],
          },
        ],
      },
    ];
  }

  // For system admin role
  if (userRole === "system admin") {
    return [
      {
        groupLabel: "",
        menus: [
          {
            href: "/landing",
            label: "Home",
            active: pathname.includes("/landing"),
            icon: Home,
            submenus: [],
          },
          {
            href: "/",
            label: "Custom Fields",
            active: pathname === "/",
            icon: FileText,
            submenus: [],
          },
          {
            href: "/admin/orders",
            label: "View Orders",
            active: pathname.includes("/admin/orders"),
            icon: ShoppingCart,
            submenus: [],
          },
          {
            href: "/admin/label",
            label: "Add Label",
            active: pathname.includes("/admin/label"),
            icon: Tag,
            submenus: [],
          },
          {
            href: "/admin/teams",
            label: "Manage Teams",
            active: pathname.includes("/admin/teams"),
            icon: Users,
            submenus: [],
          },
        ],
      },
    ];
  }

  if (userRole === "annotator" && (
    pathname.includes('/projects/') ||
    pathname.includes('/dataScientist/') ||
    pathname.includes('/task/') ||
    (pathname.split('/').length > 3 && !pathname.includes('/tasks/'))
  )) {
    // Return the annotator-specific menu
    return getAnnotatorMenu(pathname);
  }

  // Common project-related menu items for PM
  const projectManagerCommonGroups: Group[] = [
    {
      groupLabel: "Knowledge",
      menus: [
        {
          href: `/projects/guidelines/${projectId}`,
          label: "Guidelines",
          active: pathname.includes(`/projects/guidelines/${projectId}`),
          icon: BookA,
        },
        // {
        //   href: `/projects/summary/${projectId}`,
        //   label: "Summary",
        //   active: pathname.includes(`/projects/summary/${projectId}`),
        //   icon: FileType2,
        // },
        {
          href: `/projects/discussion/${projectId}`,
          label: "Discussion",
          active: pathname.includes(`/projects/discussion/${projectId}`),
          icon: MessageSquare,
        },
      ],
      visibleTo: ["project manager"],
      icon: FileText,
    },
    {
      groupLabel: "Data",
      menus: [
        {
          href: `/projects/data`,
          label: "Connector",
          active: pathname.includes(`/projects/data/`),
          icon: Link,
          visibleTo: ["project manager" as UserRole],
        },
        {
          href: `/dataScientist/notebook`,
          label: "Notebook",
          active: pathname.includes(`/dataScientist/notebook`),
          icon: NotebookText,
        },
      ],
      visibleTo: ["project manager"],
    },
    {
      groupLabel: "UI Builder",
      menus: [
        {
          href: `/projects/template/test/${projectId}`,
          label: "Create Test",
          active: pathname.includes("/template/test"),
          icon: TestTube,
        },
        {
          href: `/projects/template/training/${projectId}`,
          label: "Create Training",
          active: pathname.includes("/template/training"),
          icon: GraduationCap,
        },
        {
          href: `/projects/template/core/${projectId}`,
          label: "Create Production",
          active: pathname.includes("/template/core"),
          icon: Rocket,
        },
      ],
      visibleTo: ["project manager"],
    },
    {
      groupLabel: "Task Management",
      menus: [
        {
          href: `/projects/task/${projectId}`,
          label: "Tasks",
          active: pathname.includes("/task"),
          icon: CheckSquare,
          visibleTo: ["project manager", "annotator", "agency owner", "system admin"],
        },
      ],
      visibleTo: ["project manager"],
    },
    {
      groupLabel: "Project Management",
      menus: [
        {
          href: `/projects/benchmark-proposals/${projectId}`,
          label: "Benchmark Proposals",
          active: pathname.includes("/benchmark-proposals"),
          icon: TrendingUp,
        },
        {
          href: `/projects/training/${projectId}`,
          label: "Kickoff Session",
          active: pathname === `/projects/training/${projectId}`,
          icon: GraduationCap,
        }
      ]
    },
    {
      groupLabel: "Resources",
      menus: [
        {
          href: `/projects/job-list/${projectId}`,
          label: "Job List",
          active: pathname.includes("/job-list"),
          icon: FileSpreadsheet,
        },
        {
          href: `/projects/job-applications/${projectId}`,
          label: "Job Applicants",
          active: pathname.includes("/job-applications"),
          icon: UserPlus,
        },
        {
          href: `/projects/job-list/new/${projectId}`,
          label: "Post Job",
          active: pathname.includes("/job-list/new") || pathname.includes("/job-list/create"),
          icon: UserPlus,
        },
        // {
        //   href: `/onboarded-annotator/${projectId}`,
        //   label: "Onboarded Experts",
        //   active: pathname.includes("/onboarded-annotator"),
        //   icon: UserCheck,
        // },
      ],
      visibleTo: ["project manager"],
    },
    {
      groupLabel: "Analytics",
      menus: [
        {
          href: `/projects/analytics/view/${projectId}`,
          label: "Overview",
          active: pathname.includes("/analytics/view"),
          icon: PieChart,
        },
        {
          href: `/projects/leaderboard/${projectId}`,
          label: "Leaderboard",
          active: pathname.includes("/leaderboard"),
          icon: Activity,
        },
      ],
      visibleTo: ["project manager"],
    },
    {
      groupLabel: "Settings & Configuration",
      menus: [
        {
          href: `/projects/ai-config/${projectId}`,
          label: "AI Expert",
          active: pathname.includes("/ai-config"),
          icon: Bot,
        },
        {
          href: `/projects/settings/${projectId}`,
          label: "Settings",
          active: pathname.includes("/settings"),
          icon: Settings,
        },
        {
          href: `/projects/notification/${projectId}`,
          label: "Notification",
          active: pathname.includes("/notification"),
          icon: Bell,
        },
      ],
      visibleTo: ["project manager"],
    }
  ];

  // For tasks path
  if (fpath === "tasks") {
    const tasksMenu: Group[] = [
      {
        groupLabel: "",
        menus: [
          {
            href: "/landing",
            label: "Home",
            active: pathname.includes("/landing"),
            icon: Home,
            submenus: [],
          },
          {
            href: "/tasks/annotatorDashboard",
            label: "Dashboard",
            active: pathname.includes("/annotatorDashboard"),
            icon: LayoutDashboard,
            submenus: [],
          },
          {
            href: "/tasks/chat",
            label: "Chat",
            active: pathname.includes("/chat"),
            icon: MessageSquare,
            submenus: [],
          },
          {
            href: "/tasks/wishlist",
            label: userRole === "project manager" ? "Wishlist" : "Buy me this!",
            active: pathname.includes("/wishlist"),
            icon: Heart,
            submenus: [],
          },
        ],
      },
      {
        groupLabel: "AI Academy",
        menus: [
          {
            href: "/tasks/viewCourses",
            label: "All Courses",
            active: pathname.includes("/viewCourses"),
            icon: BookOpen,
            submenus: [],
            visibleTo: ["annotator"],
          },
          {
            href: "/tasks/myCourses",
            label: "My Courses",
            active: pathname.includes("/myCourses"),
            icon: BookIcon,
            submenus: [],
            visibleTo: ["annotator"],
          },
          {
            href: "/courses",
            label: "Courses",
            active: pathname.startsWith("/courses"),
            icon: GraduationCap,
            visibleTo: ["project manager"],
          },
        ],
      },
      {
        groupLabel: "Contents",
        menus: [
          {
            href: "/tasks",
            label: "Projects",
            active:
              pathname.includes("/tasks") &&
              !pathname.includes("/tasks/all") &&
              !pathname.includes("/viewCourses") &&
              !pathname.includes("/annotatorDashboard") &&
              !pathname.includes("/tasks/benchmark-arena"),
            icon: FolderOpen,
          },
          {
            href: "/tasks/all",
            label: "All Tasks",
            active: pathname === "/tasks/all",
            icon: CheckSquare,
            visibleTo: ["annotator"],
          },
          {
            href: "/tasks/review",
            label: "Review Tasks",
            active: pathname.includes("/tasks/review"),
            icon: CheckCircle,
            visibleTo: ["annotator"],
          },
          {
            href: "/tasks/benchmark-arena",
            label: "Benchmark Arena",
            icon: TrendingUp,
            active: pathname.includes("/tasks/benchmark-arena")
          }
        ],
      },
      {
        groupLabel: "User",
        menus: [
          {
            href: "/profile",
            label: "Profile",
            active: pathname.includes("/profile"),
            icon: CircleUser,
          },
        ],
      },
    ];

    // For project manager, add the specific groups regardless of path
    if (userRole === "project manager") {
      // Check if there's a project context in the tasks path
      const potentialProjectId = pathname.split("/").slice(2).find(segment =>
        segment &&
        !["all", "annotatorDashboard", "chat", "profile", "wishlist", "bank", "viewCourses", "myCourses", "benchmark-arena", "review",].includes(segment)
      );

      if (potentialProjectId) {
        // If there's a project context, include PM-specific groups with the correct projectId
        const pmGroupsWithCorrectProject = projectManagerCommonGroups.map(group => ({
          ...group,
          menus: group.menus.map(menu => ({
            ...menu,
            href: menu.href.replace(projectId, potentialProjectId)
          }))
        }));

        return filterMenusByRole([...tasksMenu, ...pmGroupsWithCorrectProject], userRole);
      }

      return filterMenusByRole([...tasksMenu, ...projectManagerCommonGroups], userRole);
    }

    return filterMenusByRole(tasksMenu, userRole);
  }

  // For home page, courses pages, or top-level pages
  if (
    projectId == "" ||
    projectId == "dashboard" ||
    projectId == "annotator" ||
    projectId == "chat" ||
    projectId == "profile" ||
    projectId == "wishlist" ||
    projectId == "bank" || projectId == "providerKeys" ||
    fpath == "courses"
  ) {
    const homeMenu: Group[] = [
      {
        groupLabel: "",
        menus: [
          {
            href: "/landing",
            label: "Home",
            active: pathname.includes("/landing"),
            icon: Home,
            submenus: [],
          },
        ],
      },
      {
        groupLabel: "Project Management",
        menus: [
          {
            href: "/dashboard",
            label: "Dashboard",
            active: pathname.includes("/dashboard"),
            icon: LayoutDashboard,
            submenus: [],
            visibleTo: ["project manager", "annotator", "agency owner", "system admin"],
          },
          {
            href: "/",
            label: "Projects",
            active: pathname === "/",
            icon: FolderOpen,
            visibleTo: ["project manager", "annotator", "agency owner", "system admin"],
          },
        ],
      },
      {
        groupLabel: "Expert Management",
        menus: [
          {
            href: "/annotator",
            label: "Expert",
            active: pathname.includes("/annotator"),
            icon: User,
            submenus: [],
            visibleTo: ["project manager"],
          },
          // {
          //   href: "/onboarded-annotator",
          //   label: "Onboarded Experts",
          //   active: pathname.includes("/onboarded-annotator"),
          //   icon: User2Icon,
          //   submenus: [],
          //   visibleTo: ["project manager"],
          // },
          {
            href: "/chat",
            label: "Chat",
            active: pathname.includes("/chat"),
            icon: MessageSquare,
            submenus: [],
            visibleTo: ["project manager", "annotator", "agency owner", "system admin"],
          },
          {
            href: "/wishlist",
            label: userRole === "project manager" ? "Wishlist" : "Buy me this!",
            active: pathname.includes("/wishlist"),
            icon: Heart,
            submenus: [],
            visibleTo: ["project manager", "annotator", "agency owner", "system admin"],
          },
        ],
      },
      {
        groupLabel: "AI Academy",
        menus: [
          {
            href: "/courses",
            label: "Courses",
            active: pathname.startsWith("/courses"),
            icon: GraduationCap,
            visibleTo: ["project manager"],
          },
          {
            href: "/tasks/viewCourses",
            label: "All Courses",
            active: pathname.includes("/viewCourses"),
            icon: BookOpen,
            visibleTo: ["annotator"],
          },
          {
            href: "/tasks/myCourses",
            label: "My Courses",
            active: pathname.includes("/myCourses"),
            icon: BookIcon,
            visibleTo: ["annotator"],
          },
        ],
      },
      {
        groupLabel: "Settings",
        menus: [
          {
            href: "/providerKeys",
            label: "Provider Keys",
            active: pathname.includes("/providerKeys"),
            icon: Key,
            submenus: [],
            visibleTo: ["project manager"],
          },
          // {
          //   href: "/bank",
          //   label: "Payment Center",
          //   active: pathname.includes("/bank"),
          //   icon: CreditCard,
          //   submenus: [],
          //   visibleTo: ["project manager"],
          // },
          {
            href: "/profile",
            label: "Profile",
            active: pathname.includes("/profile"),
            icon: CircleUser,
          },
        ],
      },
    ];

    return filterMenusByRole(homeMenu, userRole);
  }

  // Special case: For notebook pages that need project context
  if (isNotebookPath(pathname)) {
    // If we have a valid project ID from query params, show the same menu as projects
    if (projectId && projectId !== "notebook") {
      return filterMenusByRole(projectManagerCommonGroups, userRole);
    }
  }

  // Default menu structure for project context
  const defaultMenu: Group[] = [];

  // Always include project-specific groups for project managers when a valid project ID is present
  if (userRole === "project manager" && projectId &&
    !["", "dashboard", "annotator", "chat", "profile", "wishlist", "bank"].includes(projectId)) {
    defaultMenu.push(...projectManagerCommonGroups);
  }

  // This conditional check is for a specific analytics view within the annotator path
  if (
    pathname.includes("/tasks/annotator") &&
    pathname.includes("/analytics")
  ) {
    defaultMenu.push({
      groupLabel: "Analytics",
      menus: [
        {
          href: "/tasks/annotatorDashboard",
          label: "Overview",
          active: pathname.includes("/tasks/annotatorDashboard"),
          icon: PieChart,
        },
      ],
      visibleTo: ["project manager"],
    });
  }

  return filterMenusByRole(defaultMenu, userRole);
}

// Helper function to filter menus by role
function filterMenusByRole(groups: Group[], userRole: UserRole): Group[] {
  // First filter out groups that aren't visible to the user role
  const filteredGroups = groups.filter(group =>
    !group.visibleTo || group.visibleTo.includes(userRole)
  );

  // Then filter menu items within each group
  return filteredGroups.map(group => {
    const filteredMenus = group.menus.filter(menu =>
      !menu.visibleTo || menu.visibleTo.includes(userRole)
    );

    return {
      ...group,
      menus: filteredMenus
    };
    // Remove empty groups (groups with no visible menus)
  }).filter(group => group.menus.length > 0);
}