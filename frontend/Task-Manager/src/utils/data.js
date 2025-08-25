import {
    LuLayoutDashboard,
    LuUsers,
    LuClipboardCheck,
    LuSquarePlus,
    LuLogOut,
    LuSheet,   
    LuView,
    LuBell,
} from "react-icons/lu"

export const SIDE_MENU_DATA=[
    {
        id:"01",
        label:"Dashboard",
        icon:LuLayoutDashboard,
        path:"/admin/dashboard",
    },
    {
        id:"99",
    label: "Notifications",
    path: "/notifications",
    icon: LuBell,
  },
    {
        id:"02",
        label:"Manage Tasks",
        icon:LuClipboardCheck,
        path:"/admin/tasks",
    },
    {
        id:"03",
        label:"Create Task",
        icon:LuSquarePlus,
        path:"/admin/create-task",
    },
    {
        id:"04",
        label:"Team Members",
        icon:LuUsers,
        path:"/admin/users",
    },
    {
        id:"07",
      label: "My Day View",
      path: "/admin/my-day-view",
      icon: LuLayoutDashboard ,
    },
     {
    label: "Board",
    path: "/board",
    icon: LuView,
  },
    {
        id:"06",
    label: "Shared Sheet",
    path: "/shared-sheet",
    icon: LuSheet,
  },
    {
        id:"05",
        label:"Logout",
        icon:LuLogOut,
        path:"logout",
    },
];

export const SIDE_MENU_USER_DATA=[
    {
        id:"01",
        label:"Dashboard",
        icon:LuLayoutDashboard,
        path:"/user/dashboard",
    },
    {
        id:"99",
    label: "Notifications",
    path: "/notifications",
    icon: LuBell,
  },
    {
        id:"02",
        label:"My Tasks",
        icon:LuClipboardCheck,
        path:"/user/tasks",
    },
    {
        id:"07",
      label: "My Day View",
      path: "/user/my-day-view",
      icon: LuLayoutDashboard ,
    },
     {
    label: "Board",
    path: "/board",
    icon: LuView,
  },
    {
        id:"06",
    label: "Shared Sheet",
    path: "/shared-sheet",
    icon: LuSheet,
  },
    {
        id:"05",
        label:"Logout",
        icon:LuLogOut,
        path:"logout",
    },
];

export const PRIORITY_DATA=[
    {label:"Low",value:"Low"},
    {label:"Medium",value:"Medium"},
    {label:"High",value:"High"},
]

export const STATUS_DATA=[
    {label:"Pending",value:"Pending"},
    {label:"In Progress",value:"In Progress"},
    {label:"Completed",value:"Completed"},
]