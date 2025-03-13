import {
  BookUser,
  Bot,
  ClipboardList,
  Folder,
  LayoutGrid,
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
} from "lucide-react";
import { BookIcon } from "@/components/BookIcon";

// Define user roles - using space-separated strings to match what's in your system
export type UserRole = "project manager" | "annotator" | "agency owner" | "system admin";

type Submenu = {
  href: string;
  label: string;
  active?: boolean;
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
};

// Modified function to accept user role
export function getMenuList(pathname: string, userRole: UserRole): Group[] {
  const projectId = pathname.split("/")[pathname.split("/").length - 1];
  const fpath = pathname.split("/")[1];

  // For project managers, always ensure Sourcing, Analytics, Project settings are included
  let projectManagerSpecificGroups: Group[] = [];

  if (userRole === "project manager") {
    projectManagerSpecificGroups = [
      {
        groupLabel: "Sourcing",
        menus: [
          {
            href: `/projects/job-list/${projectId}`,
            label: "Job List",
            active: pathname.includes("/job-list"),
            icon: List,
          },
          {
            href: `/projects/job-applications/${projectId}`,
            label: "Job Applicants",
            active: pathname.includes("/job-applications"),
            icon: Dock,
          },
        ],
        visibleTo: ["project manager"], // Only PM can see sourcing
      },
      {
        groupLabel: "Analytics",
        menus: [
          {
            href: `/projects/analytics/view/${projectId}`,
            label: "Overview",
            active: pathname.includes("/analytics/view"),
            icon: BarChart2,
          },
          {
            href: `/projects/leaderboard/${projectId}`,
            label: "Leaderboard",
            active: pathname.includes("/leaderboard"),
            icon: BarChart,
          },
        ],
        visibleTo: ["project manager"], // Only PM can see analytics
      },
      {
        groupLabel: "Project settings",
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
        visibleTo: ["project manager"], // Only PM can see project settings
      }
    ];
  }

  // Handle specific role-based menu structures
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
            icon: LayoutGrid,
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
            icon: LayoutGrid,
            submenus: [],
          },
          {
            href: "/tasks/chat",
            label: "Chat",
            active: pathname.includes("/chat"),
            icon: MessageCircle,
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
            icon: GraduationCap,
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
            icon: Folder,
          },
          {
            href: "/tasks/all",
            label: "All Tasks",
            active: pathname === "/tasks/all",
            icon: ClipboardList,
            visibleTo: ["annotator"],
          },
          {
            href: "/tasks/review",
            label: "Review Tasks",
            active: pathname.includes("/tasks/review"),
            icon: SquarePen,
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
            href: "/tasks/profile",
            label: "Profile",
            active: pathname.includes("/tasks/profile"),
            icon: User,
          },
          // {
          //   href: "/tasks/bank",
          //   label: "Bank Settings",
          //   active: pathname.includes("/tasks/bank"),
          //   icon: Landmark,
          // },
        ],
      },
    ];

    // For project manager, add the specific groups regardless of path
    if (userRole === "project manager") {
      return filterMenusByRole([...tasksMenu, ...projectManagerSpecificGroups], userRole);
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
    projectId == "bank" ||
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
          {
            href: "/dashboard",
            label: "Dashboard",
            active: pathname.includes("/dashboard"),
            icon: LayoutGrid,
            submenus: [],
          },
          {
            href: "/annotator",
            label: "Expert",
            active: pathname.includes("/annotator"),
            icon: BookUser,
            submenus: [],
            visibleTo: ["project manager"],
          },
          {
            href: "/chat",
            label: "Chat",
            active: pathname.includes("/chat"),
            icon: MessageCircle,
            submenus: [],
          },
          {
            href: "/wishlist",
            label: userRole === "project manager" ? "Wishlist" : "Buy me this!",
            active: pathname.includes("/wishlist"),
            icon: Heart,
            submenus: [],
          },
        ],
      },
      {
        groupLabel: "Contents",
        menus: [
          {
            href: "/",
            label: "Projects",
            active: pathname === "/",
            icon: Folder,
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
            icon: GraduationCap,
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
        groupLabel: "User",
        menus: [
          {
            href: "/projects/profile",
            label: "Profile",
            active: pathname.includes("/projects/profile"),
            icon: User,
          },
          // {
          //   href: "/bank",
          //   label: "Bank Settings",
          //   active: pathname.includes("/bank"),
          //   icon: Landmark,
          // },
        ],
      },
    ];

    // For project manager, add the specific groups regardless of path
    if (userRole === "project manager") {
      return filterMenusByRole([...homeMenu, ...projectManagerSpecificGroups], userRole);
    }

    return filterMenusByRole(homeMenu, userRole);
  }

  // Default menu structure for project context
  const defaultMenu: Group[] = [
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
          href: `/dashboard/${projectId}`,
          label: "Dashboard",
          active: pathname.includes("/dashboard/"),
          icon: LayoutGrid,
          submenus: [],
        },
        {
          href: "/annotator",
          label: "Expert",
          active: pathname.includes("/annotator"),
          icon: BookUser,
          submenus: [],
          visibleTo: ["project manager"],
        },
        {
          href: "/chat",
          label: "Chat",
          active: pathname.includes("/chat"),
          icon: MessageCircle,
          submenus: [],
        },
        {
          href: "/wishlist",
          label: userRole === "project manager" ? "Wishlist" : "Buy me this!",
          active: pathname.includes("/wishlist"),
          icon: Heart,
          submenus: [],
        },
      ],
    },
    {
      groupLabel: "Contents",
      menus: [
        {
          href: "/",
          label: "Projects",
          active: pathname === "/",
          icon: Folder,
        },

        // Only include Guidelines if we have a valid projectId (not empty, not "dashboard", etc.)
        ...(projectId &&
          !["", "dashboard", "annotator", "chat", "profile", "wishlist", "bank"].includes(projectId) ?
          [{
            href: `/projects/guidelines/${projectId}`,
            label: "Guidelines",
            active: pathname.includes(`/projects/guidelines/${projectId}`),
            icon: FileText,
            visibleTo: ["project manager" as UserRole],
          }] : []),
        // ...(projectId && 
        //   !["", "dashboard", "annotator", "chat", "profile", "wishlist", "bank"].includes(projectId) ? 
        //   [{
        //     href: `/projects/data/${projectId}`,
        //     label: "Data",
        //     active: pathname.includes(`/projects/data/${projectId}`),
        //     icon: BarChart, // You might want to use a different icon like Database if available
        //     visibleTo: ["project manager" as UserRole],
        //   }] : []),
        {
          href: `/projects/${projectId}`,
          label: "Templates",
          active:
            pathname.includes(`/projects/${projectId}`) &&
            !pathname.includes("/task") &&
            !pathname.includes("/ai-config") &&
            !pathname.includes("/analytics/view") &&
            !pathname.includes("/settings") &&
            !pathname.includes("/notification") &&
            !pathname.includes("/leaderboard") &&
            !pathname.includes("/job-list") &&
            !pathname.includes("/job-applications") &&
            !pathname.includes("/guidelines"),
          // !pathname.includes("/data"),
          icon: SquarePen,
        },










        {
          href: `/projects/task/${projectId}`,
          label: "Tasks",
          active: pathname.includes("/task"),
          icon: ClipboardList,
        },
        {
          href: `/projects/benchmark-proposals/${projectId}`,
          label: "Benchmark Proposals",
          active: pathname.includes("/benchmark-proposals"),
          icon: List,
        },
      ],
    },
    {
      groupLabel: "Sourcing",
      menus: [
        {
          href: `/projects/job-list/${projectId}`,
          label: "Job List",
          active: pathname.includes("/job-list"),
          icon: List,
        },
        {
          href: `/projects/job-applications/${projectId}`,
          label: "Job Applicants",
          active: pathname.includes("/job-applications"),
          icon: Dock,
        },
      ],
      visibleTo: ["project manager"], // Only PM can see sourcing
    },
    {
      groupLabel: "Analytics",
      menus: [
        {
          href: `/projects/analytics/view/${projectId}`,
          label: "Overview",
          active: pathname.includes("/analytics/view"),
          icon: BarChart2,
        },
        {
          href: `/projects/leaderboard/${projectId}`,
          label: "Leaderboard",
          active: pathname.includes("/leaderboard"),
          icon: BarChart,
        },
      ],
      visibleTo: ["project manager"], // Only PM can see analytics
    },
    {
      groupLabel: "Project settings",
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
      visibleTo: ["project manager"], // Only PM can see project settings
    },
    {
      groupLabel: "User",
      menus: [
        {
          href: "/projects/profile",
          label: "Profile",
          active: pathname.includes("/projects/profile"),
          icon: User,
        },
        // {
        //   href: "/bank",
        //   label: "Bank Settings",
        //   active: pathname.includes("/bank"),
        //   icon: Landmark,
        // },
      ],
    },
  ];

  // This conditional check is now redundant since we always include analytics for PM
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
          icon: BarChart2,
        },
      ],
      visibleTo: ["project manager"], // Only PM can see analytics
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