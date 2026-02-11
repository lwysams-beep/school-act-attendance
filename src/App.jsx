// =============================================================================
//  點名專用 APP - VERSION 2.1
//  架構重寫: 徹底隔離點名頁的狀態，從根本上解決滾動跳轉問題
// =============================================================================
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Shield, Key, List, User, Activity, LogOut, Save, Settings, MonitorPlay, Download, Circle } from 'lucide-react';

// =============================================================================
//  FIREBASE IMPORTS & CONFIGURATION
// =============================================================================
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, onSnapshot, updateDoc, setDoc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDXZClMosztnJBd0CK6cpS6PPtJTTpgDkQ",
    authDomain: "school-act-directory.firebaseapp.com",
    projectId: "school-act-directory",
    storageBucket: "school-act-directory.firebasestorage.app",
    messagingSenderId: "351532359820",
    appId: "1:351532359820:web:29a353f54826ac80a41ba9",
    measurementId: "G-K5G20KH0RH"
};

const app = initializeApp(firebaseConfig, "attendanceApp");
const auth = getAuth(app);
const db = getFirestore(app);

// CSV 匯出工具函式
const exportToCSV = (csvString, filename) => {
  const blob = new Blob(["\ufeff" + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// =============================================================================
//  V2.1 REWRITTEN COMPONENT: StudentRow
//  使用 React.memo 進行性能優化，確保只有 props 變化的行才重新渲染
// =============================================================================
const StudentRow = React.memo(({ student, status, onStatusChange }) => {
    return (
        <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
            <div>
                <span className="text-sm bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded-full">{student.verifiedClass} ({student.verifiedClassNo})</span>
                <span className="ml-3 text-lg font-bold text-slate-800">{student.verifiedName}</span>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
                <button onClick={() => onStatusChange(student.id, 'present')} className={`px-3 py-1.5 text-sm font-bold rounded-full transition-all ${status === 'present' ? 'bg-green-500 text-white scale-110 shadow-lg' : 'bg-green-100 text-green-800'}`}>出席</button>
                <button onClick={() => onStatusChange(student.id, 'absent')} className={`px-3 py-1.5 text-sm font-bold rounded-full transition-all ${status === 'absent' ? 'bg-red-500 text-white scale-110 shadow-lg' : 'bg-red-100 text-red-800'}`}>缺席</button>
                <button onClick={() => onStatusChange(student.id, 'sick')} className={`px-3 py-1.5 text-sm font-bold rounded-full transition-all ${status === 'sick' ? 'bg-orange-500 text-white scale-110 shadow-lg' : 'bg-orange-100 text-orange-800'}`}>病假</button>
                <button onClick={() => onStatusChange(student.id, 'leave')} className={`px-3 py-1.5 text-sm font-bold rounded-full transition-all ${status === 'leave' ? 'bg-yellow-500 text-white scale-110 shadow-lg' : 'bg-yellow-100 text-yellow-800'}`}>事假</button>
                <button onClick={() => onStatusChange(student.id, 'unknown')} className={`px-3 py-1.5 text-sm font-bold rounded-full transition-all ${status === 'unknown' ? 'bg-gray-500 text-white scale-110 shadow-lg' : 'bg-gray-100 text-gray-800'}`}>未知</button>
            </div>
        </div>
    );
});

// =============================================================================
//  V2.1 REWRITTEN COMPONENT: AttendanceSheetView
//  這個組件現在管理自己的狀態，與 App 主組件解耦
// =============================================================================
const AttendanceSheetView = ({ activityName, students, today, onSave, onCancel }) => {
    const [attendance, setAttendance] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // 僅在組件首次加載時，初始化點名狀態
    useEffect(() => {
        const initialState = {};
        students.forEach(student => {
            const currentStatus = student.attendance?.[today];
            if (currentStatus) {
                initialState[student.id] = currentStatus;
            }
        });
        setAttendance(initialState);
    }, [students, today]);

    const handleSetAttendance = useCallback((studentId, status) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: status
        }));
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(attendance);
        setIsSaving(false);
    };

    return (
        <div className="p-4 md:p-8 flex flex-col h-screen">
            <div className="flex-shrink-0">
                <button onClick={onCancel} className="mb-4 text-blue-600 font-bold">← 返回活動列表</button>
                <h1 className="text-3xl font-bold text-slate-800">{activityName}</h1>
                <p className="text-slate-500 mb-6">日期: {today}</p>
            </div>
            
            <div className="flex-grow overflow-y-auto pb-24">
                <div className="space-y-2">
                    {students.map(student => (
                        <StudentRow 
                            key={student.id} 
                            student={student} 
                            status={attendance[student.id]} 
                            onStatusChange={handleSetAttendance}
                        />
                    ))}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm p-4 border-t-2">
                <button onClick={handleSave} disabled={isSaving || Object.keys(attendance).length === 0} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl text-lg flex items-center justify-center disabled:bg-gray-400">
                    {isSaving ? '儲存中...' : `儲存 ${Object.keys(attendance).length} 項記錄`}
                </button>
            </div>
        </div>
    );
};


