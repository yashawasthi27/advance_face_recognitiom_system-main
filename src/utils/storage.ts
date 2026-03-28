// @ts-ignore
import * as XLSX from 'xlsx-js-style';

export interface FaceRegistration {
    id: string; // Enrollment No or Employee ID
    name: string; // Full Name
    role: 'student' | 'faculty';
    verified: boolean;
    idCardImage?: string;
    section?: string;
    course?: string;
    department?: string;
    subject?: string;
    photo?: string;
    descriptors: number[][];
}

export interface AttendanceRecord {
    id: string;
    name: string;
    role: 'student' | 'faculty';
    timestamp: string;
    date: string;
    facultyName?: string;
    lectureName?: string;
    lectureNumber?: string;
    startTime?: string;
    endTime?: string;
}

const STORAGE_KEYS = {
    REGISTRATIONS: 'face_attendance_registrations',
    ATTENDANCE: 'face_attendance_records',
};

export const saveRegistration = (registration: FaceRegistration) => {
    const registrations = getRegistrations();
    if (registrations.some(r => r.id === registration.id || r.name.trim().toLowerCase() === registration.name.trim().toLowerCase())) {
        throw new Error('A user with this Full Name or ID already exists.');
    }
    const newReg = { ...registration, verified: false };
    registrations.push(newReg);
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
};

export const getRegistrations = (): FaceRegistration[] => {
    const data = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    if (!data) return [];
    
    let registrations: any[] = JSON.parse(data);
    
    // Migration: Convert single descriptor to descriptors array
    let migrated = false;
    registrations = registrations.map(reg => {
        if (reg.descriptor && !reg.descriptors) {
            const { descriptor, ...rest } = reg;
            migrated = true;
            return { ...rest, descriptors: [descriptor] };
        }
        return reg;
    });

    if (migrated) {
        localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(registrations));
    }
    
    return registrations as FaceRegistration[];
};

export const saveAttendance = (name: string, id: string, role: 'student' | 'faculty', details?: { facultyName: string, lectureName: string, lectureNumber: string, startTime: string, endTime: string }) => {
    const attendance = getAttendance();
    const now = new Date();
    const record: AttendanceRecord = {
        id,
        name,
        role,
        timestamp: now.toISOString(),
        date: now.toISOString().split('T')[0],
        ...details
    };
    attendance.push(record);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
};

export const getAttendance = (): AttendanceRecord[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : [];
};

export const clearAllData = () => {
    localStorage.removeItem(STORAGE_KEYS.REGISTRATIONS);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
};

export const clearRegistrations = () => {
    localStorage.removeItem(STORAGE_KEYS.REGISTRATIONS);
};

export const clearAttendance = () => {
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
};

