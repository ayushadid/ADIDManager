import React, { useContext, useState } from 'react';
import { UserContext } from '../../context/userContext';
import { SIDE_MENU_DATA, SIDE_MENU_USER_DATA } from '../../utils/data';

// Import all the necessary layout components
import SideMenu from './SideMenu';
import Navbar from './Navbar';
import BottomNavBar from './BottomNavBar';
import MobileSideMenu from './MobileSideMenu';
import AiCommandInterface from '../AiCommandInterface';

const DashboardLayout = ({ children, activeMenu }) => {
    // 1. Get user and notifications from the global context
    const { user, notifications } = useContext(UserContext);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // 2. Calculate the unread notification count
    const unreadCount = notifications.filter(n => !n.read).length;

    // 3. Determine which menu data to use based on the user's role
    const menuData = user?.role === 'admin' ? SIDE_MENU_DATA : SIDE_MENU_USER_DATA;

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <Navbar 
                activeMenu={activeMenu} 
                onMenuClick={() => setIsMobileMenuOpen(true)}
            />
            
            {/* The mobile slide-out menu */}
            <MobileSideMenu 
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                activeMenu={activeMenu}
                menuData={menuData}
                unreadCount={unreadCount}
            />

            {user && (
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar for Desktop (hidden on mobile) */}
                    <aside className="hidden md:block w-64 shrink-0 border-r border-gray-200 bg-white h-full overflow-y-auto">
                        <SideMenu 
                            activeMenu={activeMenu} 
                            menuData={menuData} 
                            unreadCount={unreadCount}
                        />
                    </aside>

                    {/* Main Content Area (scrollable) */}
                    <main className="flex-1 overflow-y-auto">
                        {/* Padding at the bottom for mobile to make space for the nav bar */}
                        <div className="px-6 py-4 pb-24 md:pb-6">
                            {children}
                        </div>
                    </main>
                </div>
            )}

            {/* Bottom Navigation for Mobile (hidden on desktop) */}
            <div className="md:hidden">
                <BottomNavBar menuItems={menuData} activeMenu={activeMenu} />
            </div>

            {/* AI Command Interface (admin only) */}
            {user?.role === 'admin' && <AiCommandInterface />}
        </div>
    );
};

export default DashboardLayout;