import { NavLink } from 'react-router-dom';
import { Camera, UserPlus, ClipboardList, Home, ShieldAlert } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const Navbar = () => {
    const navItems = [
        { to: '/', icon: Home, label: 'Dashboard' },
        { to: '/records', icon: ClipboardList, label: 'Records' },
        { to: '/admin', icon: ShieldAlert, label: 'Admin' },
        { to: '/register', icon: UserPlus, label: 'Register Face' },
        { to: '/attendance', icon: Camera, label: 'Take Attendance' },
    ];

    return (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 glass-card flex items-center gap-8 shadow-2xl">
            {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                        cn(
                            "flex flex-col items-center gap-1 transition-all duration-300 group w-16",
                            isActive ? "text-violet-400 scale-110 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]" : "text-slate-400 hover:text-slate-200"
                        )
                    }
                >
                    <Icon size={24} className="group-hover:drop-shadow-[0_4px_8px_rgba(139,92,246,0.4)] transition-all duration-300" />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-center w-full min-h-[2rem] flex items-center justify-center leading-tight">{label}</span>
                </NavLink>
            ))}
        </nav>
    );
};

export default Navbar;
