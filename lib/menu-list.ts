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
  Database,
  Key
} from "lucide-react";
import { BookIcon } from "@/components/BookIcon";
import { TemplateIcon } from "@/components/TemplateIcon";

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

  // Common project-related menu items for PM
  const projectManagerCommonGroups: Group[] = [
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
          {
            href: "/providerKeys",
            label: "Provider Keys",
            active: pathname.includes("/providerKeys"),
            icon: Key,
            submenus: [],
            visibleTo: ["project manager"],
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
        {
          href: "/providerKeys",
          label: "Provider Keys",
          active: pathname.includes("/providerKeys"),
          icon: Key,
          submenus: [],
          visibleTo: ["project manager"], // Only visible to project managers
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

        // Only include Guidelines if we have a valid projectId
        ...(projectId &&
          !["", "dashboard", "annotator", "chat", "profile", "wishlist", "bank"].includes(projectId) ?
          [{
            href: `/projects/guidelines/${projectId}`,
            label: "Guidelines",
            active: pathname.includes(`/projects/guidelines/${projectId}`),
            icon: FileText,
            visibleTo: ["project manager" as UserRole],
          },
          // Add the new data route here
          {
            href: `/data`,
            label: "Data",
            active: pathname.includes(`/data/`),
            icon: Database,
            visibleTo: ["project manager" as UserRole],
          }] : []),
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
            !pathname.includes("/guidelines") &&
            !pathname.includes("/data"),
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
        {
          href: `/projects/training/${projectId}`,          label: "Training",
          active: pathname === `/projects/training/${projectId}`,
          icon: GraduationCap, // Choose appropriate icon
          visibleTo: ["project manager"], // *** ONLY VISIBLE TO PROJECT MANAGER ***
      },
      ],
    }
  ];

  // Always include project-specific groups for project managers when a valid project ID is present
  if (userRole === "project manager" && projectId &&
    !["", "dashboard", "annotator", "chat", "profile", "wishlist", "bank"].includes(projectId)) {
    defaultMenu.push(...projectManagerCommonGroups);
  }

  // Add User group
  defaultMenu.push({
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
  });

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