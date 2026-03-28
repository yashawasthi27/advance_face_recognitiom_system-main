import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowRight } from 'lucide-react';

interface PasswordGuardProps {
    children: React.ReactNode;
}

const PasswordGuard: React.FC<PasswordGuardProps> = ({ children }) => {
    const [password, setPassword] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [error, setError] = useState(false);



    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === '0027') {
            setIsUnlocked(true);
        } else {
            setError(true);
            setTimeout(() => setError(false), 2000);
        }
    };

    if (isUnlocked) {
        return <>{children}</>;
    }

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card max-w-md w-full p-8 space-y-8"
            >
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        {/* Red security glow */}
                        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
                        <Lock className="text-red-500 z-10" size={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-100 tracking-tight">Access Restricted</h2>
                    <p className="text-slate-400">Please enter the passcode to access this section.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full bg-slate-900/50 border ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-800 focus:ring-red-500/50'} rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 transition-all text-slate-100 placeholder:text-slate-500 caret-transparent`}
                                placeholder="••••"
                                maxLength={4}
                                autoFocus
                            />
                        </div>
                        {error && (
                            <motion.p 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-red-500 text-sm text-center font-medium"
                            >
                                Incorrect passcode
                            </motion.p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-all flex items-center justify-center gap-2 group"
                    >
                        Unlock Access
                        <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                    </button>
                </form>
                

            </motion.div>
        </div>
    );
};

export default PasswordGuard;
