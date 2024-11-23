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
  const cleanPathname = pathname.replace(/\/profile$/, '');
  const pathParts = pathname.split("/");
  const fpath = pathParts[1];
  const isProfilePage = pathname.includes("/profile");

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
            active: pathname.includes("/profile"),
            icon: User,
          },
        ],
      },
    ];
  }

  // Extract projectId from URL
  let projectId = "";
  
  // First try to get projectId from settings, ai-config, or task paths
  const settingsMatch = pathname.match(/\/projects\/settings\/([^\/]+)/);
  const aiConfigMatch = pathname.match(/\/projects\/ai-config\/([^\/]+)/);
  const taskMatch = pathname.match(/\/projects\/task\/([^\/]+)/);
  const analyticsMatch = pathname.match(/\/projects\/analytics\/view\/([^\/]+)/);
  const projectsMatch = pathname.match(/\/projects\/([^\/]+)$/);
  const dashboardMatch = pathname.match(/\/dashboard\/([^\/]+)/);

  if (settingsMatch) {
    projectId = settingsMatch[1];
  } else if (aiConfigMatch) {
    projectId = aiConfigMatch[1];
  } else if (taskMatch) {
    projectId = taskMatch[1];
  } else if (analyticsMatch) {
    projectId = analyticsMatch[1];
  } else if (projectsMatch) {
    projectId = projectsMatch[1];
  } else if (dashboardMatch) {
    projectId = dashboardMatch[1];
  }

  // For root, dashboard, annotator, or chat paths without project context
  if (
    (!projectId && !isProfilePage) &&
    (pathname === "/" ||
      pathname === "/dashboard" ||
      pathname === "/annotator" ||
      pathname === "/chat")
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
            label: "Annotator",
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
        ],
      },
      {
        groupLabel: "User",
        menus: [
          {
            href: "/profile",
            label: "Profile",
            active: pathname.includes("/profile"),
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
          label: "Annotator",
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
            !pathname.includes("/settings"),
          icon: SquarePen,
        },
        {
          href: `/projects/task/${projectId}`,
          label: "Tasks",
          active: pathname.includes("/task"),
          icon: ClipboardList,
        },
        // {
        //   href: `/projects/analytics/view/${projectId}`,
        //   label: "Analytics",
        //   active: pathname.includes("/analytics/view"),
        //   icon: BarChart2,
        // },
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
      ],
    },
    {
      groupLabel: "User",
      menus: [
        {
          href: "/profile",
          label: "Profile",
          active: pathname.includes("/profile"),
          icon: User,
        },
      ],
    },
  ];

  // Add Analytics group for annotator's analytics page
  if (pathname.includes("/tasks/annotator") && pathname.includes("/analytics")) {
    menu.push({
      groupLabel: "Analytics",
      menus: [
        {
          href: "/tasks/annotatorDashboard",
          label: "Overview",
          active: false, // This will not be active since it redirects
          icon: BarChart2,
        },
      ],
    });
  }

  return menu;
}