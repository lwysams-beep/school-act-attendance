// =============================================================================
//  點名專用 APP - VERSION 2.7
//  功能: 1. 點名加入"無故缺席"選項 2. 更新CSV圖例
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
//  StudentRow COMPONENT (with React.memo)
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
                <button onClick={() => onStatusChange(student.id, 'late')} className={`px-3 py-1.5 text-sm font-bold rounded-full transition-all ${status === 'late' ? 'bg-blue-500 text-white scale-110 shadow-lg' : 'bg-blue-100 text-blue-800'}`}>遲到</button>
                {/* V2.7: 新增 "無故缺席" 按鈕 */}
                <button onClick={() => onStatusChange(student.id, 'absent')} className={`px-3 py-1.5 text-sm font-bold rounded-full transition-all ${status === 'absent' ? 'bg-red-500 text-white scale-110 shadow-lg' : 'bg-red-100 text-red-800'}`}>無故缺席</button>
                <button onClick={() => onStatusChange(student.id, 'sick')} className={`px-3 py-1.5 text-sm font-bold rounded-full transition-all ${status === 'sick' ? 'bg-orange-500 text-white scale-110 shadow-lg' : 'bg-orange-100 text-orange-800'}`}>病假</button>
                <button onClick={() => onStatusChange(student.id, 'leave')} className={`px-3 py-1.5 text-sm font-bold rounded-full transition-all ${status === 'leave' ? 'bg-yellow-500 text-white scale-110 shadow-lg' : 'bg-yellow-100 text-yellow-800'}`}>事假</button>
                <button onClick={() => onStatusChange(student.id, 'unknown')} className={`px-3 py-1.5 text-sm font-bold rounded-full transition-all ${status === 'unknown' ? 'bg-gray-500 text-white scale-110 shadow-lg' : 'bg-gray-100 text-gray-800'}`}>未知</button>
            </div>
        </div>
    );
});

