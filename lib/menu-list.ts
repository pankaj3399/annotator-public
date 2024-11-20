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
  const pathParts = pathname.split("/");
  const projectId = pathParts[pathParts.length - 1];
  const fpath = pathParts[1];
  const isProfilePage = pathname.includes("/profile");

  // If we're on the profile page, check if we came from a project context
  if (isProfilePage && pathParts.length > 3) {
    const previousPath = pathParts.slice(0, -2).join("/");
    if (previousPath.includes("/projects/")) {
      // Return project context menu with profile active
      return [
        {
          groupLabel: "",
          menus: [
            {
              href: `/dashboard/${projectId}`,
              label: "Dashboard",
              active: false,
              icon: LayoutGrid,
              submenus: [],
            },
            {
              href: "/annotator",
              label: "Annotator",
              active: false,
              icon: BookUser,
              submenus: [],
            },
            {
              href: "/chat",
              label: "Chat",
              active: false,
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
              active: false,
              icon: Folder,
            },
            {
              href: `/projects/${projectId}`,
              label: "Templates",
              active: false,
              icon: SquarePen,
            },
            {
              href: `/projects/task/${projectId}`,
              label: "Tasks",
              active: false,
              icon: ClipboardList,
            },
            {
              href: `/projects/analytics/view/${projectId}`,
              label: "Analytics",
              active: false,
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
          ],
        },
        {
          groupLabel: "User",
          menus: [
            {
              href: "/tasks/profile",
              label: "Profile",
              active: true,
              icon: User,
            },
          ],
        },
      ];
    }
  }

  if (fpath == "tasks") {
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
            href: `/tasks/all`,
            label: "All Tasks",
            active: pathname == "/tasks/all",
            icon: ClipboardList,
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

  if (
    projectId == "" ||
    projectId == "dashboard" ||
    projectId == "annotator" ||
    projectId == "chat"
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
            active: pathname == "/",
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

  return [
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
          active: pathname == "/",
          icon: Folder,
        },
        {
          href: `/projects/${projectId}`,
          label: "Templates",
          active:
            pathname.includes("/projects") &&
            !pathname.includes("/task") &&
            !pathname.includes("/ai-config") &&
            !pathname.includes("/analytics/view"),
          icon: SquarePen,
        },
        {
          href: `/projects/task/${projectId}`,
          label: "Tasks",
          active: pathname.includes("/task"),
          icon: ClipboardList,
        },
        {
          href: `/projects/analytics/view/${projectId}`,
          label: "Analytics",
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
          icon: Settings, // Import Settings from lucide-react
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
