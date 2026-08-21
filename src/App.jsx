<!DOCTYPE html>
<html lang="zh-HK">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>香海正覺蓮社佛教正覺蓮社學校 - 權限管理雲端平台 V1.19</title>
    
    <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-compat.js"></script>

    <style>
        body { display: flex; flex-direction: column; height: 100vh; margin: 0; font-family: 'Comic Sans MS', 'Chalkboard SE', 'Fredoka One', 'Segoe UI', Tahoma, sans-serif; background-color: #ffffff; color: #333; }
        ::-webkit-scrollbar { width: 10px; }
        ::-webkit-scrollbar-track { background: #f1f2f6; }
        ::-webkit-scrollbar-thumb { background: #3498db; border-radius: 5px; border: 2px solid #fff; }

        #login-screen {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-image: url('https://drive.google.com/thumbnail?id=1ndm7nhWk0SD9N6A75MmKMjcv5ecZ6_kp&sz=w2000');
            background-size: cover; background-position: center; display: flex; justify-content: center; align-items: center; z-index: 1000;
        }
        #login-screen::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(5px); z-index: 1; }
        .login-box { position: relative; z-index: 2; background: white; padding: 50px 40px; border-radius: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }
        .login-box img { width: 100px; margin-bottom: 20px; }
        .login-box h2 { color: #546e7a; margin-top: 0; font-size: 24px; }
        .google-btn { background-color: #fff; border: 2px solid #e0e0e0; border-radius: 30px; padding: 12px 25px; font-size: 16px; font-weight: bold; color: #333; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 15px; margin: 30px auto 0; transition: all 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .google-btn:hover { background-color: #f8f9fa; box-shadow: 0 6px 10px rgba(0,0,0,0.1); transform: translateY(-2px); }
        .google-btn img { width: 24px; height: 24px; margin: 0; }

        .main-content { flex-grow: 1; display: none; flex-direction: column; overflow-y: auto; position: relative; } 
        
        .banner-header { position: relative; background-image: url('https://drive.google.com/thumbnail?id=1ndm7nhWk0SD9N6A75MmKMjcv5ecZ6_kp&sz=w2000'); background-size: cover; background-position: center; padding: 30px 50px; display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 6px solid #e74c3c; }
        .banner-header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to bottom, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 1)); z-index: 1; }
        
        .header-content, .user-info { position: relative; z-index: 2; }
        .header-content { display: flex; align-items: center; gap: 20px; }
        .title-logo { width: 70px; height: auto; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }
        .header-content h1 { margin: 0; font-size: 32px; color: #546e7a; text-shadow: 2px 2px 0px #ecf0f1, 4px 4px 5px rgba(0,0,0,0.15); letter-spacing: 1px; font-weight: 900; }
        
        .user-info { background: #f1c40f; border: none; padding: 8px 18px; border-radius: 30px; font-size: 15px; color: #d35400; font-weight: bold; display: flex; align-items: center; gap: 10px; }
        .logout-btn { background: #e74c3c; color: white; border: none; padding: 4px 12px; border-radius: 15px; font-size: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .logout-btn:hover { background: #c0392b; }

        .grid-container { padding: 50px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 35px; }
        .app-card { background-color: transparent; border: none; border-radius: 25px; cursor: pointer; transition: all 0.3s ease; overflow: hidden; aspect-ratio: 1 / 1; position: relative; }
        .app-card:hover { transform: scale(1.05); box-shadow: 0 10px 20px rgba(0,0,0,0.08); }
        .app-card:active { transform: scale(0.95); }
        .app-icon { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s; }
        .restricted:hover { box-shadow: 0 10px 20px rgba(231, 76, 60, 0.15); }

        /* 後台管理按鈕 (預設隱藏 display: none) */
        .admin-btn { 
            display: none; 
            position: fixed; bottom: 30px; right: 30px; background: #2ecc71; color: #fff; border: none; padding: 15px 25px; border-radius: 30px; font-size: 16px; font-weight: bold; cursor: pointer; z-index: 100; transition: all 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.1); 
        }
        .admin-btn:hover { transform: translateY(-3px); box-shadow: 0 6px 15px rgba(0,0,0,0.15); }
        .admin-btn:active { transform: translateY(0); box-shadow: 0 2px 5px rgba(0,0,0,0.1); }

        .modal { display: none; position: fixed; z-index: 200; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); backdrop-filter: blur(3px); }
        .modal-content { background: #ffffff; color: #333; border: none; box-shadow: 0 10px 30px rgba(0,0,0,0.2); margin: 5% auto; padding: 30px; border-radius: 25px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; }
        .tabs { display: flex; border-bottom: 2px solid #ecf0f1; margin-bottom: 20px; }
        .tab { padding: 10px 20px; cursor: pointer; font-weight: bold; color: #95a5a6; }
        .tab.active { border-bottom: 3px solid #e74c3c; color: #e74c3c; margin-bottom: -2px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px; color: #3498db; }
        .form-group input[type="text"] { width: 100%; padding: 10px; box-sizing: border-box; border: 2px solid #bdc3c7; border-radius: 12px; background: #f8f9fa; color: #333; font-weight: bold; transition: 0.2s;}
        .form-group input[type="text"]:focus { outline: none; border-color: #3498db; background: #fff; }
        .btn { padding: 10px 15px; border: none; border-radius: 12px; cursor: pointer; font-weight: bold; margin-left: 5px; transition: 0.2s; }
        .btn:hover { opacity: 0.9; }
        .btn:active { transform: scale(0.95); }
        .btn-green { background-color: #2ecc71; color: white; }
        .btn-gray { background-color: #95a5a6; color: white; }
        .btn-red { background-color: #e74c3c; color: white; }
        .btn-blue { background-color: #3498db; color: white; }
        .btn-small { padding: 6px 10px; font-size: 13px; }
        .manage-list { list-style: none; padding: 0; }
        .manage-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; border: 2px solid #ecf0f1; background: #fdfefe; border-radius: 15px; margin-bottom: 10px; }
        .manage-item-info { font-size: 15px; font-weight: bold; color: #2c3e50; }
        .manage-actions { display: flex; gap: 8px; }
    </style>
</head>
<body>

<div id="login-screen">
    <div class="login-box">
        <img src="https://drive.google.com/thumbnail?id=1wfosMc8tBrPZTmOavb6shk1R7Gnv9FUn&sz=w500" alt="校徽">
        <h2>香海正覺蓮社<br>佛教正覺蓮社學校</h2>
        <p style="color: #7f8c8d; font-size: 14px;">一站式教師行政平台</p>
        <button class="google-btn" onclick="loginWithGoogle()">
            <img src="https://cdn-icons-png.flaticon.com/512/2991/2991148.png" alt="Google"> 
            使用 Google 帳號登入
        </button>
    </div>
</div>

<div class="main-content" id="main-content">
    <div class="banner-header">
        <div class="header-content">
            <img src="https://drive.google.com/thumbnail?id=1wfosMc8tBrPZTmOavb6shk1R7Gnv9FUn&sz=w500" alt="校徽" class="title-logo">
            <h1>一站式教師行政平台</h1>
        </div>
        <div class="user-info">
            <span id="user-name-display">🌟 讀取中...</span>
            <button class="logout-btn" onclick="logout()">登出</button>
        </div>
    </div>
    
    <div class="grid-container" id="app-grid"></div>
    
    <!-- 加上 id 以便用 JavaScript 控制顯示與隱藏 -->
    <button id="admin-btn" class="admin-btn" onclick="openAdmin()">🍄 進入後台管理</button>
</div>

<div id="adminModal" class="modal">
    <div class="modal-content">
        <div class="tabs">
            <div class="tab active" id="tab-manage" onclick="switchTab('manage')">方塊管理與排序</div>
            <div class="tab" id="tab-add" onclick="switchTab('add')">製作新方塊</div>
        </div>

        <div id="section-manage">
            <ul class="manage-list" id="manage-list-container"></ul>
            <div style="text-align: right; margin-top: 20px;">
                <button class="btn btn-gray" onclick="closeAdmin()">關閉</button>
            </div>
        </div>

        <div id="section-add" style="display:none;">
            <input type="hidden" id="editIndex" value="-1">
            <div class="form-group">
                <label>1. 方塊名稱：</label>
                <input type="text" id="appNameInput" placeholder="例如：教育局網頁">
            </div>
            <div class="form-group">
                <label>2. 圖片來源 (Google Drive 連結)：</label>
                <input type="text" id="appImgInput" placeholder="貼上圖片連結">
            </div>
            <div class="form-group">
                <label>3. 傳送連結 (Hyperlink)：</label>
                <input type="text" id="appLinkInput" placeholder="例如：https://www.edb.gov.hk">
            </div>
            <div class="form-group">
                <label style="color: #e74c3c;"><input type="checkbox" id="appRestrictedInput"> ⚠️ 鎖定 (需要密碼驗證)</label>
            </div>
            <div style="text-align: right; margin-top: 20px;">
                <button class="btn btn-gray" onclick="switchTab('manage')">取消</button>
                <button class="btn btn-green" id="saveBtn" onclick="saveApp()">確認建造</button>
            </div>
        </div>
    </div>
</div>

<script>
    // ⭐️ 在這裡設定授權的管理員 Email 名單
    const ADMIN_EMAILS = [
        'lwysams@bcklas.edu.hk',
        'slssams@bcklas.edu.hk'
    ];

    const firebaseConfig = {
        apiKey: "AIzaSyAEM_hyUZMXN3QJ4dRSi-fZ2qd8vUhMc2g",
        authDomain: "it-portal-8294b.firebaseapp.com",
        projectId: "it-portal-8294b",
        storageBucket: "it-portal-8294b.firebasestorage.app",
        messagingSenderId: "49238104967",
        appId: "1:49238104967:web:3c32f8cc8496eb86fe9122"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    let appsData = [];
    let dbUnsubscribe = null;

    auth.onAuthStateChanged((user) => {
        if (user) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-content').style.display = 'flex';
            document.getElementById('user-name-display').innerText = `🌟 歡迎, ${user.displayName}`;
            
            // ⭐️ 檢查 Email 是否在管理員名單中，是的話才顯示後台按鈕
            if (ADMIN_EMAILS.includes(user.email)) {
                document.getElementById('admin-btn').style.display = 'block';
            } else {
                document.getElementById('admin-btn').style.display = 'none';
            }

            loadData();
        } else {
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('main-content').style.display = 'none';
            document.getElementById('admin-btn').style.display = 'none'; // 登出時隱藏按鈕
            if (dbUnsubscribe) dbUnsubscribe(); 
        }
    });

    window.loginWithGoogle = function() {
        auth.signInWithPopup(googleProvider).catch((error) => {
            console.error("登入失敗", error);
            alert("登入失敗：" + error.message);
        });
    }

    window.logout = function() { auth.signOut(); }

    const defaultApps = [
        { name: '學校行事曆', img: 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png', url: 'https://www.google.com/calendar', restricted: false },
        { name: '副校長編堂工具', img: 'https://cdn-icons-png.flaticon.com/512/3064/3064197.png', url: '#', restricted: true }
    ];

    function loadData() {
        dbUnsubscribe = db.collection("school_portal").doc("apps_data").onSnapshot((doc) => {
            if (doc.exists && doc.data().list && doc.data().list.length > 0) {
                appsData = doc.data().list;
            } else {
                appsData = JSON.parse(JSON.stringify(defaultApps));
                // 如果是管理員才執行初始寫入，避免一般老師讀不到報錯
                if (auth.currentUser && ADMIN_EMAILS.includes(auth.currentUser.email)) {
                    saveData(); 
                }
            }
            renderApps();
            renderManageList();
        });
    }

    function saveData() {
        db.collection("school_portal").doc("apps_data").set({ list: appsData }).catch(err => {
            console.error("儲存失敗", err);
            alert("儲存失敗：您可能沒有權限寫入資料庫！");
        });
    }

    function convertDriveLink(url) {
        const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
        const match = url.match(driveRegex);
        return (match && match[1]) ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000` : url; 
    }

    function renderApps() {
        const grid = document.getElementById('app-grid');
        grid.innerHTML = ''; 
        appsData.forEach((app, index) => {
            const card = document.createElement('div');
            card.className = app.restricted ? 'app-card restricted' : 'app-card';
            card.title = app.name; 
            
            card.onclick = () => {
                if (app.restricted) {
                    // ⭐️ 這裡設定鎖定方塊的進入密碼！目前設定為 '123456'
                    let password = prompt('🔥 此為機密區域，請輸入通關密碼：');
                    if (password === '123456') { 
                        if (app.url !== '#') window.open(app.url, '_blank');
                    } else if (password !== null) {
                        alert('❌ 密碼錯誤！');
                    }
                } else {
                    if (app.url !== '#') window.open(app.url, '_blank');
                }
            };
            
            card.innerHTML = `<img src="${app.img}" class="app-icon" alt="${app.name}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1006/1006490.png'">`;
            grid.appendChild(card);
        });
    }

    function renderManageList() {
        const list = document.getElementById('manage-list-container');
        list.innerHTML = '';
        if (appsData.length === 0) return;
        
        appsData.forEach((app, index) => {
            const li = document.createElement('li');
            li.className = 'manage-item';
            li.innerHTML = `
                <div class="manage-item-info">${app.name} ${app.restricted ? '🔒' : ''}</div>
                <div class="manage-actions">
                    <button class="btn btn-gray btn-small" onclick="moveApp(${index}, -1)">⬆️</button>
                    <button class="btn btn-gray btn-small" onclick="moveApp(${index}, 1)">⬇️</button>
                    <button class="btn btn-blue btn-small" onclick="editApp(${index})">修改</button>
                    <button class="btn btn-red btn-small" onclick="deleteApp(${index})">刪除</button>
                </div>
            `;
            list.appendChild(li);
        });
    }

    window.moveApp = function(index, direction) {
        if (index + direction < 0 || index + direction >= appsData.length) return;
        const temp = appsData[index];
        appsData[index] = appsData[index + direction];
        appsData[index + direction] = temp;
        saveData();
    }
    window.deleteApp = function(index) {
        if(confirm('確定要把「' + appsData[index].name + '」刪除嗎？')) { appsData.splice(index, 1); saveData(); }
    }
    window.editApp = function(index) {
        const app = appsData[index];
        document.getElementById('editIndex').value = index;
        document.getElementById('appNameInput').value = app.name;
        document.getElementById('appImgInput').value = app.img;
        document.getElementById('appLinkInput').value = app.url;
        document.getElementById('appRestrictedInput').checked = app.restricted;
        switchTab('add');
    }
    window.saveApp = function() {
        const index = parseInt(document.getElementById('editIndex').value);
        const name = document.getElementById('appNameInput').value;
        let img = document.getElementById('appImgInput').value || 'https://cdn-icons-png.flaticon.com/512/1006/1006490.png'; 
        const link = document.getElementById('appLinkInput').value || '#'; 
        const restricted = document.getElementById('appRestrictedInput').checked;
        if (name.trim() === '') return alert('請輸入方塊名稱！');
        img = convertDriveLink(img);
        const newData = { name, img, url: link, restricted };
        if (index === -1) appsData.push(newData); else appsData[index] = newData;
        saveData();
        switchTab('manage');
    }

    window.openAdmin = function() { 
        // 雙重檢查：如果不是管理員呼叫此函數，則阻擋
        if (auth.currentUser && !ADMIN_EMAILS.includes(auth.currentUser.email)) {
            alert("您沒有後台管理權限！");
            return;
        }
        document.getElementById('adminModal').style.display = 'block'; switchTab('manage'); 
    }
    window.closeAdmin = function() { document.getElementById('adminModal').style.display = 'none'; }
    window.switchTab = function(tab) {
        document.getElementById('tab-manage').className = tab === 'manage' ? 'tab active' : 'tab';
        document.getElementById('tab-add').className = tab === 'add' ? 'tab active' : 'tab';
        document.getElementById('section-manage').style.display = tab === 'manage' ? 'block' : 'none';
        document.getElementById('section-add').style.display = tab === 'add' ? 'block' : 'none';
        if (tab === 'add' && document.getElementById('editIndex').value === '-1') {
            document.getElementById('appNameInput').value = ''; document.getElementById('appImgInput').value = '';
            document.getElementById('appLinkInput').value = ''; document.getElementById('appRestrictedInput').checked = false;
        } else if (tab === 'manage') document.getElementById('editIndex').value = '-1';
    }
</script>

</body>
</html>
