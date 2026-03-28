import { useState, useEffect } from 'react';
import { Download, Trash2, Search, QrCode, X, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAttendance, clearAttendance, exportToExcel, type AttendanceRecord, getRegistrations } from '../utils/storage';
import { QRCodeSVG } from 'qrcode.react';

const Records = () => {
    const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [showQR, setShowQR] = useState(false);
    const [qrData, setQrData] = useState('');
    const [viewMode, setViewMode] = useState<'lecture' | 'faculty'>('lecture');
    const [selectedLecture, setSelectedLecture] = useState<string | null>(null);

    useEffect(() => {
        const att = getAttendance();
        const regs = getRegistrations();
        
        const hydratedRecords = att.map((record: AttendanceRecord) => {
            if (!record.role) {
                const reg = regs.find(r => r.id === record.id);
                return { ...record, role: reg ? reg.role : 'student' };
            }
            return record;
        }).reverse();
        
        setAllRecords(hydratedRecords);
    }, []);

    const handleClearAttendance = () => {
        if (window.confirm('Are you sure you want to clear all attendance records? This action cannot be undone.')) {
            clearAttendance();
            setAllRecords([]);
            setSelectedLecture(null);
        }
    };

    const handleExportExcel = () => {
        exportToExcel(filteredRecords, `attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleGenerateQR = () => {
        if (filteredRecords.length === 0) {
            alert("No records to export");
            return;
        }
        
        // Compact Data Format for QR Stability
        // h: header (meta), r: records (data)
        const first = filteredRecords[0];
        const compactData = {
            h: {
                l: first.lectureName || '',
                f: first.facultyName || '',
                d: first.date || '',
                s: first.startTime || '',
                e: first.endTime || ''
            },
            r: filteredRecords
                .filter(record => record.role === 'student' || !record.role)
                .map(record => [record.id, record.name])
        };

        const baseUrl = window.location.origin;
        const dataString = JSON.stringify(compactData);
        const encodedData = encodeURIComponent(dataString);
        const shareUrl = `${baseUrl}/download#${encodedData}`;
        setQrData(shareUrl);
        setShowQR(true);
    };

    const uniqueLectures = Array.from(new Set(allRecords
        .filter((r: AttendanceRecord) => r.role === 'student' || !r.role)
        .map((r: AttendanceRecord) => r.lectureName)
        .filter(Boolean) as string[]
    ));

    const filteredRecords = allRecords.filter((record: AttendanceRecord) => {
        const matchesSearch = record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = filterDate ? record.date === filterDate : true;
        
        if (viewMode === 'faculty') {
            return record.role === 'faculty' && matchesSearch && matchesDate;
        } else {
            const matchesLecture = selectedLecture ? record.lectureName === selectedLecture : true;
            return (record.role === 'student' || !record.role) && matchesSearch && matchesDate && matchesLecture;
        }
    });

    return (
        <div className="max-w-7xl mx-auto space-y-8 relative pb-20">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
                <div className="space-y-2">
                    <h1 className="text-4xl font-black gradient-text">Reports & Insights</h1>
                    <p className="text-slate-400 font-medium">Explore and manage attendance data with precision.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleGenerateQR}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-100 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all border border-slate-800 shadow-xl"
                    >
                        <QrCode size={18} className="text-indigo-400" />
                        QR Connect
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/25"
                    >
                        <Download size={18} />
                        Export Excel
                    </button>
                    <button
                        onClick={handleClearAttendance}
                        className="px-5 py-2.5 bg-red-950/20 hover:bg-red-500/10 text-red-500 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all border border-red-900/30"
                    >
                        <Trash2 size={18} />
                        Wipe Records
                    </button>
                </div>
            </motion.div>

            {/* View Toggle Tabs */}
            <div className="flex p-1.5 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800 w-fit mx-auto lg:mx-0">
                <button
                    onClick={() => { setViewMode('lecture'); setSelectedLecture(null); }}
                    className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'lecture' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <ClipboardList size={18} />
                    Lecture Attendance
                </button>
                <button
                    onClick={() => { setViewMode('faculty'); setSelectedLecture(null); }}
                    className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'faculty' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Search size={18} />
                    Faculty Attendance
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Fixed Filter Sidebar */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-1 space-y-6"
                >
                    <div className="glass-card p-6 space-y-8 sticky top-6 border-slate-800/50 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-100 text-lg">Filters</h3>
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                <Search size={16} />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Search</label>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Name or ID..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-100 placeholder:text-slate-600"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Specific Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-100 [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-800/50 space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-medium text-slate-500">Filtered Records</span>
                                    <span className="text-2xl font-black text-indigo-400 leading-none">{filteredRecords.length}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(filteredRecords.length / (allRecords.length || 1)) * 100}%` }}
                                        className="h-full bg-indigo-500"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-tight">Out of {allRecords.length} total entries</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Dynamic Content Area */}
                <motion.div 
                    key={viewMode}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-3 space-y-6"
                >
                    {viewMode === 'lecture' && !selectedLecture && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {uniqueLectures.length > 0 ? uniqueLectures.map((lectureName: string) => {
                                const count = allRecords.filter((r: AttendanceRecord) => r.lectureName === lectureName).length;
                                return (
                                    <motion.button
                                        key={lectureName}
                                        whileHover={{ y: -5, scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedLecture(lectureName)}
                                        className="glass-card p-6 text-left group transition-all hover:border-indigo-500/50 relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-indigo-500/10 transition-colors" />
                                        <div className="space-y-4 relative z-10">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-lg">
                                                {lectureName.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">{lectureName}</h3>
                                                <p className="text-slate-400 text-xs font-medium">{count} Students Attended</p>
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            }) : (
                                <div className="col-span-full py-20 glass-card text-center space-y-4 opacity-50">
                                    <ClipboardList size={48} className="mx-auto text-slate-600" />
                                    <p className="text-slate-400 font-medium">No student sessions recorded yet.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {(selectedLecture || viewMode === 'faculty') && (
                        <div className="space-y-4">
                            {selectedLecture && (
                                <button 
                                    onClick={() => setSelectedLecture(null)}
                                    className="flex items-center gap-2 text-indigo-400 font-bold text-sm hover:text-indigo-300 transition-colors group"
                                >
                                    <X size={16} className="group-hover:rotate-90 transition-transform" />
                                    Clear Selection: {selectedLecture}
                                </button>
                            )}
                            
                            <div className="glass-card overflow-hidden shadow-2xl border-slate-800/50">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-800">
                                            <tr>
                                                <th className="px-6 py-5 font-black">User Profile</th>
                                                <th className="px-6 py-5 font-black text-center">Identity</th>
                                                <th className="px-6 py-5 font-black">Unique ID</th>
                                                {viewMode === 'lecture' && <th className="px-6 py-5 font-black">Faculty In-charge</th>}
                                                <th className="px-6 py-5 font-black">Time Log</th>
                                                <th className="px-6 py-5 font-black text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/40">
                                            <AnimatePresence mode="popLayout">
                                                {filteredRecords.map((record: AttendanceRecord, i: number) => (
                                                    <motion.tr
                                                        key={record.timestamp + record.id}
                                                        initial={{ opacity: 0, x: 10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.02 }}
                                                        className="hover:bg-indigo-500/5 transition-all group"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-inner transition-all ${record.role === 'faculty' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                                                    {record.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">{record.name}</p>
                                                                    <p className="text-[10px] text-slate-500 font-black tracking-tighter uppercase">{record.date}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${record.role === 'faculty' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                                                {record.role || 'student'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-400 text-sm font-mono tracking-tight">{record.id}</td>
                                                        {viewMode === 'lecture' && <td className="px-6 py-4 text-slate-300 text-sm font-medium">{record.facultyName || 'N/A'}</td>}
                                                        <td className="px-6 py-4">
                                                            <span className="text-slate-100 text-sm font-bold bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-800">
                                                                {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Marked</span>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </AnimatePresence>
                                            {filteredRecords.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500 italic font-medium">
                                                        No logs found matching these parameters.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* QR Code Modal Overlay */}
            <AnimatePresence>
                {showQR && (
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
                            className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm w-full space-y-6 shadow-xl relative"
                        >
                            <button 
                                onClick={() => setShowQR(false)}
                                className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                            
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-slate-100">Export Ready</h3>
                                <p className="text-slate-400 text-sm">Scan this QR code with your mobile device to download the attendance CSV.</p>
                            </div>
                            
                            <div className="bg-white p-4 rounded-2xl flex justify-center mx-auto w-fit">
                                <QRCodeSVG value={qrData} size={200} level="M" />
                            </div>
                            
                            <p className="text-xs text-center text-slate-500">
                                {filteredRecords.length} records encoded.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Records;