// =============================================================================
//  主應用程式組件 (CEO)
// =============================================================================
const App = () => {
    // --- CEO 的狀態管理 (只管大事) ---
    const [user, setUser] = useState(null);
    const [activities, setActivities] = useState([]);
    const [activityConfigs, setActivityConfigs] = useState({});
    const [currentView, setCurrentView] = useState('activityList');
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [authError, setAuthError] = useState('');
    // V2.1: tempAttendance 狀態已從 App 移除

    // --- Firebase 資料監聽 ---
    useEffect(() => {
        // ... (no change)
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser && currentView === 'adminConsole') {
                setCurrentView('adminLogin');
            }
        });

        const unsubscribeActivities = onSnapshot(collection(db, "activities"), (snapshot) => {
            const acts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setActivities(acts);
        });

        const unsubscribeConfigs = onSnapshot(collection(db, "activity_configs"), (snapshot) => {
            const configs = {};
            snapshot.forEach(doc => {
                configs[doc.id] = doc.data();
            });
            setActivityConfigs(configs);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeActivities();
            unsubscribeConfigs();
        };
    }, [currentView]);

    // --- 數據處理 ---
    const today = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

    const todaysActivities = useMemo(() => {
        // ... (no change)
        const uniqueActivityNames = new Set();
        const currentDayId = new Date().getDay();

        activities.forEach(act => {
            const isRegularDay = act.dayIds && act.dayIds.includes(currentDayId);
            const isSpecificDate = act.specificDates && act.specificDates.length > 0 && act.specificDates.includes(today);
            
            if (isRegularDay && (!act.specificDates || act.specificDates.length === 0)) {
                 uniqueActivityNames.add(act.activity);
            } else if (isSpecificDate) {
                 uniqueActivityNames.add(act.activity);
            }
        });
        return Array.from(uniqueActivityNames).sort();
    }, [activities, today]);
    
    const studentsForSelectedActivity = useMemo(() => {
        // ... (no change)
        if (!selectedActivity) return [];
        return activities
            .filter(act => act.activity === selectedActivity)
            .sort((a,b) => `${a.verifiedClass}-${a.verifiedClassNo}`.localeCompare(`${b.verifiedClass}-${b.verifiedClassNo}`));
    }, [activities, selectedActivity]);

    // --- 事件處理 ---
    const handleActivitySelect = (activityName) => {
        setSelectedActivity(activityName);
        setPasswordInput('');
        setAuthError('');
    };
    
    const handlePasswordSubmit = () => {
        const config = activityConfigs[selectedActivity];
        if (config && config.password === passwordInput) {
            setCurrentView('attendanceSheet');
        } else {
            setAuthError('密碼錯誤，請重試。');
            setPasswordInput('');
        }
    };
    
    // V2.1: CEO 的存檔函式，接收來自部門主管的報告
    const handleSaveAttendance = useCallback(async (attendanceData) => {
        if (Object.keys(attendanceData).length === 0) {
            alert("沒有需要儲存的點名記錄。");
            return;
        }
        try {
            const batch = writeBatch(db);
            for (const studentDocId in attendanceData) {
                const status = attendanceData[studentDocId];
                const activityRef = doc(db, "activities", studentDocId);
                batch.update(activityRef, { [`attendance.${today}`]: status });
            }
            await batch.commit();
            alert("點名記錄已成功儲存！");
            setCurrentView('activityList'); // 儲存後返回列表
        } catch (error) {
            console.error("批量更新點名狀態失敗:", error);
            alert("儲存失敗，請檢查網絡連線。");
        }
    }, [today]);

    // Admin 和 CSV 相關的函式保持不變
    const handleAdminLogin = async (email, password) => { /* ... (no change) ... */ 
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setCurrentView('adminConsole');
        } catch (error) {
            alert("Admin 登入失敗: " + error.message);
        }
    };

    const handleAdminLogout = async () => { /* ... (no change) ... */ 
        await signOut(auth);
        setCurrentView('activityList');
    };
    
    const handleSaveConfig = async (activityName, password) => { /* ... (no change) ... */ 
        if (password.length !== 4 || !/^\d{4}$/.test(password)) {
            alert("密碼必須為4位數字！");
            return;
        }
        try {
            const configRef = doc(db, "activity_configs", activityName);
            await setDoc(configRef, { password: password }, { merge: true });
            alert(`「${activityName}」的密碼已更新。`);
        } catch (error) {
            alert("儲存失敗：" + error.message);
        }
    };
    
    const handleExportCSV = (activityName) => { /* ... (no change) ... */ 
        const students = activities.filter(act => act.activity === activityName);
        if (students.length === 0) {
            alert("沒有學生資料可匯出。");
            return;
        }

        const firstStudent = students[0];
        const location = firstStudent.location || '';
        const time = firstStudent.time || '';

        const allDates = new Set();
        students.forEach(s => {
            if (s.attendance) {
                Object.keys(s.attendance).forEach(date => allDates.add(date));
            }
        });
        const sortedDates = Array.from(allDates).sort();

        const symbolMap = { present: '✓', absent: 'A', sick: 'S', leave: 'L', unknown: '?' };
        
        let csvContent = `"${activityName} 出席總表"\n`;
        csvContent += `"地點：","${location}"\n`;
        csvContent += `"時間：","${time}"\n`;

        const studentHeaders = ['班別', '學號', '姓名', '性別', '電話'];
        const monthRow = [...studentHeaders, '月'];
        const dayRow = [...Array(studentHeaders.length).fill(''), '日'];
        
        let lastMonth = '';
        sortedDates.forEach(date => {
            const d = new Date(date);
            const month = d.getMonth() + 1;
            const day = d.getDate();
            
            if (month.toString() !== lastMonth) {
                monthRow.push(month);
                lastMonth = month.toString();
            } else {
                monthRow.push('');
            }
            dayRow.push(day);
        });
        csvContent += monthRow.map(field => `"${field}"`).join(',') + '\n';
        csvContent += dayRow.map(field => `"${field}"`).join(',') + '\n';
        
        const sortedStudents = students.sort((a,b) => `${a.verifiedClass}-${a.verifiedClassNo}`.localeCompare(`${b.verifiedClass}-${b.verifiedClassNo}`));

        sortedStudents.forEach(s => {
            const studentData = [
                s.verifiedClass || '', 
                s.verifiedClassNo || '', 
                s.verifiedName || '', 
                s.sex || '',
                s.rawPhone || ''
            ];
            
            const attendanceData = sortedDates.map(date => {
                const status = s.attendance?.[date];
                return status ? symbolMap[status] || '' : '';
            });

            const fullRow = [...studentData, '', ...attendanceData];
            csvContent += fullRow.map(field => `"${String(field)}"`).join(',') + '\n';
        });

        exportToCSV(csvContent, `${activityName}_出席總表`);
    };

    // --- 視圖渲染 ---
    const AdminLoginView = () => { /* ... (no change) ... */ 
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-sm p-8 bg-white rounded-2xl shadow-lg">
                    <div className="text-center mb-6">
                        <Shield size={40} className="mx-auto text-slate-500" />
                        <h2 className="text-2xl font-bold text-slate-800 mt-2">Admin Console</h2>
                    </div>
                    <input type="email" placeholder="電郵" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 mb-4 border rounded-lg" />
                    <input type="password" placeholder="密碼" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 mb-4 border rounded-lg" />
                    <button onClick={() => handleAdminLogin(email, password)} className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold">登入</button>
                    <button onClick={() => setCurrentView('activityList')} className="w-full mt-2 text-slate-500 py-2">返回活動列表</button>
                </div>
            </div>
        );
    };

    const AdminConsoleView = () => { /* ... (no change) ... */ 
        const allActivityNames = useMemo(() => Array.from(new Set(activities.map(a => a.activity))).sort(), [activities]);
        const [passwords, setPasswords] = useState({});

        const todayAttendanceStatus = useMemo(() => {
            const status = {};
            todaysActivities.forEach(name => {
                const studentsInActivity = activities.filter(a => a.activity === name);
                const totalStudents = studentsInActivity.length;
                if (totalStudents === 0) return;
                const attendedCount = studentsInActivity.filter(s => s.attendance && s.attendance[today]).length;
                if (attendedCount === 0) {
                    status[name] = 'not_started';
                } else if (attendedCount < totalStudents) {
                    status[name] = 'in_progress';
                } else {
                    status[name] = 'completed';
                }
            });
            return status;
        }, [activities, todaysActivities, today]);

        const statusColors = { completed: 'bg-green-500', in_progress: 'bg-yellow-500', not_started: 'bg-red-500' };
        const statusText = { completed: '已完成', in_progress: '進行中', not_started: '未開始' };

        return (
            <div className="p-4 md:p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center"><Settings className="mr-
