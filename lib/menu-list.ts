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
} from "lucide-react";

type Submenu = {
  href: string;
  label: string;
  active?: boolean;
};

type Menu = {
  href: string;
  label: string;
  active: boolean;
  icon: LucideIcon;
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
            href: '/tasks/viewCourses',
            label:' View Courses',
            active:  pathname.includes('/viewCourses'),
            icon:Folder,
            submenus:[]
          },
          {
            href: '/tasks/myCourses',
            label:'My Courses',
            active:  pathname.includes('/myCourses'),
            icon:Folder,
            submenus:[]
          }
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
              !pathname.includes('/viewCourses')&&
              !pathname.includes("/annotatorDashboard"),
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
    fpath == "courses"  // Changed to check first path segment for courses
  ) {
    return [
      {
        groupLabel: "",
        menus: [
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
            href: '/courses',
            label: "Courses",
            active: pathname.startsWith('/courses'),  // Changed to handle all course paths
            icon: Folder
          }
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
            !pathname.includes('/leaderboard'),
          icon: SquarePen,
        },
        {
          href: `/projects/task/${projectId}`,
          label: "Tasks",
          active: pathname.includes("/task"),
          icon: ClipboardList,
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