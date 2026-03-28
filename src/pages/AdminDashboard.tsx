import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Trash2, Edit2, Check, X, Users, LogOut, Activity, Calendar, Clock, Trophy, ClipboardList, Camera, RefreshCw, UserCheck, AlertCircle, CheckCircle, Eye, ArrowRight } from 'lucide-react';
import { getRegistrations, updateRegistration, deleteRegistrationAndAttendance, getAttendance, updateRegistrationFace, verifyRegistration, clearAllData, type FaceRegistration } from '../utils/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { getFaceDescriptor } from '../utils/faceApi';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<FaceRegistration[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editUserId, setEditUserId] = useState('');
    const [viewingUser, setViewingUser] = useState<FaceRegistration | null>(null);
    const [activeRoleTab, setActiveRoleTab] = useState<'student' | 'faculty'>('student');

    const [stats, setStats] = useState({
        totalUsers: 0,
        totalCheckins: 0,
        todayCheckins: 0,
        mostActiveUser: 'N/A'
    });
    const [recentLogs, setRecentLogs] = useState<any[]>([]);

    // Face Updating State (Multi-template)
    const [updatingUser, setUpdatingUser] = useState<FaceRegistration | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [cameraStatus, setCameraStatus] = useState<'idle' | 'recognizing' | 'success' | 'error'>('idle');
    const [cameraMessage, setCameraMessage] = useState('');
    const [isCameraReady, setIsCameraReady] = useState(false);
    
    const [updateStage, setUpdateStage] = useState<'front' | 'left' | 'right'>('front');
    const [tempDescriptors, setTempDescriptors] = useState<number[][]>([]);
    const [tempPhoto, setTempPhoto] = useState<string>('');

    useEffect(() => {
        const isLoggedIn = sessionStorage.getItem('isAdminLoggedIn');
        if (!isLoggedIn) {
            navigate('/admin');
        } else {
            loadDashboardData();
        }
    }, [navigate]);

    const loadDashboardData = () => {
        const regs = getRegistrations();
        const att = getAttendance();
        setUsers(regs);

        const today = new Date().toISOString().split('T')[0];
        const todayAtt = att.filter(a => a.date === today);

        const userCounts = att.reduce((acc, curr) => {
            acc[curr.name] = (acc[curr.name] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        let maxCount = 0;
        let activeUser = 'N/A';
        for (const [name, count] of Object.entries(userCounts)) {
            if (count > maxCount) {
                maxCount = count;
                activeUser = name;
            }
        }

        setStats({
            totalUsers: regs.length,
            totalCheckins: att.length,
            todayCheckins: todayAtt.length,
            mostActiveUser: activeUser
        });

        // Enrich logs with user photo
        const enrichedLogs = [...att].reverse().slice(0, 10).map(log => {
            const user = regs.find(u => u.id === log.id);
            return {
                ...log,
                photo: user?.photo,
                isLive: (Date.now() - new Date(log.timestamp).getTime() < 300000) // 5 mins
            };
        });

        setRecentLogs(enrichedLogs);
    };

    useEffect(() => {
        let isMounted = true;
        let localStream: MediaStream | null = null;
        
        const initCamera = async () => {
            if (!updatingUser) return;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (!isMounted) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
                localStream = stream;
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
                setIsCameraReady(true);
            } catch (err) {
                if (isMounted) {
                    setCameraStatus('error');
                    setCameraMessage('Failed to access camera. Please check permissions.');
                }
            }
        };

        if (updatingUser) {
            initCamera();
        } else {
            setIsCameraReady(false);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (videoRef.current) videoRef.current.srcObject = null;
        }

        return () => {
            isMounted = false;
            if (localStream) localStream.getTracks().forEach(track => track.stop());
        };
    }, [updatingUser]);

    const handleUpdateFaceScan = async () => {
        if (!videoRef.current || !updatingUser || cameraStatus === 'recognizing') return;
        setCameraStatus('recognizing');
        try {
            const descriptor = await getFaceDescriptor(videoRef.current);
            if (!descriptor) throw new Error('No face detected. Please look clearly into the camera.');

            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(videoRef.current, 0, 0);
            const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            const newDescriptors = [...tempDescriptors, Array.from(descriptor)];
            setTempDescriptors(newDescriptors);

            if (updateStage === 'front') {
                setTempPhoto(photoDataUrl);
                setUpdateStage('left');
                setCameraStatus('idle');
            } else if (updateStage === 'left') {
                setUpdateStage('right');
                setCameraStatus('idle');
            } else {
                updateRegistrationFace(updatingUser.id, tempPhoto, newDescriptors);
                setCameraStatus('success');
                setCameraMessage('Biometric data successfully updated!');
                
                setTimeout(() => {
                    setUpdatingUser(null);
                    setCameraStatus('idle');
                    setUpdateStage('front');
                    setTempDescriptors([]);
                    loadDashboardData();
                }, 2500);
            }

        } catch (err: any) {
            setCameraStatus('error');
            setCameraMessage(err.message || 'Failed to capture face data.');
            setTimeout(() => setCameraStatus('idle'), 4000);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('isAdminLoggedIn');
        navigate('/admin');
    };

    const handleClearData = () => {
        if (window.confirm('Are you absolutely sure you want to wipe ALL user registrations and attendance records? This action cannot be undone!')) {
            clearAllData();
            loadDashboardData();
        }
    };

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete ${name} and all their attendance records? This action cannot be undone.`)) {
            deleteRegistrationAndAttendance(id);
            loadDashboardData();
        }
    };

    const startEdit = (user: FaceRegistration) => {
        setEditingId(user.id);
        setEditName(user.name);
        setEditUserId(user.id);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditUserId('');
    };

    const saveEdit = (oldId: string) => {
        if (!editName.trim() || !editUserId.trim()) return;
        updateRegistration(oldId, editUserId, editName);
        setEditingId(null);
        loadDashboardData();
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12 relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
                        <Shield size={24} />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold gradient-text">Overview Dashboard</h1>
                        <p className="text-slate-400 text-sm">Monitor system activity and manage profiles.</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={handleClearData}
                        className="px-4 py-2 bg-red-950/20 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all border border-red-900/40 shadow-xl"
                    >
                        <Trash2 size={16} />
                        Clear All Data
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all border border-slate-800 text-slate-100 shadow-sm"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ staggerChildren: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-5 space-y-2 border-l-4 border-l-teal-500 relative overflow-hidden group"
                >
                    <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                        <Users size={100} />
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-widest text-teal-500/80">Total Users</span>
                        <Users size={16} className="text-teal-400" />
                    </div>
                    <p className="text-4xl font-black text-slate-100">{stats.totalUsers}</p>
                </motion.div>
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card p-5 space-y-2 border-l-4 border-l-orange-500 relative overflow-hidden group"
                >
                    <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                        <ClipboardList size={100} />
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-widest text-orange-500/80">Total Check-ins</span>
                        <ClipboardList size={16} className="text-orange-400" />
                    </div>
                    <p className="text-4xl font-black text-slate-100">{stats.totalCheckins}</p>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-card p-5 space-y-2 border-l-4 border-l-emerald-500 relative overflow-hidden group"
                >
                    <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                        <Calendar size={100} />
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-500/80">Today's Check-ins</span>
                        <Calendar size={16} className="text-emerald-400" />
                    </div>
                    <p className="text-4xl font-black text-slate-100">{stats.todayCheckins}</p>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass-card p-5 space-y-2 border-l-4 border-l-blue-500 relative overflow-hidden group"
                >
                    <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                        <Trophy size={100} />
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-widest text-blue-500/80">Most Active</span>
                        <Trophy size={16} className="text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-slate-100 truncate block mt-1" title={stats.mostActiveUser}>
                        {stats.mostActiveUser}
                    </p>
                </motion.div>
            </motion.div>

            {/* Split Content Area */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
                {/* Main Table Column (2/3 width) */}
                <div className="col-span-1 lg:col-span-2 flex flex-col">
                    <div className="glass-card overflow-hidden flex-1 flex flex-col">
                        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <Users className="text-red-500" size={20} />
                                <h2 className="text-lg font-semibold text-slate-100">Registered Users Directory</h2>
                            </div>
                            
                            <div className="flex gap-2 p-1 bg-slate-900 rounded-lg border border-slate-800">
                                <button
                                    onClick={() => setActiveRoleTab('student')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeRoleTab === 'student' ? 'bg-teal-500 text-white shadow-teal-500/20 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    Students
                                </button>
                                <button
                                    onClick={() => setActiveRoleTab('faculty')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeRoleTab === 'faculty' ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    Faculty
                                </button>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left table-auto">
                                <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Photo</th>
                                        <th className="px-6 py-4 font-semibold">Name</th>
                                        <th className="px-6 py-4 font-semibold">ID / Role</th>
                                        <th className="px-6 py-4 font-semibold">Status</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {users.filter(u => u.role === activeRoleTab).map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-3">
                                                {user.photo ? (
                                                    <img src={user.photo} alt={user.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-700" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center ring-2 ring-slate-700">
                                                        <Users size={16} className="text-slate-400" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                {editingId === user.id ? (
                                                    <input 
                                                        type="text" 
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="bg-slate-900 border border-teal-500/50 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-teal-500 text-sm w-full transition-all text-slate-100"
                                                        placeholder="Enter new name"
                                                    />
                                                ) : (
                                                    <span className="font-medium text-slate-100">{user.name}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                {editingId === user.id ? (
                                                    <input 
                                                        type="text" 
                                                        value={editUserId}
                                                        onChange={(e) => setEditUserId(e.target.value)}
                                                        className="bg-slate-900 border border-teal-500/50 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-teal-500 text-sm w-full transition-all text-slate-100"
                                                        placeholder="Enter new ID"
                                                    />
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-slate-300 text-sm font-medium">{user.id}</span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border w-fit ${user.role === 'faculty' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                                            {user.role}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                {user.verified ? (
                                                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center gap-1 w-fit">
                                                        <CheckCircle size={12} /> Verified
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 text-xs font-semibold flex items-center gap-1 w-fit">
                                                        <AlertCircle size={12} /> Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {editingId === user.id ? (
                                                        <>
                                                            <button 
                                                                onClick={() => saveEdit(user.id)}
                                                                className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20"
                                                                title="Save"
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={cancelEdit}
                                                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors border border-slate-700"
                                                                title="Cancel"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {!user.verified && (
                                                                <button
                                                                    onClick={() => {
                                                                        verifyRegistration(user.id);
                                                                        loadDashboardData();
                                                                    }}
                                                                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors"
                                                                    title="Verify User"
                                                                >
                                                                    <UserCheck size={16} />
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => setViewingUser(user)}
                                                                className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors"
                                                                title="View Details"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    setUpdatingUser(user);
                                                                    setUpdateStage('front');
                                                                    setTempDescriptors([]);
                                                                }}
                                                                className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                                                title="Update Face Data"
                                                            >
                                                                <Camera size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => startEdit(user)}
                                                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                                                                title="Edit Profile"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(user.id, user.name)}
                                                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                                                title="Delete User"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.filter(u => u.role === activeRoleTab).length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                                No {activeRoleTab === 'student' ? 'students' : 'faculty members'} registered yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Column (1/3 width) */}
                <div className="col-span-1 flex flex-col h-full space-y-4">
                    <div className="glass-card flex-1 flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-slate-800 flex items-center gap-3 bg-slate-900/50">
                            <Activity className="text-red-500" size={20} />
                            <h2 className="text-lg font-semibold text-slate-100">Live Activity Feed</h2>
                        </div>
                        
                        <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                            <AnimatePresence initial={false}>
                                {recentLogs.length > 0 ? recentLogs.map((log: any, i: number) => (
                                    <motion.div 
                                        key={log.timestamp + log.id}
                                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.3, delay: i * 0.05 }}
                                        className="flex items-start gap-4 pb-4 border-b border-slate-800/50 last:border-0 last:pb-0 relative group"
                                    >
                                        <div className="relative flex-shrink-0">
                                            {log.photo ? (
                                                <img src={log.photo} alt={log.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-800 group-hover:ring-red-500/50 transition-all shadow-lg" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-red-500 shadow-lg shadow-slate-900/50">
                                                    <Clock size={16} />
                                                </div>
                                            )}
                                            {log.isLive && (
                                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse shadow-sm shadow-emerald-500/50" />
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-slate-100 font-bold text-sm truncate">
                                                    {log.name}
                                                </p>
                                                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                                    {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] uppercase font-black tracking-tight border ${log.role === 'faculty' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                                    {log.role || 'student'}
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-medium">scanned in</span>
                                            </div>

                                            <div className="mt-2 flex items-center gap-2">
                                                <div className="h-[2px] w-8 bg-gradient-to-r from-red-500/50 to-transparent rounded-full" />
                                                <span className="text-slate-200 text-xs font-bold px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/50 shadow-sm backdrop-blur-sm">
                                                    {log.lectureName || "No Lecture"}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-70">
                                        <Activity size={48} className="text-slate-700 animate-pulse" />
                                        <p className="text-sm font-medium">No recent activity detected.</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Face Update Modal */}
            <AnimatePresence>
                {updatingUser && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-lg w-full space-y-6 shadow-2xl relative"
                        >
                            <button 
                                onClick={() => setUpdatingUser(null)}
                                className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 transition-colors z-10"
                            >
                                <X size={20} />
                            </button>
                            
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                                    <Camera className="text-teal-500" /> Update Biometrics
                                </h3>
                                <p className="text-slate-400 text-sm">Scan new face descriptors for <strong className="text-slate-100">{updatingUser.name}</strong>.</p>
                            </div>
                            
                            <div className="relative aspect-video rounded-2xl bg-slate-800 overflow-hidden ring-1 ring-slate-700">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 border-2 border-teal-500/20 pointer-events-none" />
                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan z-20" />
                                
                                <div className="absolute top-4 left-4 z-30">
                                    <div className="bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-800 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-200">
                                            Stage: {updateStage.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {cameraStatus === 'recognizing' && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 bg-teal-500/10 backdrop-blur-[1px] flex items-center justify-center z-30"
                                        >
                                            <div className="glass-card px-6 py-3 flex items-center gap-3">
                                                <RefreshCw className="animate-spin text-teal-500" size={20} />
                                                <span className="font-semibold text-teal-100">Scanning {updateStage}...</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {!isCameraReady && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-40">
                                        <RefreshCw className="animate-spin text-teal-500" size={32} />
                                    </div>
                                )}
                            </div>

                            <AnimatePresence mode="wait">
                                {cameraStatus === 'success' && (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-3"
                                    >
                                        <CheckCircle size={20} />
                                        <span className="text-sm font-medium">{cameraMessage}</span>
                                    </motion.div>
                                )}

                                {cameraStatus === 'error' && (
                                    <motion.div
                                        key="error"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3"
                                    >
                                        <AlertCircle size={20} />
                                        <span className="text-sm font-medium">{cameraMessage}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            <div className="space-y-3">
                                <div className="flex gap-1 justify-center">
                                    {[1, 2, 3].map((s) => (
                                        <div key={s} className={`h-1 w-12 rounded-full transition-all ${tempDescriptors.length >= s ? 'bg-teal-500' : 'bg-slate-800'}`} />
                                    ))}
                                </div>
                                <button
                                    onClick={handleUpdateFaceScan}
                                    disabled={cameraStatus === 'recognizing' || !isCameraReady}
                                    className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-semibold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-white"
                                >
                                    <Camera size={20} />
                                    <span>{updateStage === 'right' ? 'Complete Update' : 'Capture ' + updateStage.charAt(0).toUpperCase() + updateStage.slice(1)}</span>
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View Details Modal */}
            <AnimatePresence>
                {viewingUser && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-lg w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
                        >
                            <button 
                                onClick={() => setViewingUser(null)}
                                className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 transition-colors z-10"
                            >
                                <X size={20} />
                            </button>
                            
                            <div className="space-y-4">
                                <h3 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                                    <Users className="text-teal-500" /> User Details
                                </h3>
                                
                                <div className="space-y-3 bg-slate-800/50 p-4 rounded-xl border border-slate-800/50">
                                    <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                        <span className="text-slate-400">Name</span>
                                        <span className="text-slate-100 font-medium">{viewingUser.name}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                        <span className="text-slate-400">ID</span>
                                        <span className="text-slate-100 font-medium">{viewingUser.id}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                        <span className="text-slate-400">Role</span>
                                        <span className="text-slate-100 font-medium uppercase">{viewingUser.role}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                        <span className="text-slate-400">Status</span>
                                        <span className={`font-semibold ${viewingUser.verified ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {viewingUser.verified ? 'Verified' : 'Pending Verification'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                        <span className="text-slate-400">Templates</span>
                                        <span className="text-slate-100 font-medium">{viewingUser.descriptors?.length || 1} templates stored</span>
                                    </div>
                                    
                                    {viewingUser.role === 'student' ? (
                                        <>
                                            <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                                <span className="text-slate-400">Section</span>
                                                <span className="text-slate-100 font-medium">{viewingUser.section}</span>
                                            </div>
                                            <div className="flex justify-between pb-2">
                                                <span className="text-slate-400">Course</span>
                                                <span className="text-slate-100 font-medium text-right max-w-[200px] truncate" title={viewingUser.course}>{viewingUser.course}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                                <span className="text-slate-400">Department</span>
                                                <span className="text-slate-100 font-medium">{viewingUser.department}</span>
                                            </div>
                                            <div className="flex justify-between pb-2">
                                                <span className="text-slate-400">Subject</span>
                                                <span className="text-slate-100 font-medium">{viewingUser.subject}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {viewingUser.photo && (
                                        <div className="space-y-2">
                                            <span className="text-slate-400 text-sm font-medium block">Registered Face</span>
                                            <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/50 flex justify-center p-2">
                                                <img src={viewingUser.photo} alt="Registered Face" className="max-h-48 object-contain opacity-90" />
                                            </div>
                                        </div>
                                    )}

                                    {viewingUser.idCardImage && (
                                        <div className="space-y-2">
                                            <span className="text-slate-400 text-sm font-medium block">ID Card</span>
                                            <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/50 flex justify-center p-2">
                                                <img src={viewingUser.idCardImage} alt="ID Card" className="max-h-48 object-contain opacity-90" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {!viewingUser.verified && (
                                    <button
                                        onClick={() => {
                                            verifyRegistration(viewingUser.id);
                                            loadDashboardData();
                                            setViewingUser(null);
                                        }}
                                        className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 py-4 rounded-xl font-semibold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <UserCheck size={20} />
                                        <span>Verify Now</span>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
