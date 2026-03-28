import os

JSX = """    return (
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

                    <div className="glass-card p-8 space-y-6">
                        <h3 className="text-xl font-semibold flex items-center gap-2 border-b border-slate-800 pb-4">
                            <ClipboardList size={24} className="text-indigo-400" />
                            Lecture Details
                        </h3>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Faculty Name</label>
                                <input type="text" value={facultyName} onChange={e => setFacultyName(e.target.value)} className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Enter Faculty Name" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Lecture Name</label>
                                <input type="text" value={lectureName} onChange={e => setLectureName(e.target.value)} className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Enter Lecture Name" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Lecture Number</label>
                                <select value={lectureNumber} onChange={e => setLectureNumber(e.target.value)} className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none">
                                    <option value="" disabled>Select Lecture Number</option>
                                    {[1, 2, 3, 4, 5, 6, 7].map(num => (
                                        <option key={num} value={String(num)}>{num}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Time From</label>
                                    <input 
                                        type="text" 
                                        readOnly
                                        value={startTime} 
                                        onClick={() => setShowStartClock(true)} 
                                        className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors" 
                                        placeholder="Select Time" 
                                    />
                                    {showStartClock && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                                            <div className="absolute inset-0" onClick={() => setShowStartClock(false)} />
                                            <div className="relative z-10 shadow-2xl rounded-2xl overflow-hidden border border-slate-800 bg-black">
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
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Time To</label>
                                    <input 
                                        type="text" 
                                        readOnly
                                        value={endTime} 
                                        onClick={() => setShowEndClock(true)} 
                                        className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors" 
                                        placeholder="Select Time" 
                                    />
                                    {showEndClock && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                                            <div className="absolute inset-0" onClick={() => setShowEndClock(false)} />
                                            <div className="relative z-10 shadow-2xl rounded-2xl overflow-hidden border border-slate-800 bg-black">
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
                            className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-4 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
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
                            <p className="text-slate-400">Position your face in the frame.</p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setStage(1)} 
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black hover:bg-slate-700 text-slate-300 transition-colors border border-white/10"
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
                            <div className="relative flex-grow min-h-[300px] lg:min-h-[400px] glass-card overflow-hidden bg-black ring-1 ring-white/10 rounded-2xl">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 border-2 border-indigo-500/30 pointer-events-none" />
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
                                        <RefreshCw className="animate-spin text-indigo-400" size={32} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status/Controls Side */}
                        <div className="w-full lg:w-2/5 flex flex-col space-y-4">
                            <div className="glass-card p-5 space-y-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-slate-800 pb-3">
                                    <ClipboardList size={20} className="text-indigo-400" />
                                    Session Info
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                        <span className="text-slate-400">Faculty</span>
                                        <span className="text-white font-medium">{facultyName}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                        <span className="text-slate-400">Lecture</span>
                                        <span className="text-white font-medium">{lectureName} ({lectureNumber})</span>
                                    </div>
                                    <div className="flex justify-between pb-1">
                                        <span className="text-slate-400">Time</span>
                                        <span className="text-white font-medium">{startTime} - {endTime}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card p-6 space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <RefreshCw size={20} className="text-indigo-400" />
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
                                                <div className="w-12 h-12 rounded-full bg-black mx-auto flex items-center justify-center">
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
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/20 opacity-100 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-semibold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
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
"""

with open('src/pages/Attendance.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if line.strip() == "return (":
        return_idx = i
        break

header = lines[:return_idx]

with open('src/pages/Attendance.tsx', 'w', encoding='utf-8') as f:
    f.writelines(header)
    f.write(JSX)
