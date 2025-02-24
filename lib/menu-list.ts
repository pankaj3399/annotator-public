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
} from "lucide-react";
import { BookIcon } from "@/components/BookIcon";

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
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function getMenuList(pathname: string): Group[] {
  const projectId = pathname.split("/")[pathname.split("/").length - 1];
  const fpath = pathname.split("/")[1];

  // For tasks path
  if (fpath === "tasks") {
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
            icon: GraduationCap,
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
          },
          {
            href: "/tasks/review",
            label: "Review Tasks",
            active: pathname.includes("/tasks/review"),
            icon: SquarePen,
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
            active: false,
            icon: User,
          },
          {
            href: "/tasks/bank",
            label: "Bank Settings",
            active: false,
            icon: Landmark,
          },
        ],
      },
    ];
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
            label: "Wishlist",
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
          },
        ],
      },
      {
        groupLabel: "User",
        menus: [
          {
            href: "/projects/profile",
            label: "Profile",
            active: false,
            icon: User,
          },
          {
            href: "/bank",
            label: "Bank Settings",
            active: false,
            icon: Landmark,
          },
        ],
      },
    ];
  }

  // Default menu structure for project context
  const menu = [
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
          label: "Wishlist",
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
        {
          href: `/projects/${projectId}`,
          label: "Templates",
          active:
            pathname.includes("/projects/") &&
            !pathname.includes("/task") &&
            !pathname.includes("/ai-config") &&
            !pathname.includes("/analytics/view") &&
            !pathname.includes("/settings") &&
            !pathname.includes("/notification") &&
            !pathname.includes("/leaderboard") &&
            !pathname.includes("/job-list") &&
            !pathname.includes("/job-applications"),
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
    },
    {
      groupLabel: "User",
      menus: [
        {
          href: "/projects/profile",
          label: "Profile",
          active: false,
          icon: User,
        },
        {
          href: "/bank",
          label: "Bank Settings",
          active: false,
          icon: Landmark,
        },
      ],
    },
  ];

  if (
    pathname.includes("/tasks/annotator") &&
    pathname.includes("/analytics")
  ) {
    menu.push({
      groupLabel: "Analytics",
      menus: [
        {
          href: "/tasks/annotatorDashboard",
          label: "Overview",
          active: false,
          icon: BarChart2,
        },
      ],
    });
  }

  return menu;
}