// =============================================================================
//  AttendanceSheetView COMPONENT
// =============================================================================
const AttendanceSheetView = ({ activityName, students, today, onSave, onCancel }) => {
    const [attendance, setAttendance] = useState({});
    const [isSaving, setIsSaving] = useState(false);

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
//  主應用程式組件 (App)
// =============================================================================
const App = () => {
    const [user, setUser] = useState(null);
    const [activities, setActivities] = useState([]);
    const [activityConfigs, setActivityConfigs] = useState({});
    const [currentView, setCurrentView] = useState('activityList');
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser && currentView === 'adminConsole') {
                setCurrentView('adminLogin');
            }
        });
        const unsubscribeActivities = onSnapshot(collection(db, "activities"), (snapshot) => setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubscribeConfigs = onSnapshot(collection(db, "activity_configs"), (snapshot) => {
            const configs = {};
            snapshot.forEach(doc => { configs[doc.id] = doc.data(); });
            setActivityConfigs(configs);
        });
        return () => { unsubscribeAuth(); unsubscribeActivities(); unsubscribeConfigs(); };
    }, [currentView]);

    const today = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

    const todaysActivities = useMemo(() => {
        const uniqueActivityNames = new Set();
        const currentDayId = new Date().getDay();
        activities.forEach(act => {
            const isRegularDay = act.dayIds && act.dayIds.includes(currentDayId);
            const isSpecificDate = act.specificDates?.includes(today);
            if ((isRegularDay && !act.specificDates?.length) || isSpecificDate) {
                 uniqueActivityNames.add(act.activity);
            }
        });
        return Array.from(uniqueActivityNames).sort();
    }, [activities, today]);
    
    const studentsForSelectedActivity = useMemo(() => {
        if (!selectedActivity) return [];
        return activities
            .filter(act => act.activity === selectedActivity)
            .sort((a,b) => `${a.verifiedClass}-${a.verifiedClassNo}`.localeCompare(`${b.verifiedClass}-${b.verifiedClassNo}`));
    }, [activities, selectedActivity]);

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
    
    const handleSaveAttendance = useCallback(async (attendanceData) => {
        if (Object.keys(attendanceData).length === 0) return alert("沒有需要儲存的點名記錄。");
        try {
            const batch = writeBatch(db);
            Object.entries(attendanceData).forEach(([studentDocId, status]) => {
                const activityRef = doc(db, "activities", studentDocId);
                batch.update(activityRef, { [`attendance.${today}`]: status });
            });
            await batch.commit();
            alert("點名記錄已成功儲存！");
            setCurrentView('activityList');
        } catch (error) {
            console.error("批量更新點名狀態失敗:", error);
            alert("儲存失敗，請檢查網絡連線。");
        }
    }, [today]);

    const handleAdminLogin = async (email, password) => {
        try { await signInWithEmailAndPassword(auth, email, password); setCurrentView('adminConsole'); } 
        catch (error) { alert("Admin 登入失敗: " + error.message); }
    };

    const handleAdminLogout = async () => { await signOut(auth); setCurrentView('activityList'); };
    
    const handleSaveConfig = async (activityName, password) => {
        if (password.length !== 4) return alert("密碼必須為4位英文或數字！");
        try {
            await setDoc(doc(db, "activity_configs", activityName), { password }, { merge: true });
            alert(`「${activityName}」的密碼已更新。`);
        } catch (error) { alert("儲存失敗：" + error.message); }
    };
    
    // V2.7 REVISION: 更新 CSV 匯出邏輯
    const handleExportCSV = (activityName) => {
        const students = activities.filter(act => act.activity === activityName);
        if (students.length === 0) return alert("沒有學生資料可匯出。");

        const { location = '', time = '' } = students[0];
        const allDates = new Set();
        students.forEach(s => s.attendance && Object.keys(s.attendance).forEach(date => allDates.add(date)));
        const sortedDates = Array.from(allDates).sort();

        const symbolMap = { present: '✓', absent: 'A', sick: 'S', leave: 'L', late: 'L', unknown: '?' };
        
        let csvContent = `"${activityName} 出席總表"\n"地點：","${location}"\n"時間：","${time}"\n`;
        const studentHeaders = ['班別', '學號', '姓名', '性別', '電話'];
        const monthRow = [...studentHeaders, '月'];
        const dayRow = [...Array(studentHeaders.length).fill(''), '日'];
        
        let lastMonth = '';
        sortedDates.forEach(date => {
            const d = new Date(date);
            const month = d.getMonth() + 1;
            const day = d.getDate();
            monthRow.push(month.toString() !== lastMonth ? month : '');
            lastMonth = month.toString();
            dayRow.push(day);
        });
        csvContent += [monthRow, dayRow].map(row => row.map(field => `"${field}"`).join(',')).join('\n') + '\n';
        
        students.sort((a,b) => `${a.verifiedClass}-${a.verifiedClassNo}`.localeCompare(`${b.verifiedClass}-${b.verifiedClassNo}`))
            .forEach(s => {
                const studentData = [s.verifiedClass, s.verifiedClassNo, s.verifiedName, s.sex, s.rawPhone].map(f => f || '');
                const attendanceData = sortedDates.map(date => symbolMap[s.attendance?.[date]] || '');
                csvContent += [...studentData, '', ...attendanceData].map(field => `"${String(field)}"`).join(',') + '\n';
            });
        
        // V2.7: 更新圖例
        csvContent += '\n\n';
        csvContent += '"圖例:",\n';
        csvContent += '"✓","出席 (Present)"\n';
        csvContent += '"L","遲到 (Late)"\n';
        csvContent += '"S","病假 (Sick)"\n';
        csvContent += '"L","事假 (Leave)"\n';
        csvContent += '"A","無故缺席 (Absent)"\n';
        csvContent += '"?","未知 (Unknown)"\n';

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
                if (attendedCount === 0) status[name] = 'not_started';
                else if (attendedCount < totalStudents) status[name] = 'in_progress';
                else status[name] = 'completed';
            });
            return status;
        }, [activities, todaysActivities, today]);

        const statusColors = { completed: 'bg-green-500', in_progress: 'bg-yellow-500', not_started: 'bg-red-500' };
        const statusText = { completed: '已完成', in_progress: '進行中', not_started: '未開始' };

        return (
            <div className="p-4 md:p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center"><Settings className="mr-2"/> Admin Console</h1>
                    <button onClick={handleAdminLogout} className="flex items-center bg-red-500 text-white px-4 py-2 rounded-lg"><LogOut size={16} className="mr-2"/>登出</button>
                </div>
                
                <div className="mb-8 bg-white p-6 rounded-xl shadow-md">
                     <h2 className="text-xl font-bold mb-4 text-slate-700 flex items-center"><MonitorPlay className="mr-2"/> 今日點名狀態總覽</h2>
                     <div className="space-y-3">
                         {todaysActivities.length > 0 ? todaysActivities.map(name => (
                             <div key={name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <span className="font-semibold text-slate-700">{name}</span>
                                <div className="flex items-center gap-2">
                                    <Circle size={12} className={`text-white ${statusColors[todayAttendanceStatus[name]] || 'bg-gray-300'}`} fill="currentColor" />
                                    <span className="text-sm text-slate-500 w-16 text-right">{statusText[todayAttendanceStatus[name]] || '未知'}</span>
                                </div>
                             </div>
                         )) : <p className="text-center text-slate-400 py-4">今天沒有活動</p>}
                     </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold mb-4 text-slate-700">活動管理</h2>
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                        {allActivityNames.map(name => (
                            <div key={name} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                                <span className="flex-1 font-semibold text-slate-600 truncate">{name}</span>
                                <input 
                                    type="text" maxLength="4" placeholder="4位英數"
                                    defaultValue={activityConfigs[name]?.password || ''}
                                    onChange={(e) => setPasswords(prev => ({...prev, [name]: e.target.value}))}
                                    className="w-32 p-2 border rounded-md text-center font-mono"
                                />
                                <button onClick={() => passwords[name] && handleSaveConfig(name, passwords[name])} className="bg-blue-600 text-white p-2 rounded-lg disabled:bg-slate-300" disabled={!passwords[name]}>
                                    <Save size={20}/>
                                </button>
                                <button onClick={() => handleExportCSV(name)} className="bg-green-600 text-white p-2 rounded-lg">
                                    <Download size={20}/>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const ActivityListView = () => { /* ... (no change) ... */ 
        return (
            <div className="p-4 md:p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-slate-800">今日活動點名</h1>
                    <button onClick={() => setCurrentView('adminLogin')} className="flex items-center text-sm text-slate-500 hover:text-blue-600"><Settings size={16} className="mr-1"/>Admin</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {todaysActivities.map(name => (
                        <button key={name} onClick={() => handleActivitySelect(name)} className="bg-white p-6 rounded-xl shadow-md text-left hover:shadow-lg hover:ring-2 hover:ring-blue-500 transition-all">
                            <div className="flex items-center">
                                <div className="p-3 bg-blue-100 rounded-lg mr-4"><Activity size={24} className="text-blue-600"/></div>
                                <span className="text-xl font-bold text-slate-800">{name}</span>
                            </div>
                        </button>
                    ))}
                    {todaysActivities.length === 0 && <p className="text-slate-500 col-span-full text-center py-10">今天沒有已安排的活動。</p>}
                </div>
            </div>
        );
    };
    
    const PasswordModal = () => { /* ... (no change) ... */ 
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedActivity(null)}>
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-xs text-center" onClick={e => e.stopPropagation()}>
                    <Key size={32} className="mx-auto text-slate-400 mb-4"/>
                    <h3 className="text-lg font-bold mb-2">{selectedActivity}</h3>
                    <p className="text-sm text-slate-500 mb-4">請輸入4位數字點名密碼</p>
                    <input 
                        type="password" maxLength="4" value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                        className="w-full p-4 text-3xl tracking-[1rem] text-center border-2 rounded-lg mb-4"
                        autoFocus
                    />
                    {authError && <p className="text-red-500 text-sm mb-4">{authError}</p>}
                    <button onClick={handlePasswordSubmit} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg">進入</button>
                </div>
            </div>
        );
    };

    // --- 主渲染邏輯 ---
    const renderContent = () => {
        switch (currentView) {
            case 'activityList':
                return <ActivityListView />;
            case 'attendanceSheet':
                return (
                    <AttendanceSheetView
                        key={selectedActivity}
                        activityName={selectedActivity}
                        students={studentsForSelectedActivity}
                        today={today}
                        onSave={handleSaveAttendance}
                        onCancel={() => setCurrentView('activityList')}
                    />
                );
            case 'adminLogin':
                return <AdminLoginView />;
            case 'adminConsole':
                return user ? <AdminConsoleView /> : <AdminLoginView />;
            default:
                return <ActivityListView />;
        }
    };

    return (
        <div className="bg-slate-100 min-h-screen font-sans">
            {renderContent()}
            {currentView === 'activityList' && selectedActivity && <PasswordModal />}
        </div>
    );
};

export default App;
