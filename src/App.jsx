import React, { useState, useEffect, useRef } from 'react';
import { 
  ListFilter, RefreshCw, AlertTriangle, Search, Info, Calendar as CalendarIcon, Filter, 
  User, FileText, X, Eye, Table, BarChart3, Heart, Copy, Check, ArrowRight, Edit3, 
  Plus, Trash2, ChevronLeft, ChevronRight, Shield, GraduationCap, LayoutDashboard, 
  ThumbsUp, Vote, Send, Users, Settings, ListOrdered, Lock, Unlock, Languages, Ban, 
  Zap, HelpCircle, AlertCircle, Download, Upload, Database, LogOut, LogIn, Activity,
  AlertOctagon
} from 'lucide-react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  increment, 
  getDoc,
  collection,
  arrayUnion,
  deleteDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

// --- Firebase Configuration & Initialization ---
const APP_ID = 'cadet-voting-system';

// ★★★ 請在此處填入您從 Firebase Console 取得的設定 ★★★
const YOUR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAam5iqLJDb4TQJ_KXMcXpJdbd0leNNCE0",
  authDomain: "vote-9468a.firebaseapp.com",
  projectId: "vote-9468a",
  storageBucket: "vote-9468a.firebasestorage.app",
  messagingSenderId: "125697069340",
  appId: "1:125697069340:web:872b77a367b9f473596ad9"
};

let app, auth, db;
try {
  const config = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : YOUR_FIREBASE_CONFIG;
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase Initialization Error:", e);
}
// ------------------------------------------------

// --- 用戶身份與 Email 對照表 (老師專用) ---
const USER_MAPPING = {
  "tea-0180@kfjh.tc.edu.tw": "TEACHER",
  "susi@st.tc.edu.tw": "TEACHER",
};

// 測試模式設定
const TEST_CONFIG = {
  allowAnyEmail: true,       
  defaultTestRole: "01"      
};

// 學生資料庫
const RAW_STUDENT_DATA = "80501楊子青80502魏寧妤80503吳紫妍80504張子琦80505林愷昕80506徐莉婕80507江凱璇80508黃喜苓80509譚日晰80510魏千紜80511賴品汝80512林芊亞80513江嘉純80514王潔心80515林暐倫80516温家亮80517蘇楦紘80518趙毅亮80519王長綸80520周楹家80521李至昇80522廖雲旭80523林秉昇80524邱子瀚80525陳奕銨80526林汶謙80527賴雨陞80528姚天裕80529施澄昊";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQ3akUNWUgfO5l4ckzMjGjKcqez-pJ3s6GgivjZ9TFS8sQyHAt7Ou9iztbjd_PLvFdzxXCnB_tZhDk/pub?gid=1923253012&single=true&output=csv";

// 動態密碼題庫
const CHALLENGES = [
  { q: '門', a: 'ZG9vcg==' }, { q: '書', a: 'Ym9vaw==' }, { q: '筆', a: 'cGVu' },
  { q: '狗', a: 'ZG9n' }, { q: '貓', a: 'Y2F0' }, { q: '水', a: 'd2F0ZXI=' },
  { q: '手', a: 'aGFuZA==' }, { q: '頭', a: 'aGVhZA==' }, { q: '愛', a: 'bG92ZQ==' },
  { q: '錢', a: 'bW9uZXk=' }, { q: '學校', a: 'c2Nob29s' }, { q: '老師', a: 'dGVhY2hlcg==' },
  { q: '學生', a: 'c3R1ZGVudA==' }, { q: '快樂', a: 'aGFwcHk=' }, { q: '蘋果', a: 'YXBwbGU=' },
  { q: '桌子', a: 'dGFibGU=' }, { q: '椅子', a: 'Y2hhaXI=' }, { q: '鳥', a: 'YmlyZA==' },
  { q: '魚', a: 'ZmlzaA==' }, { q: '老虎', a: 'dGlnZXI=' }
];

const FORCE_LOGIN_PASSWORD = "3939889";

const parseStudentData = () => {
  const seatMap = {};
  const fullIdMap = {}; 
  const regex = /\d{3}(\d{2})([^\d]+)/g;
  let match;
  while ((match = regex.exec(RAW_STUDENT_DATA)) !== null) {
    const fullString = match[0]; 
    const seat = match[1];       
    const name = match[2];       
    seatMap[seat] = name;
    fullIdMap[fullString] = seat;
  }
  return { seatMap, fullIdMap };
};

const { seatMap: STUDENT_NAME_MAP, fullIdMap: STUDENT_FULL_ID_MAP } = parseStudentData();

const POSITION_MAP = {
  1: "班長", 2: "副班長", 3: "風紀", 4: "學藝", 5: "設備", 6: "體育", 
  7: "衛生", 8: "環保", 9: "總務", 10: "資訊", 11: "輔導", 12: "服務", 
  13: "健康", 14: "禮貌", 15: "圖書", 16: "腳踏車"
};

