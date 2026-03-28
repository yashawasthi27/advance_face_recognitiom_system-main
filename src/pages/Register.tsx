import React, { useRef, useState, useEffect } from 'react';
import { Camera, CheckCircle, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFaceDescriptor } from '../utils/faceApi';
import { saveRegistration } from '../utils/storage';
import CustomSelect from '../components/CustomSelect';

const Register = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [name, setName] = useState('');
    const [userId, setUserId] = useState('');
    const [role, setRole] = useState<'student' | 'faculty'>('student');
    const [section, setSection] = useState('');
    const [course, setCourse] = useState('');
    const [department, setDepartment] = useState('');
    const [subject, setSubject] = useState('');
    const [idCardImage, setIdCardImage] = useState<string>('');
    const [status, setStatus] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [stage, setStage] = useState<1 | 2>(1);

    // Multi-template registration states
    const [captureStage, setCaptureStage] = useState<'front' | 'left' | 'right'>('front');
    const [descriptors, setDescriptors] = useState<number[][]>([]);
    const [finalPhoto, setFinalPhoto] = useState<string>('');


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
                    setErrorMessage('Failed to access camera. Please ensure permissions are granted.');
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
            setIsCameraReady(false);
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

    const handleProceed = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !userId || !idCardImage) {
            setErrorMessage('Please fill in all required fields.');
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
            return;
        }
        if (role === 'student' && (!section || !course)) {
            setErrorMessage('Please provide section and course.');
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
            return;
        }
        if (role === 'faculty' && (!department || !subject)) {
            setErrorMessage('Please provide department and subject.');
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
            return;
        }
        setStage(2);
    };

    const handleCaptureStage = async () => {
        if (!videoRef.current) return;
        setStatus('capturing');
        try {
            const descriptor = await getFaceDescriptor(videoRef.current);
            if (!descriptor) throw new Error('No face detected. Please ensure your face is clearly visible.');

            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth || 640;
            canvas.height = videoRef.current.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const photo = canvas.toDataURL('image/jpeg', 0.8);

            const newDescriptors = [...descriptors, Array.from(descriptor)];
            setDescriptors(newDescriptors);
            
            if (captureStage === 'front') {
                setFinalPhoto(photo);
                setCaptureStage('left');
                setStatus('idle');
            } else if (captureStage === 'left') {
                setCaptureStage('right');
                setStatus('idle');
            } else {
                // Final stage: Save registration
                saveRegistration({
                    id: userId,
                    name,
                    role,
                    ...(role === 'student' ? { section, course } : { department, subject }),
                    idCardImage,
                    verified: false,
                    photo: finalPhoto,
                    descriptors: newDescriptors
                } as any);

                setStatus('success');
                setTimeout(() => {
                    setName('');
                    setUserId('');
                    setSection('');
                    setCourse('');
                    setDepartment('');
                    setSubject('');
                    setIdCardImage('');
                    setDescriptors([]);
                    setCaptureStage('front');
                    setStage(1);
                    setStatus('idle');
                }, 3000);
            }
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.message || 'Capture failed.');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto space-y-8"
        >
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold gradient-text">Register Face</h1>
                <p className="text-slate-400">Join the attendance system by registering your face.</p>
            </div>

            {stage === 1 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-2xl mx-auto"
                >
                    <form onSubmit={handleProceed} className="glass-card p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <CustomSelect
                                    label="Registration Role"
                                    value={role}
                                    options={[
                                        { value: 'student', label: 'Student' },
                                        { value: 'faculty', label: 'Faculty' }
                                    ]}
                                    onChange={(val) => setRole(val as 'student' | 'faculty')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">{role === 'student' ? 'Enrollment No' : 'Employee ID'}</label>
                                <input
                                    type="text"
                                    required
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    placeholder={role === 'student' ? 'Enrollment Number' : 'Employee ID'}
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                />
                            </div>

                            {role === 'student' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Section</label>
                                        <input type="text" value={section} onChange={(e) => setSection(e.target.value)} className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" placeholder="e.g. B" />
                                    </div>
                                    <CustomSelect
                                        label="Course"
                                        value={course}
                                        placeholder="Select course"
                                        options={[
                                            { value: 'Bachelors of Computer Application (Artificial Intelligence and Data Science)', label: 'BCA (AI & DS)' }
                                        ]}
                                        onChange={(val) => setCourse(val)}
                                    />
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Department</label>
                                        <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" placeholder="e.g. SOCA" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Subject</label>
                                        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" placeholder="e.g. PBL" />
                                    </div>
                                </>
                            )}

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-400 mb-1">ID Card Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => setIdCardImage(reader.result as string);
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-semibold shadow-lg transition-all active:scale-[0.98]"
                        >
                            Proceed to Camera Capture
                        </button>

                        <AnimatePresence>
                            {status === 'error' && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg">
                                    {errorMessage}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>
                </motion.div>
            )}

            {stage === 2 && (
                <div className="flex flex-col lg:flex-row gap-8 items-stretch">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full lg:w-3/5 flex flex-col space-y-4"
                    >
                        <div className="relative flex-grow min-h-[300px] lg:min-h-[400px] glass-card overflow-hidden bg-slate-900 ring-1 ring-slate-800 group rounded-2xl">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="absolute inset-0 w-full h-full object-cover"
                                />

                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-scan z-20" />
                            <div className="absolute inset-0 border-2 border-indigo-500/30 pointer-events-none" />

                            <div className="absolute top-4 left-4 z-30">
                                <div className="bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-800 flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full animate-pulse ${captureStage === 'front' ? 'bg-indigo-500' : captureStage === 'left' ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-200">
                                        Step {captureStage === 'front' ? '1' : captureStage === 'left' ? '2' : '3'}: {captureStage === 'front' ? 'Look Straight' : captureStage === 'left' ? 'Turn Slightly Left' : 'Turn Slightly Right'}
                                    </span>
                                </div>
                            </div>

                            {!isCameraReady && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black backdrop-blur-sm z-30">
                                    <RefreshCw className="animate-spin text-indigo-400" size={32} />
                                </div>
                            )}

                            <AnimatePresence>
                                {status === 'capturing' && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-indigo-500/20 backdrop-blur-[2px] flex items-center justify-center z-40">
                                        <div className="text-white font-semibold flex items-center gap-2 bg-slate-950/50 px-6 py-3 rounded-2xl border border-white/10">
                                            <RefreshCw className="animate-spin" size={20} />
                                            Capturing {captureStage}...
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex justify-between items-center px-2">
                             <div className="text-xs text-slate-500 flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isCameraReady ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                {isCameraReady ? 'Biometric Engine Active' : 'Initializing Engine...'}
                            </div>
                            <div className="flex gap-1">
                                {[1, 2, 3].map((s) => (
                                    <div key={s} className={`h-1 w-8 rounded-full transition-all duration-500 ${descriptors.length >= s ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full lg:w-2/5 flex flex-col space-y-4"
                    >
                        <div className="glass-card p-6 space-y-4 flex-grow relative overflow-hidden">
                            <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
                            
                            <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
                                <CheckCircle className="text-indigo-400" size={20} />
                                Accuracy Verification
                            </h3>
                            
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 space-y-3">
                                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-tighter">Current Step Instruction</p>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        {captureStage === 'front' 
                                            ? "Position your face in the center of the frame and look directly at the camera." 
                                            : captureStage === 'left' 
                                            ? "Great! Now slowly turn your head about 30 degrees to the LEFT." 
                                            : "Almost done! Now slowly turn your head about 30 degrees to the RIGHT."}
                                    </p>
                                </div>

                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                        <span className="text-slate-500">Subject</span>
                                        <span className="text-slate-200 font-medium">{name}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                        <span className="text-slate-500">ID / Role</span>
                                        <span className="text-slate-200 font-medium font-mono text-xs">{userId} ({role.toUpperCase()})</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col gap-3">
                                <button
                                    onClick={handleCaptureStage}
                                    disabled={status === 'capturing' || !isCameraReady}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-4 rounded-xl font-bold text-white shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group"
                                >
                                    <Camera size={20} className="group-hover:rotate-12 transition-transform" />
                                    {captureStage === 'right' ? 'Complete Registration' : 'Capture ' + captureStage.charAt(0).toUpperCase() + captureStage.slice(1)}
                                    <ArrowRight size={18} className="ml-1 opacity-50" />
                                </button>
                                <button
                                    onClick={() => {
                                        setStage(1);
                                        setDescriptors([]);
                                        setCaptureStage('front');
                                    }}
                                    disabled={status === 'capturing'}
                                    className="w-full bg-slate-800 text-slate-300 py-3 rounded-xl border border-slate-700 hover:bg-slate-700 transition-all font-medium"
                                >
                                    Cancel & Reset
                                </button>
                            </div>
                        </div>

                        <AnimatePresence>
                            {status === 'success' && (
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-6 rounded-2xl flex flex-col items-center gap-3 text-center">
                                    <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                        <CheckCircle size={28} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-lg">Biometric Profile Created</h4>
                                        <p className="text-sm opacity-80 font-medium">Registration successful! <br />Pending For Admin Approval</p>
                                    </div>
                                </motion.div>
                            )}
                            {status === 'error' && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 text-sm">
                                    <AlertCircle size={20} />
                                    {errorMessage}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};

export default Register;
