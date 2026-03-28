import { useEffect, useState } from 'react';
import { exportToExcel } from '../utils/storage';
import { Download, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const DownloadRecord = () => {
    const [error, setError] = useState(false);
    const [downloaded, setDownloaded] = useState(false);

    const decodeData = (hash: string): any[] | null => {
        try {
            const decoded = decodeURIComponent(hash);
            const data = JSON.parse(decoded);
            
            // Check if it's the new compact format {h: header, r: records}
            if (data && typeof data === 'object' && 'h' in data && 'r' in data) {
                const header = data.h;
                const records = data.r;
                
                // Reconstruct full AttendanceRecord objects
                return records.map((r: any[]) => ({
                    id: r[0],
                    name: r[1],
                    role: 'student',
                    lectureName: header.l,
                    facultyName: header.f,
                    date: header.d,
                    startTime: header.s,
                    endTime: header.e,
                    timestamp: new Date().toISOString() // Approximate
                }));
            }
            
            // Fallback to old format (array of objects)
            if (Array.isArray(data)) {
                return data;
            }
            
            return null;
        } catch (e) {
            console.error("Failed to decode data", e);
            return null;
        }
    };

    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            const data = decodeData(hash);
            if (data) {
                // Auto trigger download
                exportToExcel(data, `shared_attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
                setDownloaded(true);
            } else {
                setError(true);
            }
        } else {
            setError(true);
        }
    }, []);

    const handleDownload = () => {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            const data = decodeData(hash);
            if (data) {
                exportToExcel(data, `shared_attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[60vh] px-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-8 md:p-12 text-center space-y-6 max-w-md w-full mx-auto"
            >
                {error ? (
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                            <AlertCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Invalid Link</h2>
                        <p className="text-slate-500">The download link is invalid or missing required data. Please scan the QR code again.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
                            <Download size={32} />
                        </div>
                        <h2 className="text-2xl pt-2 font-bold text-slate-800">Ready to Download</h2>
                        <p className="text-slate-500 text-sm">
                            {downloaded 
                                ? "Your Excel file download should have started automatically. If not, click the button below."
                                : "Click the button below to download your Excel file."}
                        </p>
                        <button
                            onClick={handleDownload}
                            className="mt-6 w-full py-3 bg-teal-600 hover:bg-teal-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg border border-transparent shadow-teal-500/20"
                        >
                            <Download size={20} className="text-teal-100" />
                            Download Excel File
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default DownloadRecord;