export const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToExcel = (data: AttendanceRecord[], filename: string) => {
    if (data.length === 0) return;

    const workbook = XLSX.utils.book_new();
    
    // Extract session info
    const first = data[0];
    const dateStr = first.date || new Date().toISOString().split('T')[0];
    const facultyName = first.facultyName || 'N/A';
    const lectureName = first.lectureName || 'N/A';
    const lectureNumber = first.lectureNumber || 'N/A';
    const startTime = first.startTime || 'N/A';
    const endTime = first.endTime || 'N/A';

    const students = data.filter(r => r.role === 'student' || !r.role);

    // Style constants
    const headerStyle = { font: { bold: true, color: { rgb: "000000" } }, alignment: { horizontal: "center", vertical: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
    const dateStyle = { fill: { fgColor: { rgb: "FFB200" } }, font: { bold: true }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }, alignment: { horizontal: "center" } };
    const studentHeaderStyle = { fill: { fgColor: { rgb: "BDD7EE" } }, font: { bold: true }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }, alignment: { horizontal: "center" } };
    const facultyHeaderStyle = { fill: { fgColor: { rgb: "F8CBAD" } }, font: { bold: true }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }, alignment: { horizontal: "center" } };
    const cellStyle = { border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
    const summaryStyle = { font: { bold: true, color: { rgb: "00529B" } }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }, alignment: { horizontal: "center" } };

    // Function to create styled cell object
    const sc = (val: any, style: any) => ({ v: val, s: style });

    const wsData: any[][] = [
        [], // Row 1
        ['', '', '', sc('Date', dateStyle), sc(dateStr, dateStyle)], // Row 2
        [], // Row 3
        [], // Row 4
        [], // Row 5
        ['', sc("Student's Details", studentHeaderStyle), '', '', '', sc("Faculty Details", facultyHeaderStyle)], // Row 6
        ['', sc('Id', headerStyle), sc('Name', headerStyle), sc('Role', headerStyle), '', sc('Faculty Name', cellStyle), sc(facultyName, cellStyle)], // Row 7
    ];

    const facultyLabels = [
        ['Lecture Name', lectureName],
        ['Lecture Number', lectureNumber],
        ['Start Time', startTime],
        ['End Time', endTime]
    ];

    const maxRows = Math.max(students.length, facultyLabels.length + 1);

    for (let i = 0; i < maxRows; i++) {
        const row: any[] = ['', '', '', ''];
        
        if (students[i]) {
            row[1] = sc(students[i].id, cellStyle);
            row[2] = sc(students[i].name, cellStyle);
            row[3] = sc((students[i].role || 'student').charAt(0).toUpperCase() + (students[i].role || 'student').slice(1), cellStyle);
        } else if (i < facultyLabels.length + 1) { // Still in faculty block but student list finished
            row[1] = row[2] = row[3] = { v: '', s: {} };
        }

        row[4] = '';

        if (i < facultyLabels.length) {
            row[5] = sc(facultyLabels[i][0], cellStyle);
            row[6] = sc(facultyLabels[i][1], cellStyle);
        }

        wsData.push(row);
    }

    while (wsData.length < 12) wsData.push([]);
    
    wsData[12] = ['', '', '', '', '', sc('Total Student\'s Present', summaryStyle), sc(students.length, cellStyle)];

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    worksheet['!merges'] = [
        { s: { r: 5, c: 1 }, e: { r: 5, c: 3 } }, // Student's Details (B6-D6)
        { s: { r: 5, c: 5 }, e: { r: 5, c: 6 } }, // Faculty Details (F6-G6)
    ];

    worksheet['!cols'] = [
        { wch: 5 }, { wch: 22 }, { wch: 30 }, { wch: 12 }, { wch: 5 }, { wch: 25 }, { wch: 25 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, filename);
};

export const updateRegistration = (oldId: string, newId: string, newName: string) => {
    const registrations = getRegistrations();
    const updatedRegistrations = registrations.map(reg => {
        if (reg.id === oldId) {
            return { ...reg, id: newId, name: newName };
        }
        return reg;
    });
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(updatedRegistrations));

    const attendance = getAttendance();
    const updatedAttendance = attendance.map(att => {
        if (att.id === oldId) {
            return { ...att, id: newId, name: newName };
        }
        return att;
    });
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updatedAttendance));
};

export const updateRegistrationFace = (id: string, newPhoto: string, newDescriptors: number[][]) => {
    const registrations = getRegistrations();
    const updatedRegistrations = registrations.map(reg => {
        if (reg.id === id) {
            return { ...reg, photo: newPhoto, descriptors: newDescriptors };
        }
        return reg;
    });
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(updatedRegistrations));
};

export const deleteRegistrationAndAttendance = (userId: string) => {
    const registrations = getRegistrations();
    const filteredRegistrations = registrations.filter(reg => reg.id !== userId);
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(filteredRegistrations));

    const attendance = getAttendance();
    const filteredAttendance = attendance.filter(att => att.id !== userId);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(filteredAttendance));
};

export const verifyRegistration = (id: string) => {
    const registrations = getRegistrations();
    const updatedRegistrations = registrations.map(reg => {
        if (reg.id === id) {
            return { ...reg, verified: true };
        }
        return reg;
    });
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(updatedRegistrations));
};
