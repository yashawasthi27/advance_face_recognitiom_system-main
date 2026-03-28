import { motion } from 'framer-motion';
import { ArrowRight, UserPlus, Camera, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
    const cards = [
        {
            title: 'Register Face',
            desc: 'Enlist new users by capturing their unique facial features.',
            icon: UserPlus,
            to: '/register',
            color: 'from-violet-500 to-purple-600'
        },
        {
            title: 'Take Attendance',
            desc: 'Mark daily attendance instantly using face recognition.',
            icon: Camera,
            to: '/attendance',
            color: 'from-fuchsia-500 to-pink-600'
        },
        {
            title: 'View Records',
            desc: 'Track and export attendance history with detailed logs.',
            icon: ClipboardList,
            to: '/records',
            color: 'from-indigo-500 to-blue-600'
        }
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <header className="text-center space-y-2">
                <motion.h1
                    className="text-5xl md:text-6xl font-bold tracking-tight"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    Face <span className="gradient-text">Detective</span>
                </motion.h1>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    A powerful, offline-first solution for seamless attendance tracking using advanced biometric recognition.
                </p>

            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card, i) => (
                    <motion.div
                        key={card.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Link to={card.to} className="group block h-full">
                            <div className="h-full p-8 glass-card hover:border-violet-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/15 flex flex-col items-start space-y-4">
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} shadow-lg shadow-black/20`}>
                                    <card.icon size={24} className="text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-100">{card.title}</h3>
                                <p className="text-slate-400 text-sm flex-grow">{card.desc}</p>
                                <div className="pt-4 flex items-center gap-2 text-violet-400 font-medium group-hover:gap-3 transition-all">
                                    <span>Get Started</span>
                                    <ArrowRight size={18} />
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default Home;
