import type { ShortcutsType } from "@/components/layout/shared/ShortcutsDropdown";

export const shortcuts: ShortcutsType[] = [
    {
        url: '/apps/calendar',
        icon: 'tabler-calendar',
        title: 'Calendar',
        subtitle: 'Appointments'
    },
    {
        url: '/apps/invoice/list',
        icon: 'tabler-file-dollar',
        title: 'Invoice App',
        subtitle: 'Manage Accounts'
    },
    {
        url: '/apps/user/list',
        icon: 'tabler-user',
        title: 'Users',
        subtitle: 'Manage Users'
    },
    {
        url: '/apps/roles',
        icon: 'tabler-users-group',
        title: 'Role Management',
        subtitle: 'Permissions'
    },
    {
        url: '/',
        icon: 'tabler-device-desktop-analytics',
        title: 'Dashboard',
        subtitle: 'User Dashboard'
    },
    {
        url: '/pages/account-settings',
        icon: 'tabler-settings',
        title: 'Settings',
        subtitle: 'Account Settings'
    }
]
