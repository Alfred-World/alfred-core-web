import type { NotificationsType } from '@/components/layout/shared/NotificationsDropdown';

export const notifications: NotificationsType[] = [
    {
        avatarImage: '/images/avatars/8.png',
        title: 'Congratulations Flora 🎉',
        subtitle: 'Won the monthly bestseller gold badge',
        time: '1h ago',
        read: false
    },
    {
        title: 'Cecilia Becker',
        avatarColor: 'secondary',
        subtitle: 'Accepted your connection',
        time: '12h ago',
        read: false
    },
    {
        avatarImage: '/images/avatars/3.png',
        title: 'Bernard Woods',
        subtitle: 'You have new message from Bernard Woods',
        time: 'May 18, 8:26 AM',
        read: true
    },
    {
        avatarIcon: 'tabler-chart-bar',
        title: 'Monthly report generated',
        subtitle: 'July month financial report is generated',
        avatarColor: 'info',
        time: 'Apr 24, 10:30 AM',
        read: true
    },
    {
        avatarText: 'MG',
        title: 'Application has been approved 🚀',
        subtitle: 'Your Meta Gadgets project application has been approved.',
        avatarColor: 'success',
        time: 'Feb 17, 12:17 PM',
        read: true
    },
    {
        avatarIcon: 'tabler-mail',
        title: 'New message from Harry',
        subtitle: 'You have new message from Harry',
        avatarColor: 'error',
        time: 'Jan 6, 1:48 PM',
        read: true
    }
]