const App = () => {
  // --- States ---
  const [viewMode, setViewMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);       
  const [loginError, setLoginError] = useState('');
  const [selectedLoginSeat, setSelectedLoginSeat] = useState("");

  const [rawRows, setRawRows] = useState([]); 
  const [statistics, setStatistics] = useState({});
  const [errors, setErrors] = useState([]);
  const [studentCounts, setStudentCounts] = useState([]); 
  const [loading, setLoading] = useState(false); 
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filterDate, setFilterDate] = useState('');
  const [detectedLatestDate, setDetectedLatestDate] = useState(null);
  const [filteredCount, setFilteredCount] = useState(0);
  const [candidateLimit, setCandidateLimit] = useState(3);
  
  // UI Modals
  const [editingStudent, setEditingStudent] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [viewingVoters, setViewingVoters] = useState(null); 
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showForceLoginModal, setShowForceLoginModal] = useState(false);

  // Password Challenge
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState(null); 
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);

  // Force Login State
  const [forceLoginPassword, setForceLoginPassword] = useState('');
  const [conflictIP, setConflictIP] = useState('');
  const [clientIP, setClientIP] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loginLogs, setLoginLogs] = useState([]);
  const [pendingLoginIp, setPendingLoginIp] = useState(''); // Store IP for force login

  // Editor State
  const [visualChoices, setVisualChoices] = useState([]); 
  const [generatedString, setGeneratedString] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Firebase Data
  const [voteRecords, setVoteRecords] = useState({}); 
  const [electionState, setElectionState] = useState({ selected: {} }); 
  
  // Voting State
  const [draftVotes, setDraftVotes] = useState({}); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [currentVoter, setCurrentVoter] = useState(""); 
  const [missingPositions, setMissingPositions] = useState([]); 
  const [missingCodes, setMissingCodes] = useState([]); 
  
  const fileInputRef = useRef(null);

  // --- Initial Setup ---
  useEffect(() => {
    // Generate session ID
    setSessionId(Math.random().toString(36).substring(2, 15));
    
    // Fetch IP (Initial) - Fail safe
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setClientIP(data.ip))
      .catch(err => console.warn("Initial IP Fetch Error:", err));
  }, []);

  // Initialize Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Logged in
        setCurrentUser(user);
        
        const email = user.email;
        if (email && USER_MAPPING[email] === 'TEACHER') {
          setUserRole('TEACHER');
          setViewMode('teacher');
          setLoginError('');
          fetchData();
        } else {
          // 如果不是老師，且目前是匿名登入狀態，檢查是否有指定的學生身份
          if (user.isAnonymous && userRole && userRole !== 'TEACHER') {
             // 這是學生透過選單登入的流程，保持狀態
             setViewMode('student');
             fetchData();
          } else if (!user.isAnonymous) {
             // 誤用 Google 登入但非老師
             setLoginError('非授權的教師帳號。學生請使用下方「學生專用通道」登入。');
             signOut(auth);
          }
        }
      } else {
        // Not logged in
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, [userRole]);

  // --- Firebase Subscriptions ---
  useEffect(() => {
    if (!db || !currentUser) return;
    
    const votesRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'voteDetails', 'global');
    const unsubVotes = onSnapshot(votesRef, (docSnap) => {
      if (docSnap.exists()) setVoteRecords(docSnap.data());
      else setVoteRecords({});
    }, err => console.log("Votes sync pending..."));

    const electionRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'electionState', 'global');
    const unsubElection = onSnapshot(electionRef, (docSnap) => {
      if (docSnap.exists()) setElectionState(docSnap.data());
      else setElectionState({ selected: {} });
    });

    let unsubLogs = () => {};
    if (viewMode === 'teacher') {
      const logsQuery = query(
        collection(db, 'artifacts', APP_ID, 'public', 'data', 'loginLogs'),
        orderBy('timestamp', 'desc'),
        limit(40)
      );
      unsubLogs = onSnapshot(logsQuery, (snapshot) => {
        const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setLoginLogs(logs);
      });
    }

    return () => {
      unsubVotes();
      unsubElection();
      unsubLogs();
    };
  }, [currentUser, viewMode]);

  // --- Session Monitor ---
  useEffect(() => {
    if (viewMode === 'student' && currentVoter && db) {
      const sessionDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'activeSessions', currentVoter);
      const unsubSession = onSnapshot(sessionDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // If the session ID in DB doesn't match MY session ID, I've been kicked
          if (data.sessionId && data.sessionId !== sessionId) {
            alert(`偵測到重複登入或已強制登出！\n\n您的帳號已在其他裝置 (IP: ${data.ip}) 登入。`);
            handleLogout();
          }
        }
      });
      return () => unsubSession();
    }
  }, [viewMode, currentVoter, sessionId, db]);

  // --- Logic Handlers ---

  const logActivity = async (seatNo, message, ip) => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'loginLogs'), {
        timestamp: serverTimestamp(),
        seatNo: seatNo,
        name: getStudentNameLabel(seatNo),
        ip: ip || 'Unknown',
        message: message
      });
    } catch (e) {
      console.error("Log error", e);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Failed", error);
      setLoginError('Google 登入失敗，請重試。');
    }
  };

  const handleStudentDirectLogin = async () => {
    if (!selectedLoginSeat) {
      setLoginError('請先選擇您的座號！');
      return;
    }
    
    setLoading(true);
    setLoginError('');
    
    try {
      // 1. Fetch IP on demand
      let currentIp = 'Unknown';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        currentIp = ipData.ip;
        setClientIP(currentIp); 
      } catch (err) {
        console.warn("IP Fetch Failed", err);
      }

      // 2. Check Session Conflict
      const sessionRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'activeSessions', selectedLoginSeat);
      const sessionSnap = await getDoc(sessionRef);

      if (sessionSnap.exists()) {
        const sessionData = sessionSnap.data();
        
        // 只要有 session 紀錄，就視為衝突 (嚴格模式)
        // 除非 session ID 相同 (自己重新整理，這種情況通常不會進入此函式，因為會直接 auto login)
        setConflictIP(sessionData.ip || 'Unknown');
        setPendingLoginIp(currentIp); // Store for later
        setShowForceLoginModal(true); 
        setLoading(false);
        return;
      }

      // No conflict, proceed
      await performLogin(selectedLoginSeat, "登入成功", currentIp);

    } catch (error) {
      console.error("Check Session Failed", error);
      setLoginError('無法驗證登入狀態，請檢查網路。');
      setLoading(false);
    }
  };

  const performLogin = async (seatNo, logMessage, ip) => {
    try {
       setUserRole(seatNo);
       setCurrentVoter(seatNo);

       const sessionRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'activeSessions', seatNo);
       await setDoc(sessionRef, {
         ip: ip || clientIP,
         sessionId: sessionId,
         timestamp: serverTimestamp()
       });

       await logActivity(seatNo, logMessage, ip || clientIP);
       await signInAnonymously(auth);
       
       setShowForceLoginModal(false);
       setForceLoginPassword('');
    } catch (e) {
       console.error("Login Error", e);
       setLoginError("登入過程發生錯誤");
    } finally {
       setLoading(false);
    }
  };

  // 清除舊投票紀錄 (Wipe)
  const clearPreviousVotes = async (seatNo) => {
    if (!db) return;
    const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'voteDetails', 'global');
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updates = {};
        let needsUpdate = false;
        
        // Iterate all positions and candidates
        Object.keys(data).forEach(key => {
          if (Array.isArray(data[key]) && data[key].includes(seatNo)) {
            // Remove this seatNo from the array
            updates[key] = data[key].filter(id => id !== seatNo);
            needsUpdate = true;
          }
        });
        
        if (needsUpdate) {
          await updateDoc(docRef, updates);
        }
      }
    } catch (e) {
      console.error("Error clearing previous votes:", e);
    }
  };

  const handleForceLogin = async () => {
    if (forceLoginPassword !== FORCE_LOGIN_PASSWORD) {
      alert("密碼錯誤！請通知老師。");
      return;
    }
    
    // 1. Wipe previous votes (Override)
    await clearPreviousVotes(selectedLoginSeat);

    // 2. Perform Login (Kick old session)
    await performLogin(selectedLoginSeat, "發現重複登入，老師已強制重置並覆寫投票", pendingLoginIp);
  };

  const handleLogout = async () => {
    if (currentVoter && db) {
      try {
        const sessionRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'activeSessions', currentVoter);
        await deleteDoc(sessionRef); 
      } catch (e) { /* ignore */ }
    }
    
    signOut(auth);
    setDraftVotes({}); 
    setHasSubmitted(false);
    setCurrentVoter(""); 
    setUserRole(null);
    setViewMode('login');
    setSelectedLoginSeat(""); 
    setMissingCodes([]);
  };

  const handleExportData = () => {
    const dataToExport = {
      voteRecords,
      electionState,
      timestamp: new Date().toISOString(),
      systemVersion: '2.0'
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voting_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const triggerImport = () => { if (fileInputRef.current) fileInputRef.current.click(); };
  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (!importedData.voteRecords || !importedData.electionState) {
          alert('錯誤：檔案格式不正確。');
          return;
        }
        if (confirm('確定要匯入此資料嗎？這將覆蓋目前所有紀錄。')) {
          const votesRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'voteDetails', 'global');
          await setDoc(votesRef, importedData.voteRecords);
          const electionRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'electionState', 'global');
          await setDoc(electionRef, importedData.electionState);
          alert('資料匯入成功！');
        }
      } catch (err) { alert('匯入失敗。'); }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleAutoAssign = async () => {
    if (!db || !currentUser || viewMode !== 'teacher') return;
    const electionRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'electionState', 'global');
    const newSelected = { ...electionState.selected };
    
    Object.keys(POSITION_MAP).forEach(posCode => {
      const code = String(posCode);
      const quota = (code === '1' || code === '2') ? 1 : 2; 
      const p1Candidates = statistics[code]?.[1] || [];
      const availableCandidates = p1Candidates.filter(seat => !newSelected[seat]);
      
      if (availableCandidates.length > 0 && availableCandidates.length <= quota) {
        availableCandidates.forEach(seat => {
          newSelected[seat] = code;
        });
      }
    });

    try {
      await setDoc(electionRef, { selected: newSelected }, { merge: true });
      alert("第一輪自動錄取完成！");
    } catch (e) {
      console.error("Auto assign error:", e);
      alert("自動錄取失敗");
    }
  };

  // Student Auto Check
  useEffect(() => {
    if (viewMode === 'student' && currentVoter && !hasSubmitted) {
      const newDrafts = { ...draftVotes };
      let hasChanges = false;
      Object.keys(POSITION_MAP).forEach(posCode => {
        const code = String(posCode);
        const quota = (code === '1' || code === '2') ? 1 : 2;
        let electedCount = 0;
        Object.values(electionState.selected || {}).forEach(pos => { if (pos === code) electedCount++; });
        if (electedCount >= quota) return; 

        const p1 = statistics[code]?.[1] || [];
        const p2 = statistics[code]?.[2] || [];
        const p3 = statistics[code]?.[3] || [];
        const p1Count = p1.length;
        const p2Count = p2.length;
        const isP2Active = p1Count < candidateLimit;
        const isP3Active = (p1Count + p2Count) < candidateLimit;

        let validCandidates = [];
        if (true) validCandidates = [...validCandidates, ...p1]; 
        if (isP2Active) validCandidates = [...validCandidates, ...p2];
        if (isP3Active) validCandidates = [...validCandidates, ...p3];
        const actuallyAvailable = validCandidates.filter(seat => !electionState.selected?.[seat]);

        if (actuallyAvailable.length === 1) {
          const candidate = actuallyAvailable[0];
          if (newDrafts[code] !== candidate) {
            newDrafts[code] = candidate;
            hasChanges = true;
          }
        }
      });
      if (hasChanges) setDraftVotes(newDrafts);
    }
  }, [viewMode, currentVoter, statistics, electionState, candidateLimit]); 

  const handleToggleDraftVote = (posCode, seatNo) => {
    if (viewMode !== 'student' || hasSubmitted) return; 
    setDraftVotes(prev => {
      const currentSelection = prev[posCode];
      if (currentSelection === seatNo) {
        const newState = { ...prev };
        delete newState[posCode];
        return newState;
      }
      return { ...prev, [posCode]: seatNo };
    });
  };

  const handleValidateAndSubmit = () => {
    if (!currentVoter) {
      alert("請先選擇您的座號！");
      return;
    }
    const missing = [];
    const missingCodeList = [];
    Object.keys(POSITION_MAP).forEach(posCode => {
      const code = String(posCode);
      const quota = (code === '1' || code === '2') ? 1 : 2;
      let electedCount = 0;
      Object.values(electionState.selected || {}).forEach(pos => { if (pos === code) electedCount++; });
      if (electedCount >= quota) return; 

      const p1 = statistics[code]?.[1] || [];
      const p2 = statistics[code]?.[2] || [];
      const p3 = statistics[code]?.[3] || [];
      const p1Count = p1.length;
      const p2Count = p2.length;
      const isP2Active = p1Count < candidateLimit;
      const isP3Active = (p1Count + p2Count) < candidateLimit;
      
      let hasVoteableCandidates = false;
      const checkCandidates = (list) => list.some(seat => !electionState.selected?.[seat]);

      if (checkCandidates(p1)) hasVoteableCandidates = true;
      if (isP2Active && checkCandidates(p2)) hasVoteableCandidates = true;
      if (isP3Active && checkCandidates(p3)) hasVoteableCandidates = true;

      if (hasVoteableCandidates && !draftVotes[code]) {
        missing.push(POSITION_MAP[code]);
        missingCodeList.push(code);
      }
    });

    if (missing.length > 0) {
      setMissingPositions(missing);
      setMissingCodes(missingCodeList); 
      setShowIncompleteModal(true);
    } else {
      setMissingCodes([]);
      setShowConfirmModal(true);
    }
  };

  const confirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'voteDetails', 'global');
    try {
      const updates = {};
      Object.entries(draftVotes).forEach(([posCode, seatNo]) => {
        const key = `${posCode}_${seatNo}`;
        updates[key] = arrayUnion(currentVoter); 
      });
      if (Object.keys(updates).length > 0) {
        await setDoc(docRef, updates, { merge: true });
      }
      
      let currentIp = 'Unknown';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        currentIp = ipData.ip;
      } catch (e) {}

      await logActivity(currentVoter, "已完成票選", currentIp);
      setHasSubmitted(true);
      setShowSuccessModal(true); 
      setTimeout(() => setShowSuccessModal(false), 2000);
    } catch (e) {
      console.error("Voting error:", e);
      alert("投票送出失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper Functions
  const formatSeatNo = (val) => {
    if (!val) return "";
    const digits = val.replace(/[^0-9]/g, '');
    if (!digits) return val; 
    const num = parseInt(digits, 10);
    return num < 10 ? `0${num}` : `${num}`;
  };
  const getStudentNameLabel = (seatNo) => {
    const name = STUDENT_NAME_MAP[seatNo];
    if (name) return name.slice(-2);
    return seatNo; 
  };
  const getStudentFullName = (seatNo) => {
    const name = STUDENT_NAME_MAP[seatNo];
    return name ? `${seatNo} ${name}` : `座號 ${seatNo}`;
  };
  const parseTimestampToYMD = (ts) => {
    if (!ts) return null;
    try {
      const match = ts.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        const mm = String(month).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${year}-${mm}-${dd}`;
      }
      return null;
    } catch (e) { return null; }
  };
  const handleOpenVoters = (posCode, candidateSeatNo, candidateName) => {
    const key = `${posCode}_${candidateSeatNo}`;
    const voters = voteRecords[key] || [];
    const candidateData = studentCounts.find(s => s.seatNo === candidateSeatNo);
    let ownChoices = [];
    if (candidateData && candidateData.original) {
      const parts = candidateData.original.split(/[,，]/).map(p => p.trim());
      const choiceParts = parts.slice(1);
      const seen = new Set();
      choiceParts.forEach(p => {
        const clean = p.toUpperCase().replace(/[^0-9X]/g, '');
        if (clean && clean !== 'X') {
          if (!seen.has(clean)) { seen.add(clean); ownChoices.push(clean); }
        }
      });
    }
    setViewingVoters({ posCode, candidateSeatNo, candidateName, voters, ownChoices });
  };
  
  // ... Editing & Modal handlers ...
  const handleClearAll = () => setVisualChoices([]);
  const handleRemoveChoice = (idx) => setVisualChoices(prev => prev.filter((_, i) => i !== idx));
  const handleAddChoice = (code) => { if(visualChoices.length < 19) setVisualChoices([...visualChoices, code]) };

  // ... handleCopy, getDuplicates, fetchData, processStudentData, renderAdvancedBattery ... 
  const handleCopy = () => {
    const textArea = document.createElement("textarea");
    textArea.value = generatedString;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } catch (err) { console.error(err); }
    document.body.removeChild(textArea);
  };
  const getDuplicates = (choices) => {
    const seen = new Set();
    const duplicates = new Set();
    choices.forEach(code => {
      if (seen.has(code)) duplicates.add(code);
      seen.add(code);
    });
    return duplicates;
  };
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(CSV_URL);
      const text = await response.text();
      const rows = text.split(/\r?\n/).map(row => {
        const regex = /(".*?"|[^",]+)(?=\s*,|\s*$)/g;
        const matches = row.match(regex);
        return matches ? matches.map(m => m.replace(/^"|"$/g, '').trim()) : [];
      }).filter(row => row.length >= 5);
      const contentRows = rows.slice(1); 
      setRawRows(contentRows);
      if (contentRows.length > 0) {
        let maxDateStr = "";
        contentRows.forEach(row => {
          const ymd = parseTimestampToYMD(row[0]);
          if (ymd) { if (maxDateStr === "" || ymd > maxDateStr) maxDateStr = ymd; }
        });
        if (maxDateStr) { setFilterDate(maxDateStr); setDetectedLatestDate(maxDateStr); } 
        else { setDetectedLatestDate("未偵測到有效日期"); }
      } else { setDetectedLatestDate("無資料"); }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) { console.error(err); setDetectedLatestDate("讀取失敗"); } 
    finally { setLoading(false); }
  };
  useEffect(() => { if (rawRows.length > 0 && currentUser) processStudentData(rawRows); }, [rawRows, filterDate, currentUser]);
  const processStudentData = (rows) => {
    const stats = {};
    const errorList = [];
    const tempStudentCounts = []; 
    let count = 0; 
    Object.keys(POSITION_MAP).forEach(code => { stats[code] = { 1: [], 2: [], 3: [] }; });
    rows.forEach((row, index) => {
      const timestampRaw = row[0] || "";  
      const prefString = row[3] || "";    
      const seatNoOfficial = row[4] ? row[4].trim() : ""; 
      if (!prefString) return;
      if (filterDate && timestampRaw) {
        const rowYMD = parseTimestampToYMD(timestampRaw);
        if (rowYMD && rowYMD < filterDate) return;
      }
      count++;
      const parts = prefString.split(/[,，]/).map(p => p.trim());
      let rawSeatNo = seatNoOfficial;
      if (!rawSeatNo && parts.length > 0) rawSeatNo = parts[0];
      const displaySeatNo = formatSeatNo(rawSeatNo) || `Row ${index + 2}`;
      const choiceParts = parts.slice(1);
      const effectiveChoices = [];
      const duplicatesDetected = new Set();
      const seen = new Set();
      choiceParts.forEach(p => {
        const clean = p.toUpperCase().replace(/[^0-9X]/g, '');
        if (clean === "") return; 
        if (clean !== 'X') {
            if (seen.has(clean)) duplicatesDetected.add(clean);
            seen.add(clean);
            effectiveChoices.push(clean);
        }
      });
      tempStudentCounts.push({
        seatNo: displaySeatNo,
        count: effectiveChoices.length,
        hasError: duplicatesDetected.size > 0,
        original: prefString, 
        duplicateCodes: Array.from(duplicatesDetected) 
      });
      if (duplicatesDetected.size > 0) {
        errorList.push({
          id: `err-${index}-${displaySeatNo}`,
          seatNo: displaySeatNo,
          original: prefString,
          parsedResult: effectiveChoices.join(', '), 
          error: "選填代碼重複",
          duplicateCodes: Array.from(duplicatesDetected)
        });
        return; 
      }
      effectiveChoices.forEach((choice, idx) => {
        const rank = idx + 1;
        if (rank <= 3) { if (stats[choice]) stats[choice][rank].push(displaySeatNo); }
      });
    });
    tempStudentCounts.sort((a, b) => parseInt(a.seatNo,10) - parseInt(b.seatNo,10));
    setStatistics(stats);
    setErrors(errorList);
    setStudentCounts(tempStudentCounts);
    setFilteredCount(count); 
  };
  const renderAdvancedBattery = (count) => {
    let colorClass = "bg-teal-300"; 
    if (count >= 10 && count < 15) colorClass = "bg-yellow-300";
    else if (count >= 15 && count < 20) colorClass = "bg-orange-300";
    else if (count >= 20) colorClass = "bg-rose-300";
    const shapes = [];
    if (count >= 5) {
      shapes.push(<div key="big" className={`h-3 w-4 rounded-sm ${colorClass}`} />);
      for (let i = 0; i < count % 5; i++) shapes.push(<div key={`r${i}`} className={`h-3 w-1.5 rounded-sm ${colorClass}`} />);
    } else {
      for (let i = 0; i < count; i++) shapes.push(<div key={`s${i}`} className={`h-3 w-1.5 rounded-sm ${colorClass}`} />);
    }
    return shapes;
  };
  
  const handleSwitchModeClick = () => {
    if (isLockedOut) return; 
    if (viewMode === 'teacher') {
      setViewMode('student');
      setDraftVotes({});
      setCurrentVoter("");
      setHasSubmitted(false);
      setMissingCodes([]); 
    } else {
      const randomChallenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
      setCurrentChallenge(randomChallenge);
      setShowPasswordModal(true);
      setPasswordInput('');
      setPasswordError(false);
    }
  };
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!currentChallenge) return;
    try {
      const answer = atob(currentChallenge.a);
      const expected = `${answer}38`;
      if (passwordInput.toLowerCase().trim() === expected) {
        setViewMode('teacher');
        setShowPasswordModal(false);
        setFailedAttempts(0); 
        // Reset student voting state when entering teacher mode
        setDraftVotes({});
        setCurrentVoter("");
        setHasSubmitted(false);
        setMissingCodes([]); 
      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        setPasswordInput('');
        if (newAttempts >= 3) {
          setIsLockedOut(true);
          setShowPasswordModal(false);
          alert("錯誤次數過多，管理模式已鎖定。");
        } else {
          setPasswordError(true);
          const nextChallenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
          setCurrentChallenge(nextChallenge);
        }
      }
    } catch {
      setPasswordError(true);
      setPasswordInput('');
    }
  };

  // Define filteredPositions for Main Render
  const filteredPositions = Object.entries(POSITION_MAP).filter(([code, name]) => 
    name.includes(searchTerm) || code.includes(searchTerm)
  );

  // --- SUB-COMPONENTS (Defined as functions here to avoid scope issues) ---

  const ForceLoginModal = () => {
    if (!showForceLoginModal) return null;
    return (
       <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border-4 border-rose-200 p-8 flex flex-col items-center">
             <div className="bg-rose-100 p-4 rounded-full mb-4 text-rose-500"><AlertOctagon size={40} /></div>
             <h3 className="text-xl font-bold text-slate-700 mb-2">⚠️ 重複登入衝突</h3>
             <p className="text-slate-500 text-sm mb-4 text-center font-medium">
               座號 <span className="font-bold text-indigo-600 text-lg">{selectedLoginSeat}</span> 目前已在其他裝置上使用中。<br/>
               (佔用者 IP: <span className="font-mono bg-slate-100 px-1 rounded">{conflictIP}</span>)
             </p>
             <p className="text-rose-500 text-xs font-bold mb-6 text-center bg-rose-50 p-3 rounded-xl border border-rose-100">
               請通知老師處理！<br/>老師輸入管理密碼後可重置此身份。
             </p>
             <input type="password" autoFocus className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-center font-bold text-slate-700 outline-none mb-4" placeholder="請老師輸入管理密碼..." value={forceLoginPassword} onChange={e => setForceLoginPassword(e.target.value)}/>
             <div className="flex gap-3 w-full">
                <button onClick={() => { setShowForceLoginModal(false); setForceLoginPassword(''); }} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">取消</button>
                <button onClick={handleForceLogin} className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold hover:bg-rose-600 shadow-lg shadow-rose-200 transition-colors">強制登入並重置</button>
             </div>
          </div>
       </div>
    );
  }

  const SuccessOverlay = () => {
    if (viewMode === 'student' && showSuccessModal) {
      return (
        <div className="fixed inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-teal-100 flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mb-4 text-teal-500"><Check size={48} strokeWidth={3} /></div>
            <h2 className="text-2xl font-bold text-slate-700 mb-2">投票已送出！</h2>
            <p className="text-slate-500 font-medium">感謝您神聖的一票</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const StudentSubmitFab = () => {
    const count = Object.keys(draftVotes).length;
    if (viewMode !== 'student' || hasSubmitted) return null;

    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500 flex items-center gap-3">
        {!currentVoter && (
          <div className="bg-rose-500 text-white text-sm font-bold px-4 py-2 rounded-xl animate-bounce">
            請先在右上方選擇您的座號！
          </div>
        )}
        <button
          onClick={handleValidateAndSubmit}
          disabled={count === 0 || isSubmitting || !currentVoter}
          className={`flex items-center gap-2 px-6 py-4 rounded-full shadow-xl transition-all transform hover:scale-105 active:scale-95 ${
            count > 0 && !isSubmitting && currentVoter
              ? 'bg-gradient-to-r from-rose-400 to-orange-400 text-white hover:from-rose-500 hover:to-orange-500' 
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <RefreshCw className="animate-spin" size={24} />
          ) : (
            <Send size={24} fill="currentColor" />
          )}
          <div className="flex flex-col items-start">
            <span className="text-sm font-bold leading-none">送出審慎的一票</span>
            <span className="text-xs font-medium opacity-90 leading-none mt-1">已選 {count} 位候選人</span>
          </div>
        </button>
      </div>
    );
  };

  // --- LOGIN PAGE RENDER ---
  if (viewMode === 'login' || !currentUser) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4" style={{ fontFamily: '"Zen Maru Gothic", sans-serif' }}>
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border-4 border-indigo-100 flex flex-col items-center animate-in zoom-in-95 duration-500">
          <div className="bg-rose-400 p-4 rounded-full shadow-lg shadow-rose-200 mb-6 transform -rotate-6">
            <Heart size={40} fill="white" className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-700 mb-2 text-center">幹部志願選填系統</h1>
          <p className="text-slate-400 mb-8 text-center font-medium">請使用學校 Google 帳號登入</p>
          <div className="w-full space-y-4">
            <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 p-4 rounded-2xl hover:bg-slate-50 hover:border-indigo-300 hover:shadow-md transition-all group">
               <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
               <span className="text-slate-600 font-bold group-hover:text-indigo-600">老師登入 (Google)</span>
            </button>
            <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-slate-200"></div><span className="flex-shrink-0 mx-4 text-slate-300 text-xs">或</span><div className="flex-grow border-t border-slate-200"></div></div>
            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-2 text-center">學生專用通道</label>
              <div className="flex gap-2">
                <select className="flex-1 bg-white border-2 border-indigo-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 outline-none focus:border-indigo-300 cursor-pointer" value={selectedLoginSeat} onChange={(e) => setSelectedLoginSeat(e.target.value)}>
                  <option value="">請選擇座號...</option>
                  {Array.from({length: 30}, (_, i) => {
                    const num = (i + 1).toString().padStart(2, '0');
                    return <option key={num} value={num}>{num} {getStudentNameLabel(num)}</option>
                  })}
                </select>
                <button onClick={handleStudentDirectLogin} disabled={loading || !selectedLoginSeat} className={`px-4 py-2 rounded-xl text-white font-bold transition-all shadow-sm ${loading || !selectedLoginSeat ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 active:scale-95'}`}>
                  {loading ? <RefreshCw className="animate-spin" size={18}/> : <ArrowRight size={18}/>}
                </button>
              </div>
            </div>
          </div>
          {loginError && <div className="mt-4 bg-rose-50 text-rose-500 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"><AlertTriangle size={16} />{loginError}</div>}
          
          <ForceLoginModal /> {/* Render ForceLoginModal here too in case conflict happens during login check */}
        </div>
      </div>
    );
  }

  // --- MAIN APP UI ---
  return (
    <>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700&display=swap');`}
      </style>
      <div className={`min-h-screen pb-20 relative font-sans ${viewMode === 'teacher' ? 'bg-rose-50' : 'bg-slate-50'}`} style={{ fontFamily: '"Zen Maru Gothic", sans-serif' }}>
        
        <SuccessOverlay />
        <StudentSubmitFab />
        {/* Only show force login modal if we are NOT on login screen (handled above) or if it's triggered during session */}
        {viewMode !== 'login' && <ForceLoginModal />} 
        
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleImportData} />

        {/* Validation Modals... (Same as before) */}
        {showIncompleteModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border-4 border-orange-200">
                <div className="flex flex-col items-center mb-4 text-center">
                   <AlertTriangle className="text-orange-500 mb-2" size={40}/>
                   <h3 className="text-xl font-bold text-slate-700">您還有職務未投票喔！</h3>
                   <p className="text-sm text-slate-400">請完成以下職務的投票：</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl mb-4 max-h-40 overflow-y-auto">
                   <ul className="list-disc list-inside text-sm font-bold text-orange-600">
                      {missingPositions.map((pos,i) => <li key={i}>{pos}</li>)}
                   </ul>
                </div>
                <button onClick={()=>setShowIncompleteModal(false)} className="w-full bg-orange-400 text-white py-3 rounded-xl font-bold hover:bg-orange-500">好，我去投！</button>
             </div>
          </div>
        )}
        {showConfirmModal && (
           <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border-4 border-teal-100">
                 <div className="flex flex-col items-center mb-4 text-center">
                    <HelpCircle className="text-teal-500 mb-2" size={40}/>
                    <h3 className="text-xl font-bold text-slate-700">確定送出選票？</h3>
                    <p className="text-sm text-slate-400">送出後無法修改，請確認。</p>
                 </div>
                 <div className="flex gap-3">
                    <button onClick={()=>setShowConfirmModal(false)} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-bold">再檢查</button>
                    <button onClick={confirmSubmit} className="flex-1 bg-teal-500 text-white py-3 rounded-xl font-bold hover:bg-teal-600">確認送出</button>
                 </div>
              </div>
           </div>
        )}

        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 shadow-sm">
           <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 shrink-0">
                 <div className={`p-2 rounded-2xl shadow-lg text-white transform -rotate-6 transition-colors ${viewMode === 'teacher' ? 'bg-rose-400 shadow-rose-200' : 'bg-indigo-400 shadow-indigo-200'}`}>
                    {viewMode === 'teacher' ? <Shield size={20} fill="currentColor"/> : <GraduationCap size={20} fill="currentColor"/>}
                 </div>
                 <h1 className="text-xl font-bold text-slate-700 hidden md:block tracking-tight">
                    {viewMode === 'teacher' ? '幹部志願選填 (管理端)' : '幹部志願選填 (學生端)'}
                 </h1>
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-md">
                 <div className="relative w-full group hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                    <input type="text" placeholder="搜尋..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-200 outline-none" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                 </div>
                 {viewMode === 'student' && !hasSubmitted && (
                   <div className="flex items-center gap-2 bg-white border-2 border-indigo-200 rounded-full px-3 py-1.5 ml-auto md:ml-0 shadow-sm w-32 justify-center">
                     <User size={16} className="text-indigo-400" />
                     {/* Lock seat selector to authenticated user role if student */}
                     <span className="text-sm font-bold text-slate-600">{currentVoter} {getStudentNameLabel(currentVoter)}</span>
                   </div>
                 )}
                 {viewMode === 'teacher' && <button onClick={()=>setShowMapModal(true)} className="flex gap-1 bg-white border-2 border-slate-200 px-4 py-2 rounded-full text-sm font-bold hover:bg-slate-50 whitespace-nowrap shadow-sm"><Table size={16}/><span className="hidden sm:inline">代碼表</span></button>}
              </div>
              <div className="flex items-center gap-2">
                 {viewMode === 'teacher' && <button onClick={fetchData} disabled={loading} className="flex gap-2 bg-white border-2 border-rose-200 text-rose-500 px-4 py-2 rounded-full text-sm font-bold hover:bg-rose-50"><RefreshCw size={16} className={loading?"animate-spin":""}/><span className="hidden sm:inline">同步</span></button>}
                 <button onClick={handleLogout} className="flex gap-2 bg-slate-200 text-slate-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-slate-300"><LogOut size={16}/><span className="hidden sm:inline">登出</span></button>
                 {viewMode !== 'login' && viewMode === 'student' && <button onClick={handleSwitchModeClick} disabled={isLockedOut} className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all shadow-md active:scale-95 text-white ${isLockedOut ? 'bg-slate-400 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600'}`}><Shield size={16} /><span className="hidden sm:inline">切換</span></button>}
                 {viewMode === 'teacher' && <button onClick={handleSwitchModeClick} className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all shadow-md active:scale-95 text-white bg-indigo-500 hover:bg-indigo-600"><GraduationCap size={16} /><span className="hidden sm:inline">切換</span></button>}
              </div>
           </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
           {/* ... Teacher Controls ... */}
           {viewMode === 'teacher' && (
              <div className="mb-6 bg-white/90 backdrop-blur rounded-3xl border border-rose-100 p-1 shadow-sm flex flex-wrap items-center justify-between animate-in fade-in">
                 {/* ... Date Picker, Limit, Auto Assign, Export ... */}
                 {/* (Same as previous code, collapsed for brevity) */}
                 <div className="flex items-center gap-2 p-3">
                    <div className="bg-rose-100 p-2.5 rounded-2xl text-rose-500"><CalendarIcon size={20}/></div>
                    <div><label className="text-[10px] font-bold text-rose-300 uppercase block mb-0.5">起始日期</label><input type="date" className="text-sm font-bold bg-transparent border-none p-0 outline-none cursor-pointer" value={filterDate} onChange={e=>setFilterDate(e.target.value)}/></div>
                 </div>
                 <div className="h-10 w-px bg-rose-100 hidden md:block"></div>
                 <div className="flex items-center gap-2 p-3">
                    <div className="bg-indigo-100 p-2.5 rounded-2xl text-indigo-500"><Users size={20}/></div>
                    <div>
                       <label className="text-[10px] font-bold text-indigo-300 uppercase block mb-1">候選人數</label>
                       <div className="flex gap-1.5">{[2,3,4].map(n=><button key={n} onClick={()=>setCandidateLimit(n)} className={`w-8 h-8 rounded-xl text-sm font-bold flex justify-center items-center ${candidateLimit===n?'bg-indigo-400 text-white':'bg-white text-indigo-300 border-2 border-indigo-100'}`}>{n}</button>)}</div>
                    </div>
                 </div>
                 <div className="h-10 w-px bg-rose-100 hidden md:block"></div>
                 <div className="flex gap-2 p-3">
                    <button onClick={handleAutoAssign} className="bg-purple-100 text-purple-600 p-2.5 rounded-2xl hover:bg-purple-200 flex gap-2 items-center"><Zap size={20}/><span className="text-sm font-bold">自動錄取</span></button>
                 </div>
                 <div className="h-10 w-px bg-rose-100 hidden md:block"></div>
                 <div className="flex gap-2 p-3 pr-6">
                    <button onClick={handleExportData} className="p-2.5 rounded-2xl bg-teal-100 text-teal-600 hover:bg-teal-200"><Download size={20}/></button>
                    <button onClick={triggerImport} className="p-2.5 rounded-2xl bg-sky-100 text-sky-600 hover:bg-sky-200"><Upload size={20}/></button>
                 </div>
              </div>
           )}

           {/* ... Errors & Student Counts ... */}
           {/* (Same logic, relying on viewMode) */}
           {viewMode === 'teacher' && errors.length > 0 && (
             <div className="mb-6 animate-in fade-in slide-in-from-top-4">
                {/* ... Error Block Content ... */}
                <div className="bg-white/80 border-2 border-rose-200 rounded-3xl p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-300 via-orange-300 to-yellow-300"></div>
                  <h2 className="text-rose-500 font-bold flex items-center gap-2 text-lg mb-4">
                    <div className="bg-rose-100 p-1.5 rounded-full"><AlertTriangle className="text-rose-500" size={20} /></div>
                    重複選填名單 <span className="text-xs font-bold text-rose-400 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">共 {errors.length} 位</span>
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {errors.map((err) => (
                      <button key={err.id} onClick={() => setEditingStudent(err)} className="bg-rose-50/50 border border-rose-100 p-3 rounded-2xl hover:bg-rose-50 hover:border-rose-300 transition-all text-left flex items-center gap-3 group w-auto min-w-fit shrink-0">
                         <span className="bg-rose-400 text-white text-sm font-bold px-3 py-1.5 rounded-xl shadow-rose-200 shadow-md">{err.seatNo}</span>
                         <span className="text-xs font-bold text-rose-400">重複代碼</span>
                         <Edit3 size={18} className="text-rose-300 group-hover:text-rose-500" />
                      </button>
                    ))}
                  </div>
                </div>
             </div>
          )}

          {studentCounts.length > 0 && (
            <div className="mb-8">
              {/* ... Student Counts Content ... */}
              <div className="bg-white/80 border-2 border-indigo-50 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-indigo-800 font-bold flex items-center gap-2 text-lg">
                    <div className="bg-indigo-100 p-1.5 rounded-xl"><BarChart3 className="text-indigo-500" size={20} /></div>
                    志願數量一覽
                    {viewMode === 'student' && <span className="text-xs text-slate-400 font-normal ml-2">(學生隱私保護模式)</span>}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {studentCounts.map((student, idx) => (
                     <div key={idx} onClick={() => viewMode === 'teacher' ? setEditingStudent(student) : null} className={`p-1.5 rounded-xl border-2 flex items-center justify-between gap-1.5 flex-none w-[112px] transition-all ${student.hasError && viewMode === 'teacher' ? 'bg-rose-50 border-rose-200' : ''} ${!student.hasError && viewMode === 'teacher' ? 'bg-white border-slate-100 hover:border-indigo-200 cursor-pointer' : ''} ${viewMode === 'student' ? 'bg-white border-slate-100 cursor-default opacity-90' : ''}`} title={`座號 ${student.seatNo}：共 ${student.count} 個志願`}>
                       <div className="w-3 flex justify-center shrink-0">{student.hasError && viewMode === 'teacher' ? <AlertTriangle size={14} className="text-rose-400" /> : <div className="w-3" />}</div>
                       <span className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${student.hasError && viewMode === 'teacher' ? 'bg-rose-200 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>{student.seatNo}</span>
                       <div className="flex items-end h-3 gap-[1px] justify-start w-[45px] shrink-0">{renderAdvancedBattery(student.count)}</div>
                     </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ... Modals (Editing, Map, Voters) ... */}
          {/* (Modals code omitted for brevity as they are same as previous logic, just part of render) */}
          {editingStudent && viewMode === 'teacher' && (
             <div className="fixed inset-0 bg-rose-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
               <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border-4 border-rose-100 flex flex-col max-h-[95vh]">
                 {/* ... Edit Modal Content ... */}
                 <div className="bg-rose-50 px-4 py-3 border-b border-rose-100 flex items-center justify-between shrink-0">
                    <button onClick={handlePrevStudent} className="p-2 rounded-xl"><ChevronLeft size={20}/></button>
                    <div className="flex items-center gap-3"><span className="bg-rose-400 text-white text-lg font-bold px-4 py-1 rounded-xl">{editingStudent.seatNo}</span></div>
                    <div className="flex items-center gap-2"><button onClick={handleNextStudent} className="p-2 rounded-xl"><ChevronRight size={20}/></button><button onClick={() => setEditingStudent(null)} className="p-2 rounded-full"><X size={24}/></button></div>
                 </div>
                 <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/50">
                    {/* ... Visual Editor ... */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider"><Edit3 size={16}/> 志願排序</h4>
                        <button onClick={handleClearAll} className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-50 text-rose-500"><Trash2 size={14}/>全部清除</button>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                        {Array.from({ length: 19 }).map((_, i) => {
                          const code = visualChoices[i];
                          const isDuplicate = code && currentDuplicates.has(code);
                          return (
                            <div key={i} className={`relative h-14 rounded-xl border-2 flex flex-row items-center justify-center p-1 ${code ? (isDuplicate ? 'bg-rose-100 border-rose-300' : 'bg-white border-indigo-100') : 'bg-slate-100/50 border-dashed border-slate-200'}`}>
                              <span className="absolute top-0.5 left-1.5 text-[9px] font-bold text-slate-300">{i+1}</span>
                              {code ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-xs font-bold px-1.5 rounded bg-slate-100 text-slate-500">#{code}</span>
                                  <span className="text-xs font-bold truncate max-w-[60px] text-slate-700">{POSITION_MAP[code]}</span>
                                  <button onClick={() => handleRemoveChoice(i)} className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300"><X size={10} strokeWidth={3}/></button>
                                </div>
                              ) : <span className="text-slate-300 text-xs mt-1">空缺</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    {/* ... Add Choice & Copy ... */}
                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                       <button onClick={handleCopy} disabled={!isValid} className="flex items-center gap-2 px-6 py-2 rounded-xl text-white font-bold bg-indigo-500 hover:bg-indigo-600">{copySuccess ? <Check size={18}/> : <Copy size={18}/>} 複製</button>
                    </div>
                 </div>
               </div>
             </div>
          )}

          {viewingVoters && viewMode === 'teacher' && (
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                {/* ... Viewing Voters Modal ... */}
                <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border-4 border-slate-100 flex flex-col max-h-[85vh]">
                   <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2"><span className="bg-rose-400 text-white px-2 py-0.5 rounded-lg text-sm">{viewingVoters.candidateSeatNo}</span> {viewingVoters.candidateName}</h3>
                      <button onClick={() => setViewingVoters(null)}><X size={20}/></button>
                   </div>
                   <div className="p-6 overflow-y-auto flex-1 space-y-6">
                      <div>
                        <h4 className="text-sm font-bold text-indigo-500 mb-3 border-b border-indigo-100 pb-1">該生的志願序</h4>
                        <div className="flex flex-wrap gap-2">
                           {viewingVoters.ownChoices && viewingVoters.ownChoices.map((code, idx) => (
                              <div key={idx} className="flex items-center bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5"><span className="text-indigo-300 text-xs font-bold mr-2">{idx+1}.</span><span className="text-indigo-800 text-sm font-bold">{POSITION_MAP[code]}</span></div>
                           ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-teal-500 mb-3 border-b border-teal-100 pb-1">支持者名單</h4>
                        <div className="flex flex-wrap gap-2">
                           {viewingVoters.voters && viewingVoters.voters.map((seat, idx) => (
                              <span key={idx} className="bg-teal-50 text-teal-600 border border-teal-100 px-3 py-1.5 rounded-xl text-sm font-bold">{getStudentNameLabel(seat)}</span>
                           ))}
                        </div>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {showPasswordModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               {/* ... Password Modal ... */}
               <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border-4 border-indigo-100 p-8 flex flex-col items-center">
                  <h3 className="text-xl font-bold text-slate-700 mb-2">請輸入管理密碼</h3>
                  <p className="text-slate-400 text-sm mb-4 text-center">請回答下列單字的英文</p>
                  <div className="bg-orange-100 text-orange-600 font-bold text-2xl px-6 py-3 rounded-2xl mb-6">{currentChallenge?.q}</div>
                  <form onSubmit={handlePasswordSubmit} className="w-full space-y-4">
                     <input type="password" autoFocus className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-center font-bold text-slate-700 outline-none" value={passwordInput} onChange={e => {setPasswordInput(e.target.value); setPasswordError(false)}}/>
                     {passwordError && <p className="text-rose-500 text-xs font-bold text-center">密碼錯誤</p>}
                     <div className="flex gap-3"><button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-bold">取消</button><button type="submit" className="flex-1 bg-indigo-500 text-white py-3 rounded-xl font-bold">確認</button></div>
                  </form>
               </div>
            </div>
          )}

          {showMapModal && (
             <div className="fixed inset-0 bg-indigo-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                {/* ... Map Modal ... */}
                <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border-4 border-indigo-50 flex flex-col max-h-[85vh]">
                   <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center justify-between"><h3 className="font-bold text-indigo-800 text-lg">職位代碼表</h3><button onClick={() => setShowMapModal(false)}><X size={20}/></button></div>
                   <div className="p-6 overflow-y-auto"><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{Object.entries(POSITION_MAP).map(([code, name]) => <div key={code} className="flex items-center gap-3 p-3 rounded-2xl border-2 border-slate-50 bg-white"><span className="bg-indigo-100 text-indigo-600 text-sm font-bold w-8 h-8 flex items-center justify-center rounded-xl">{code}</span><span className="text-slate-600 font-bold text-sm">{name}</span></div>)}</div></div>
                </div>
             </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-600 flex items-center gap-2">熱門人選 {filterDate && viewMode === 'teacher' && <span className="text-xs font-bold text-rose-400 bg-rose-100 px-2 py-1 rounded-lg">限定 {filterDate} 後</span>}</h2>
            {lastUpdated && viewMode === 'teacher' && <span className="text-xs text-slate-300 font-bold">Synced: {lastUpdated}</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredPositions.map(([code, name]) => {
              const p1Candidates = statistics[code]?.[1] || [];
              const p2Candidates = statistics[code]?.[2] || [];
              const p3Candidates = statistics[code]?.[3] || [];

              const p1Count = p1Candidates.length;
              const p2Count = p2Candidates.length;
              
              const isP2Active = p1Count < candidateLimit;
              const isP3Active = (p1Count + p2Count) < candidateLimit;

              // Check if position is "Full" (elected count >= quota)
              const codeStr = String(code);
              const quota = (codeStr === '1' || codeStr === '2') ? 1 : 2;
              let electedCount = 0;
              Object.values(electionState.selected || {}).forEach(pos => {
                if (pos === codeStr) electedCount++;
              });
              const isPositionFull = electedCount >= quota;

              // Card styling logic
              const isMissingHighlight = viewMode === 'student' && missingCodes.includes(String(code));
              
              // Check if student can vote here: Not full, has candidates
              const hasCandidates = p1Candidates.length > 0 || (isP2Active && p2Candidates.length > 0) || (isP3Active && p3Candidates.length > 0);
              const isVoteable = !isPositionFull && hasCandidates;
              
              // Student View Highlight for Voteable Cards
              const voteableStyle = viewMode === 'student' && isVoteable 
                ? 'border-indigo-300 shadow-indigo-100 shadow-lg bg-sky-50' 
                : 'border-slate-50 bg-white';
              
              const borderClass = isMissingHighlight 
                ? 'border-orange-400 ring-4 ring-orange-100 shadow-xl bg-orange-50' 
                : voteableStyle;

              const renderGroup = (candidates, rank, active, color) => {
                   const effectiveActive = active && !isPositionFull;
                   let bgClass, textClass, shadowClass;
                   
                   if (effectiveActive) {
                      if (color === 'red') { bgClass='bg-rose-400'; textClass='text-rose-400'; shadowClass='shadow-rose-100'; }
                      else if (color === 'orange') { bgClass='bg-orange-300'; textClass='text-orange-400'; shadowClass='shadow-orange-100'; }
                      else { bgClass='bg-amber-300'; textClass='text-amber-400'; shadowClass='shadow-amber-100'; }
                   } else {
                      bgClass = 'bg-slate-200'; textClass = 'text-slate-400'; shadowClass = 'shadow-none';
                   }

                   return (
                      <div className={`pl-2 border-l-4 ${effectiveActive ? (color === 'red' ? 'border-rose-200' : color === 'orange' ? 'border-orange-200' : 'border-amber-200') : 'border-slate-100'}`}>
                         <div className={`text-[10px] font-bold ${textClass} mb-1 flex justify-between`}>
                            {rank === 1 ? '第一志願' : rank === 2 ? '第二志願' : '第三志願'}
                            <span className={`${effectiveActive ? (color === 'red' ? 'bg-rose-50 text-rose-300' : color === 'orange' ? 'bg-orange-50 text-orange-300' : 'bg-amber-50 text-amber-300') : 'bg-slate-50 text-slate-300'} px-1.5 rounded-md`}>{candidates.length}</span>
                         </div>
                         <div className="flex flex-wrap gap-1.5">
                            {candidates.length > 0 ? candidates.map((s, i) => {
                               const key = `${code}_${s}`;
                               const vCount = (voteRecords[key] || []).length;
                               const isDrafted = draftVotes[code] === s;
                               
                               const selectedPos = electionState.selected?.[s];
                               const isSelectedForThis = selectedPos === String(code);
                               const isSelectedForOther = selectedPos && selectedPos !== String(code);
                               
                               // Interaction disabled if:
                               // 1. Group inactive (limit reached) OR Position Full
                               // 2. Teacher mode
                               // 3. Candidate already selected (for this or other)
                               const isDisabled = (!active || isPositionFull) || viewMode === 'teacher' || isSelectedForThis || isSelectedForOther;
                               
                               // Style for selected candidate (This position)
                               const selectedStyle = isSelectedForThis 
                                 ? 'ring-0 shadow-sm' // Removed border, reduced padding logic in className
                                 : '';
                                 
                               // Style for excluded candidate (Selected elsewhere)
                               // Now same as inactive default + icon
                               const excludedStyle = isSelectedForOther
                                 ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                 : '';
                                 
                               // Cursor logic
                               const cursorClass = (isSelectedForThis || isSelectedForOther) ? 'cursor-not-allowed' : (isDisabled && viewMode === 'student' ? 'cursor-not-allowed' : 'cursor-pointer');

                               return (
                                  <div key={i} className="flex items-center gap-1">
                                     <button 
                                       onClick={() => {
                                          if (viewMode === 'student' && active && !isDisabled) handleToggleDraftVote(code, s);
                                          if (viewMode === 'teacher') handleOpenVoters(code, s, getStudentNameLabel(s));
                                       }}
                                       disabled={isDisabled && viewMode === 'student'} 
                                       className={`
                                          px-1.5 py-1 rounded-xl text-sm font-bold shadow-sm flex items-center gap-0.5 transition-all relative
                                          ${effectiveActive && !isSelectedForThis && !isSelectedForOther ? 'text-white' : ''}
                                          ${effectiveActive && !isSelectedForThis && !isSelectedForOther ? bgClass : ''}
                                          ${effectiveActive && !isSelectedForThis && !isSelectedForOther && shadowClass}
                                          ${selectedStyle}
                                          ${excludedStyle}
                                          ${!effectiveActive && !isSelectedForThis && !isSelectedForOther ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}
                                          ${viewMode === 'student' && active && !isDisabled && !hasSubmitted ? 'hover:scale-105 active:scale-95 cursor-pointer' : ''}
                                          ${viewMode === 'teacher' ? 'cursor-pointer hover:opacity-80' : ''}
                                          ${isDrafted ? 'ring-2 ring-offset-1 ring-indigo-300' : ''}
                                          ${(isSelectedForThis || isSelectedForOther) ? 'cursor-not-allowed' : ''}
                                       `}
                                       title={getStudentFullName(s)}
                                     >
                                        {/* 卜 Icon */}
                                        {(isSelectedForThis || isSelectedForOther) && (
                                           <span className={`rounded-full w-4 h-4 flex items-center justify-center text-[10px] mr-0.5 border ${isSelectedForThis ? 'bg-red-600 text-white border-white' : 'bg-transparent text-slate-400 border-slate-300'}`}>卜</span>
                                        )}
                                        {isDrafted && !isSelectedForThis && !isSelectedForOther && <Check size={12} className="mr-0.5" strokeWidth={3}/>}
                                        {getStudentNameLabel(s)}
                                        {viewMode === 'student' && isDisabled && !isSelectedForThis && !isSelectedForOther && <div className="absolute inset-0 bg-white/50 rounded-xl cursor-not-allowed" />}
                                     </button>
                                     
                                     {/* Teacher View OR Student View (Submitted): Show Votes */}
                                     {((viewMode === 'teacher') || (viewMode === 'student' && hasSubmitted)) && vCount > 0 && (
                                        <div className="flex items-end h-3 gap-[1px]">{renderAdvancedBattery(vCount)}</div>
                                     )}
                                  </div>
                               )
                            }) : <span className="bg-slate-50 text-slate-300 px-2 py-1 rounded-lg text-xs font-bold w-full text-center border border-slate-100 border-dashed">無人選填</span>}
                         </div>
                      </div>
                   )
              };

              return (
              <div key={code} className={`rounded-3xl shadow-sm border-2 overflow-hidden flex flex-col transition-all group ${borderClass}`}>
                <div className={`p-3 border-b flex justify-between items-center transition-colors ${missingCodes.includes(String(code)) && viewMode === 'student' ? 'bg-orange-100 border-orange-200' : (isVoteable && viewMode === 'student' ? 'bg-sky-100/50 border-indigo-200' : 'bg-slate-50/50 border-slate-100 group-hover:bg-sky-50/30')}`}>
                  <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <span className="text-slate-300 text-sm font-mono bg-white px-1.5 rounded-md border border-slate-100">{code}</span>
                    {name}
                    {isPositionFull && (
                      <span className="bg-red-600 text-white border border-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shadow-sm ml-1">
                        滿
                      </span>
                    )}
                  </h3>
                </div>
                
                <div className="p-3 space-y-3 flex-1">
                  {renderGroup(p1Candidates, 1, true, 'red')}
                  {renderGroup(p2Candidates, 2, isP2Active, 'orange')}
                  {renderGroup(p3Candidates, 3, isP3Active, 'yellow')}
                </div>
              </div>
            );
            })}
          </div>
          
          {viewMode === 'teacher' && (
              <div className="mt-8 animate-in fade-in slide-in-from-top-4">
                <div className="bg-white/80 border-2 border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden">
                  <h2 className="text-slate-600 font-bold flex items-center gap-2 text-lg mb-4">
                     <div className="bg-slate-100 p-1.5 rounded-full"><Activity className="text-slate-500" size={20} /></div>
                     學生登入記錄 (最近 40 筆)
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 rounded-l-xl">時間</th>
                          <th className="px-6 py-3">座號 / 姓名</th>
                          <th className="px-6 py-3">IP 位址</th>
                          <th className="px-6 py-3 rounded-r-xl">訊息</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginLogs.length > 0 ? (
                          loginLogs.map((log) => (
                            <tr key={log.id} className="bg-white border-b border-slate-50 hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-mono">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Updating...'}</td>
                              <td className="px-6 py-4 font-bold text-indigo-600">{log.seatNo} {log.name}</td>
                              <td className="px-6 py-4 font-mono text-slate-500">{log.ip}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${log.message.includes('強制') ? 'bg-rose-100 text-rose-600' : (log.message.includes('完成') ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-600')}`}>
                                  {log.message}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400 italic">尚無紀錄</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
           )}

        </main>
      </div>
    </>
  );
};

export default App;
