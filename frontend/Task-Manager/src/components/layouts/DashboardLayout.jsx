import React, { useContext, useState } from 'react';
import { UserContext } from '../../context/userContext';
import { SIDE_MENU_DATA, SIDE_MENU_USER_DATA } from '../../utils/data';
import SideMenu from './SideMenu';
import Navbar from './Navbar';
import BottomNavBar from './BottomNavBar';
import MobileSideMenu from './MobileSideMenu';
import AiCommandInterface from '../AiCommandInterface';

const DashboardLayout = ({ children, activeMenu }) => {
    // 👇 1. Get 'notifications' from the context, not just the user
    const { user, notifications } = useContext(UserContext);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // 👇 2. Calculate the unread count here in the parent component
    const unreadCount = notifications.filter(n => !n.read).length;

    const menuData = user?.role === 'admin' ? SIDE_MENU_DATA : SIDE_MENU_USER_DATA;

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <Navbar 
                activeMenu={activeMenu} 
                onMenuClick={() => setIsMobileMenuOpen(true)}
            />
            
            <MobileSideMenu 
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                activeMenu={activeMenu}
                menuData={menuData}
                unreadCount={unreadCount} // 👈 3. Pass the count down
            />

            {user && (
                <div className="flex flex-1 overflow-hidden">
                    <aside className="hidden md:block w-64 shrink-0 border-r border-gray-200 bg-white h-full overflow-y-auto">
                        <SideMenu 
                            activeMenu={activeMenu} 
                            menuData={menuData} 
                            unreadCount={unreadCount} // 👈 3. Pass the count down
                        />
                    </aside>
                    <main className="flex-1 overflow-y-auto">
                        <div className="px-6 py-4 pb-24 md:pb-6">
                            {children}
                        </div>
                    </main>
                </div>
            )}

            <div className="md:hidden">
                <BottomNavBar menuItems={menuData} activeMenu={activeMenu} />
            </div>

            {user?.role === 'admin' && <AiCommandInterface />}
        </div>
    );
};

export default DashboardLayout;