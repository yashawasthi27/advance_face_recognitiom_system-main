import { useRef, useState, useEffect } from 'react';
import { Camera, CheckCircle, AlertCircle, RefreshCw, UserCheck, ClipboardList, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as faceapi from '@vladmandic/face-api';
import { detectFace } from '../utils/faceApi';
import { getRegistrations, saveAttendance, getAttendance, exportToCSV, type FaceRegistration } from '../utils/storage';
import TimeKeeper from 'react-timekeeper';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';

const Attendance = () => {
    // Stage 1: Form, Stage 2: Camera & Recognition
    const [stage, setStage] = useState<1 | 2>(1);
    const [attendanceType, setAttendanceType] = useState<'student' | 'faculty'>('student');
    const navigate = useNavigate();

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [status, setStatus] = useState<'idle' | 'recognizing' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [lastMarked, setLastMarked] = useState<{ name: string, time: string } | null>(null);

    const [facultyName, setFacultyName] = useState('');
    const [lectureName, setLectureName] = useState('');
    const [lectureNumber, setLectureNumber] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [formError, setFormError] = useState('');
    const [availableFaculty, setAvailableFaculty] = useState<FaceRegistration[]>([]);

    useEffect(() => {
        const regs = getRegistrations();
        const facultyRegs = regs.filter(r => r.role === 'faculty' && r.verified);
        setAvailableFaculty(facultyRegs);
    }, []);

    // Clock Modals controls
    const [showStartClock, setShowStartClock] = useState(false);
    const [showEndClock, setShowEndClock] = useState(false);

    // Real-time feedback loop removed to clean up UI
    useEffect(() => {
        // We no longer need the loop for drawing
    }, [isCameraReady, stage]);

    useEffect(() => {
        let isMounted = true;
        let localStream: MediaStream | null = null;

        const initCamera = async () => {
            if (stage !== 2) return;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (!isMounted) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                localStream = stream;
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setIsCameraReady(true);
            } catch (err) {
                console.error("Camera error:", err);
                if (isMounted) {
                    setStatus('error');
                    setMessage('Failed to access camera.');
                }
            }
        };

        if (stage === 2) {
            initCamera();
        } else {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (videoRef.current) videoRef.current.srcObject = null;
        }

        return () => {
            isMounted = false;
            setIsCameraReady(false);
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (videoRef.current) videoRef.current.srcObject = null;
        };
    }, [stage]);

    const handleProceed = () => {
        if (attendanceType === 'student') {
            if (!facultyName || !lectureName || !lectureNumber || !startTime || !endTime) {
                setFormError("Please fill in all lecture details before proceeding.");
                return;
            }
        }
        setFormError('');
        setStage(2);
    };

    const handleManualScan = async () => {
        if (!videoRef.current || status === 'recognizing') return;

        setStatus('recognizing');
        setMessage('Analyzing Face...');

        try {
            let finalDetection = null;
            const scanStartTime = Date.now();

            // Wait up to 5 seconds to detect a face
            while (Date.now() - scanStartTime < 5000) {
                const detection = await detectFace(videoRef.current);
                if (!detection) {
                    await new Promise(r => setTimeout(r, 100));
                    continue;
                }

                finalDetection = detection;
                break;
            }

            if (!finalDetection) {
                throw new Error('No face detected. Please look clearly at the camera.');
            }

            const registrations = getRegistrations();
            if (registrations.length === 0) throw new Error('No faces registered in the system.');

            let bestMatch = null;
            let minDistance = 1.0;

            for (const reg of registrations) {
                // Check all descriptors for this user (multi-template accuracy)
                const userDescriptors = reg.descriptors || ((reg as any).descriptor ? [(reg as any).descriptor] : []);
                
                for (const desc of userDescriptors) {
                    if (!desc) continue;
                    try {
                        const distance = faceapi.euclideanDistance(finalDetection.descriptor, new Float32Array(desc));
                        if (distance < minDistance) {
                            minDistance = distance;
                            if (distance < 0.6) bestMatch = reg; // Threshold
                        }
                    } catch (err) {
                        console.error("Distance calculation error:", err);
                    }
                }
            }

            if (bestMatch) {
                if (!bestMatch.verified) {
                    throw new Error('Your account is pending admin verification.');
                }
                if (bestMatch.role !== attendanceType) {
                    throw new Error(`This mode is for ${attendanceType}s only. Detected face belongs to a ${bestMatch.role}.`);
                }

                const attendance = getAttendance();
                const today = new Date().toISOString().split('T')[0];
                const alreadyMarked = attendance.find(a => a.id === bestMatch!.id && a.date === today);

                if (alreadyMarked) throw new Error(`${bestMatch.name} has already marked attendance today.`);

                saveAttendance(bestMatch.name, bestMatch.id, bestMatch.role, attendanceType === 'student' ? {
                    facultyName,
                    lectureName,
                    lectureNumber,
                    startTime,
                    endTime
                } : {
                    facultyName: bestMatch.name,
                    lectureName: bestMatch.subject || 'Faculty Session',
                    lectureNumber: 'N/A',
                    startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    endTime: 'Present'
                });
                setStatus('success');
                setMessage(`Attendance marked for ${bestMatch.name} (${bestMatch.role.toUpperCase()})`);
                setLastMarked({ name: bestMatch.name, time: new Date().toLocaleTimeString() });
                setTimeout(() => setStatus('idle'), 5000);
            } else {
                throw new Error('Face not recognized. Please register first.');
            }

        } catch (err: any) {
            setStatus('error');
            setMessage(err.message || 'Recognition failed.');
            setTimeout(() => setStatus('idle'), 5000);
        }
    };

    const handleQuitAndSave = () => {
        const attendance = getAttendance();
        const today = new Date().toISOString().split('T')[0];
        // Export only today's attendance for this specific lecture session
        const sessionRecords = attendance.filter(a =>
            a.date === today &&
            a.lectureName === lectureName &&
            a.facultyName === facultyName
        );

        if (sessionRecords.length > 0) {
            exportToCSV(sessionRecords, `attendance_${lectureName.replace(/\s+/g, '_')}_${today}.csv`);
        } else {
            alert('No attendance recorded for this session yet.');
        }

        // Return to home page
        navigate('/');
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 relative">
            {/* Stage 1: Lecture Details Form */}
            {stage === 1 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="max-w-xl mx-auto space-y-8"
                >
                    <div className="text-center space-y-2">
                        <h1 className="text-4xl font-bold gradient-text">Session Setup</h1>
                        <p className="text-slate-400">Please provide the lecture details to proceed.</p>
                    </div>

                    <div className="flex justify-center gap-4 mb-6">
                        <button
                            onClick={() => setAttendanceType('student')}
                            className={`px-6 py-2 rounded-full font-medium transition-colors ${attendanceType === 'student' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30' : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'}`}
                        >
                            Student Attendance
                        </button>
                        <button
                            onClick={() => setAttendanceType('faculty')}
                            className={`px-6 py-2 rounded-full font-medium transition-colors ${attendanceType === 'faculty' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30' : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700'}`}
                        >
                            Faculty Attendance
                        </button>
                    </div>

                    <div className="glass-card p-8 space-y-6">
                        <h3 className="text-xl font-semibold flex items-center gap-2 border-b border-slate-200 pb-4">
                            <ClipboardList size={24} className="text-teal-500" />
                            {attendanceType === 'student' ? 'Lecture Details' : 'Faculty Context'}
                        </h3>

                        {attendanceType === 'student' && (
                            <div className="space-y-5">
                                <div>
                                    <CustomSelect
                                        label="Faculty Name"
                                        value={facultyName}
                                        placeholder="Select Faculty"
                                        options={availableFaculty.map(fac => ({
                                            value: fac.name,
                                            label: `${fac.name} ${fac.department ? `(${fac.department})` : ''}`
                                        }))}
                                        onChange={(fname) => {
                                            setFacultyName(fname);
                                            const fac = availableFaculty.find(f => f.name === fname);
                                            if (fac && fac.subject) {
                                                setLectureName(fac.subject);
                                            }
                                        }}
                                    />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Lecture Name</label>
                                <input type="text" value={lectureName} onChange={e => setLectureName(e.target.value)} className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-teal-500 transition-colors" placeholder="Enter Lecture Name" />
                            </div>
                            <div>
                                <CustomSelect
                                    label="Lecture Number"
                                    value={lectureNumber}
                                    placeholder="Select Lecture Number"
                                    options={[1, 2, 3, 4, 5, 6, 7].map(num => ({
                                        value: String(num),
                                        label: String(num)
                                    }))}
                                    onChange={(val) => setLectureNumber(val)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Time From</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={startTime}
                                        onClick={() => setShowStartClock(true)}
                                        className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-teal-500 cursor-pointer transition-colors"
                                        placeholder="Select Time"
                                    />
                                    {showStartClock && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                                            <div className="absolute inset-0" onClick={() => setShowStartClock(false)} />
                                            <div className="relative z-10 shadow-xl rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                                                <TimeKeeper
                                                    time={startTime || '10:00 am'}
                                                    onChange={(data) => setStartTime(data.formatted12)}
                                                    onDoneClick={() => setShowStartClock(false)}
                                                    switchToMinuteOnHourSelect
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Time To</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={endTime}
                                        onClick={() => setShowEndClock(true)}
                                        className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-teal-500 cursor-pointer transition-colors"
                                        placeholder="Select Time"
                                    />
                                    {showEndClock && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                                            <div className="absolute inset-0" onClick={() => setShowEndClock(false)} />
                                            <div className="relative z-10 shadow-xl rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                                                <TimeKeeper
                                                    time={endTime || '11:00 am'}
                                                    onChange={(data) => setEndTime(data.formatted12)}
                                                    onDoneClick={() => setShowEndClock(false)}
                                                    switchToMinuteOnHourSelect
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        )}
                        {attendanceType === 'faculty' && (
                            <div className="py-8 text-center text-slate-600">
                                <p className="text-lg">You are marking attendance as a Faculty member.</p>
                                <p className="text-sm text-slate-500 mt-2">No lecture details required. Just proceed to scan your face.</p>
                            </div>
                        )}

                        <AnimatePresence>
                            {formError && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-4 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium"
                                >
                                    <AlertCircle size={18} />
                                    {formError}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={handleProceed}
                            className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-4 rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span>Proceed to Mark Attendance</span>
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Stage 2: Camera & Recognition */}
            {stage === 2 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4 lg:space-y-6 flex flex-col h-full"
                >
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold gradient-text">Mark Attendance</h1>
                            <p className="text-slate-500">Position your face in the frame.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setStage(1);
                                    setStatus('idle');
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-600 transition-colors border border-slate-200"
                            >
                                <ArrowLeft size={18} />
                                <span>Back</span>
                            </button>
                            <button
                                onClick={handleQuitAndSave}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors shadow-lg shadow-red-500/20"
                            >
                                <span>Quit & Save</span>
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8 items-stretch">
                        {/* Camera Side */}
                        <div className="w-full lg:w-3/5 flex flex-col">
                            <div className="relative flex-grow min-h-[300px] lg:min-h-[400px] glass-card overflow-hidden bg-slate-900 ring-1 ring-slate-800 rounded-2xl">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 border-2 border-teal-500/30 pointer-events-none" />
                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan z-20" />

                                <AnimatePresence>
                                    {status === 'recognizing' && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 bg-red-500/10 backdrop-blur-[1px] flex items-center justify-center z-30"
                                        >
                                            <div className="glass-card px-6 py-3 flex items-center gap-3">
                                                <RefreshCw className="animate-spin text-red-500" size={20} />
                                                <span className="font-semibold text-red-100">Analyzing Face...</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {!isCameraReady && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black z-40">
                                        <RefreshCw className="animate-spin text-teal-400" size={32} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status/Controls Side */}
                        <div className="w-full lg:w-2/5 flex flex-col space-y-4">
                            <div className="glass-card p-5 space-y-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-slate-800 pb-3 text-slate-100">
                                    <ClipboardList size={20} className="text-teal-400" />
                                    Session Info
                                </h3>
                                {attendanceType === 'student' ? (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                            <span className="text-slate-500">Faculty</span>
                                            <span className="text-slate-200 font-medium">{facultyName}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                            <span className="text-slate-500">Lecture</span>
                                            <span className="text-slate-200 font-medium">{lectureName} ({lectureNumber})</span>
                                        </div>
                                        <div className="flex justify-between pb-1">
                                            <span className="text-slate-500">Time</span>
                                            <span className="text-slate-200 font-medium">{startTime} - {endTime}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between pb-1">
                                            <span className="text-slate-500">Mode</span>
                                            <span className="text-slate-200 font-medium">Faculty</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="glass-card p-6 space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <RefreshCw size={20} className="text-teal-400" />
                                    Status Feed
                                </h3>

                                <div className="min-h-[160px] flex flex-col items-center justify-center text-center p-4">
                                    <AnimatePresence mode="wait">
                                        {status === 'idle' && (
                                            <motion.div
                                                key="idle"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="text-slate-500 space-y-2"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center">
                                                    <Camera size={24} />
                                                </div>
                                                <p className="text-sm">Ready to scan. Please click the button to begin.</p>
                                            </motion.div>
                                        )}

                                        {status === 'success' && (
                                            <motion.div
                                                key="success"
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="space-y-3"
                                            >
                                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto">
                                                    <CheckCircle size={32} className="text-emerald-500" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-emerald-400 text-lg">Success!</h4>
                                                    <p className="text-slate-300 text-sm">{message}</p>
                                                </div>
                                            </motion.div>
                                        )}

                                        {status === 'error' && (
                                            <motion.div
                                                key="error"
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="space-y-3"
                                            >
                                                <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center mx-auto">
                                                    <AlertCircle size={32} className="text-red-500" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-red-400 text-lg">Failed</h4>
                                                    <p className="text-slate-300 text-sm">{message}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <button
                                onClick={handleManualScan}
                                disabled={status === 'recognizing' || !isCameraReady}
                                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 shadow-teal-500/20 opacity-100 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-semibold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 font-bold"
                            >
                                <UserCheck size={20} />
                                <span>Mark My Attendance</span>
                            </button>

                            <AnimatePresence>
                                {lastMarked && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="glass-card p-4 border-emerald-500/20 bg-emerald-500/5"
                                    >
                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Last Attendance</p>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-semibold text-emerald-100">{lastMarked.name}</span>
                                            <span className="text-slate-400">{lastMarked.time}</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default Attendance;
