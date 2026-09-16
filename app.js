/**
 * Campus Helpdesk Queue System — V7 (Firebase Cloud Sync)
 * 
 * Data Structures: Linked-List Queue + Hash Table (separate chaining)
 * 
 * Auth: Firebase Authentication (Email/Password)
 *       Staff user must be created in Firebase Console.
 * 
 * Roll Number: Structured Amrita format with named regex groups —
 *   CAMPUS.SCHOOL.LEVELDEPTYYNNN (e.g. ch.en.u4cce25020)
 * 
 * Duplicate Logic: Composite key (rollNo + problemType + detail)
 *   while request is pending. Same student CAN have multiple different issues.
 * 
 * Persistence: Cloud Firestore — real-time sync across all devices.
 *   In-memory Queue + Hash Table mirror Firestore state for visualization only.
 */

/* ═══════════════════════════════════════════════ */
/*  Amrita Roll Number Validator                   */
/* ═══════════════════════════════════════════════ */

const AMRITA_ROLL_REGEX = /^(?<campus>ch|cb|am|bl|my|ke)\.(?<school>en|mb|as|ay|nu|ph|de|la)\.(?<level>u[2-6]|p[1-3])(?<dept>cse|cce|ece|eee|mee|civ|che|bme|aie|ade|mte|agr|bio|arc|elc|phy|mat|chm|eng|mba|bba|mca|bca|msw|llb|llm|bds|mds|bph|mph|bns|mns|bam|mam)(?<year>\d{2})(?<serial>\d{3})$/i;

function parseRollNumber(rollNo) {
    const m = AMRITA_ROLL_REGEX.exec(rollNo.toLowerCase());
    if (!m) return null;
    return {
        campus: m.groups.campus,
        school: m.groups.school,
        level: m.groups.level,
        dept: m.groups.dept,
        year: m.groups.year,
        serial: m.groups.serial
    };
}

const NAME_REGEX = /^[a-zA-Z\s]+$/;

/* ═══════════════════════════════════════════════ */
/*  Data Model                                     */
/* ═══════════════════════════════════════════════ */

class Request {
    constructor(requestId, rollNo, name, type, detail) {
        this.requestId = requestId;
        this.rollNumber = rollNo;
        this.studentName = name;
        this.problemType = type;
        this.issueDetail = detail || '';
        this.status = 'pending';
        this.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.next = null;

        // Parse structured fields from roll number
        const parsed = parseRollNumber(rollNo);
        this.department = parsed ? parsed.dept.toUpperCase() : '—';
        this.admissionYear = parsed ? '20' + parsed.year : '—';

        // Literal hardware memory address simulation
        this.memAddr = '0x' + Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    }
}

/* ═══════════════════════════════════════════════ */
/*  Hash Table (Separate Chaining)                 */
/* ═══════════════════════════════════════════════ */

class HashTable {
    constructor(size = 17) {
        this.size = size;
        this.buckets = new Array(this.size).fill(null);
    }

    /** Polynomial rolling hash: h = Σ(char × 31^i) mod size */
    hash(key) {
        let str = String(key).toUpperCase();
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = (h * 31 + str.charCodeAt(i)) % this.size;
        }
        return h;
    }

    insert(key, req) {
        if (!key) return;
        const strKey = String(key).toUpperCase();
        const idx = this.hash(strKey);
        const entry = { key: strKey, req: req, hashNext: this.buckets[idx] };
        this.buckets[idx] = entry;
    }

    find(key) {
        if (!key) return null;
        const strKey = String(key).toUpperCase();
        const idx = this.hash(strKey);
        let cur = this.buckets[idx];
        while (cur) {
            if (cur.key === strKey) return cur.req;
            cur = cur.hashNext;
        }
        return null;
    }

    removeNode(req) {
        this.removeKey(req.requestId);
        this.removeKey(req.rollNumber);
        this.removeKey(req.studentName);
    }

    removeKey(key) {
        if (!key) return;
        const strKey = String(key).toUpperCase();
        const idx = this.hash(strKey);
        let cur = this.buckets[idx], prev = null;
        while (cur) {
            if (cur.key === strKey) {
                if (prev) prev.hashNext = cur.hashNext;
                else this.buckets[idx] = cur.hashNext;
                return;
            }
            prev = cur;
            cur = cur.hashNext;
        }
    }
}

/* ═══════════════════════════════════════════════ */
/*  Queue (Linked-List FIFO)                       */
/* ═══════════════════════════════════════════════ */

class HelpdeskQueue {
    constructor() {
        this.front = null;
        this.rear = null;
        this.size = 0;
        this._counter = 1;
        this.ht = new HashTable(17);
    }

    _nextId() {
        return 'REQ-' + String(this._counter++).padStart(4, '0');
    }

    /** Composite duplicate: same roll + type + detail while still pending */
    hasDuplicate(rollNo, type, detail) {
        let cur = this.front;
        while (cur) {
            if (cur.status === 'pending' &&
                cur.rollNumber === rollNo &&
                cur.problemType === type &&
                cur.issueDetail === detail) {
                return cur;
            }
            cur = cur.next;
        }
        return null;
    }

    /**
     * enqueue — local only (for visualization mirror + auto-demo).
     * For real submissions, use enqueueToFirestore() below.
     */
    enqueue(rollNo, name, type, detail, overrideId) {
        const dup = this.hasDuplicate(rollNo, type, detail);
        if (dup) return { ok: false, dup };

        const id = overrideId || this._nextId();
        const req = new Request(id, rollNo, name, type, detail);

        if (!this.rear) { this.front = this.rear = req; }
        else { this.rear.next = req; this.rear = req; }

        this.ht.insert(req.requestId, req);
        this.ht.insert(req.rollNumber, req);
        this.ht.insert(req.studentName, req);
        this.size++;
        return { ok: true, req };
    }

    dequeue() {
        if (!this.front) return null;
        const t = this.front;
        this.front = this.front.next;
        if (!this.front) this.rear = null;
        t.status = 'resolved';
        this.ht.removeNode(t);
        this.size--;
        return t;
    }

    removeById(requestId) {
        if (!this.front) return null;
        let cur = this.front, prev = null;
        while (cur) {
            if (cur.requestId === requestId) {
                if (prev) prev.next = cur.next;
                else this.front = cur.next;
                if (cur === this.rear) this.rear = prev;
                cur.status = 'resolved';
                this.ht.removeNode(cur);
                this.size--;
                return cur;
            }
            prev = cur;
            cur = cur.next;
        }
        return null;
    }

    search(requestId) { return this.ht.find(requestId); }

    getPosition(requestId) {
        let p = 1, c = this.front;
        while (c) { if (c.requestId === requestId) return p; c = c.next; p++; }
        return -1;
    }

    toArray() {
        const a = []; let c = this.front;
        while (c) { a.push(c); c = c.next; }
        return a;
    }
}

/* ═══════════════════════════════════════════════ */
/*  App State                                      */
/* ═══════════════════════════════════════════════ */

let CQ = new HelpdeskQueue();
let resolvedSession = 0;
let isAnimating = false;
let currentRole = 'student';
let hasStaffAccess = false;
let initialSnapshotReceived = false;
let currentVizMode = '3d';
let rotX = 15, rotY = -10;

// Decentralized ID generation means we no longer need a global counter

/* ═══════════════════════════════════════════════ */
/*  DOM References                                 */
/* ═══════════════════════════════════════════════ */

const $ = id => document.getElementById(id);

const UI = {
    rSelect: $('role-select'),
    rContainer: $('role-container'),
    sTabs: $('staff-tabs'),
    tDash: $('tab-dashboard'),
    tVis: $('tab-visualizer'),
    authInfo: $('staff-auth-info'),
    btnLogout: $('btn-logout'),
    intakeSec: $('intake-section'),
    sGate: $('staff-login-gate'),
    vDash: $('view-dashboard'),
    vVis: $('view-visualizer'),
    addForm: $('add-form'),
    addSubmit: $('btn-submit'),
    inRoll: $('input-roll'),
    rollErr: $('roll-error'),
    rollValid: $('roll-valid'),
    inName: $('input-name'),
    nameErr: $('name-error'),
    inType: $('input-type'),
    descGrp: $('desc-group'),
    inDesc: $('input-desc'),
    btnStuSrc: $('btn-student-search'),
    inStuSrc: $('input-student-search'),
    stuRes: $('student-search-result'),
    lForm: $('login-form'),
    lUser: $('login-username'),
    lPass: $('login-password'),
    lError: $('login-error'),
    lSubmit: $('btn-login-submit'),
    btnToggle: $('btn-toggle-pass'),
    sPend: $('stat-pending'),
    sRes: $('stat-resolved'),
    tbody: $('queue-tbody'),
    empty: $('empty-state'),
    table: $('queue-table'),
    btnProcess: $('btn-process'),
    btnStaffSrc: $('btn-search'),
    inStaffSrc: $('input-search'),
    scene: $('scene'),
    canvas3D: document.querySelector('.canvas-3d-container'),
    vizModes: document.getElementsByName('viz-mode'),
    scEmpty: $('scene-empty'),
    btnDemo: $('btn-demo'),
    hashOvl: $('hash-overlay'),
    hashCalc: $('hash-calc-text'),
    hashBkt: $('hash-bucket-text'),
    toast: $('toast'),
    toastIcon: $('toast-icon'),
    toastText: $('toast-text'),
    btnToastClose: $('btn-toast-close'),
    stuTools: $('student-tools')
};

/* ═══════════════════════════════════════════════ */
/*  Toast                                          */
/* ═══════════════════════════════════════════════ */

let toastTimer = null;
function showToast(msg, type = 'success', ms = 4000) {
    clearTimeout(toastTimer);
    UI.toast.className = 'toast ' + type;
    UI.toastIcon.textContent = type === 'success' ? '✅' : '❌';
    UI.toastText.textContent = msg;
    UI.toast.classList.remove('hidden');
    toastTimer = setTimeout(() => UI.toast.classList.add('hidden'), ms);
}
UI.btnToastClose.addEventListener('click', () => UI.toast.classList.add('hidden'));

/* ═══════════════════════════════════════════════ */
/*  Pseudocode Highlighting                        */
/* ═══════════════════════════════════════════════ */

function hlLine(lines, ms) {
    document.querySelectorAll('.cl').forEach(el => el.classList.remove('active'));
    lines.forEach(l => {
        const el = document.querySelector(`.cl[data-line="${l}"]`);
        if (el) el.classList.add('active');
    });
    if (ms > 0) setTimeout(() => hlLine([]), ms);
}

/* ═══════════════════════════════════════════════ */
/*  Routing & Auth                                 */
/* ═══════════════════════════════════════════════ */

function renderRouting() {
    // Hide everything
    UI.intakeSec.classList.add('hidden');
    UI.sGate.classList.add('hidden');
    UI.vDash.classList.add('hidden');
    UI.vVis.classList.add('hidden');
    UI.sTabs.classList.add('hidden');
    UI.authInfo.classList.add('hidden');
    UI.rContainer.classList.remove('hidden');
    UI.stuTools.classList.add('hidden');

    if (currentRole === 'student') {
        UI.intakeSec.classList.remove('hidden');
        UI.stuTools.classList.remove('hidden');
    } else {
        if (!hasStaffAccess) {
            UI.sGate.classList.remove('hidden');
        } else {
            UI.rContainer.classList.add('hidden');
            UI.authInfo.classList.remove('hidden');
            UI.sTabs.classList.remove('hidden');
            UI.intakeSec.classList.remove('hidden');
            if (UI.tDash.checked) UI.vDash.classList.remove('hidden');
            else UI.vVis.classList.remove('hidden');
        }
    }
}

UI.rSelect.addEventListener('change', e => { currentRole = e.target.value; renderRouting(); });
UI.tDash.addEventListener('change', renderRouting);
UI.tVis.addEventListener('change', renderRouting);

// Password toggle
UI.btnToggle.addEventListener('click', () => {
    const show = UI.lPass.type === 'password';
    UI.lPass.type = show ? 'text' : 'password';
    $('eye-open').classList.toggle('hidden', show);
    $('eye-closed').classList.toggle('hidden', !show);
});

// Login button enable/disable
function checkLoginFields() {
    UI.lSubmit.disabled = !(UI.lUser.value.trim() && UI.lPass.value.trim());
}
UI.lUser.addEventListener('input', checkLoginFields);
UI.lPass.addEventListener('input', checkLoginFields);

/* ═══════════════════════════════════════════════ */
/*  Firebase Auth — Login / Logout / State         */
/* ═══════════════════════════════════════════════ */

// Listen for auth state changes (persists across refreshes)
auth.onAuthStateChanged(user => {
    if (user) {
        hasStaffAccess = true;
        currentRole = 'staff';
        UI.rSelect.value = 'staff';
        renderRouting();
        // Start real-time listener when staff is authenticated
        startRealtimeListener();
    } else {
        hasStaffAccess = false;
        // Stop listener if running
        if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
            unsubscribeSnapshot = null;
        }
    }
    renderRouting();
    syncUI();
});

// Login form — Firebase Auth
UI.lForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = UI.lUser.value.trim();
    const password = UI.lPass.value;

    UI.lSubmit.disabled = true;
    UI.lError.classList.add('hidden');

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            UI.lUser.value = '';
            UI.lPass.value = '';
            showToast('Authenticated — welcome to the staff dashboard.');
            // onAuthStateChanged handles the rest
        })
        .catch(err => {
            console.error('Auth error:', err.code, err.message);
            // Map Firebase error codes to user-friendly messages
            const friendlyMessages = {
                'auth/invalid-email': 'Invalid email format. Use e.g. teacher@campus.edu',
                'auth/user-not-found': 'No staff account found for this email.',
                'auth/wrong-password': 'Incorrect password. Please try again.',
                'auth/invalid-credential': 'Invalid email or password. Please try again.',
                'auth/too-many-requests': 'Too many failed attempts. Please wait a moment.',
                'auth/network-request-failed': 'Network error — check your internet connection.',
                'auth/invalid-login-credentials': 'Invalid email or password. Please try again.'
            };
            const msg = friendlyMessages[err.code] || 'Authentication failed. Please check your credentials.';
            showToast(msg, 'error', 5000);

            // Try to find the text span inside the alert-error, otherwise overwrite
            const textSpan = UI.lError.querySelector('span');
            if (textSpan) textSpan.textContent = msg;
            else UI.lError.textContent = msg;

            UI.lError.classList.remove('hidden');
            UI.lSubmit.disabled = false;
        });
});

// Logout — Firebase Auth
UI.btnLogout.addEventListener('click', () => {
    auth.signOut().then(() => {
        hasStaffAccess = false;
        currentRole = 'student';
        UI.rSelect.value = 'student';
        showToast('Signed out successfully.');
        renderRouting();
    });
});

/* ═══════════════════════════════════════════════ */
/*  Form Logic                                     */
/* ═══════════════════════════════════════════════ */

// Conditional "Other" description
UI.inType.addEventListener('change', e => {
    if (e.target.value === 'Other') {
        UI.descGrp.classList.remove('hidden');
        UI.inDesc.setAttribute('required', 'true');
    } else {
        UI.descGrp.classList.add('hidden');
        UI.inDesc.removeAttribute('required');
    }
});

// Inline roll number validation
UI.inRoll.addEventListener('input', e => {
    const v = e.target.value.trim();
    if (v.length === 0) {
        UI.inRoll.classList.remove('error-field', 'valid-field');
        UI.rollErr.classList.add('hidden');
        UI.rollValid.classList.add('hidden');
    } else if (AMRITA_ROLL_REGEX.test(v)) {
        UI.inRoll.classList.remove('error-field');
        UI.inRoll.classList.add('valid-field');
        UI.rollErr.classList.add('hidden');
        UI.rollValid.classList.remove('hidden');
    } else {
        UI.inRoll.classList.add('error-field');
        UI.inRoll.classList.remove('valid-field');
        UI.rollErr.classList.remove('hidden');
        UI.rollValid.classList.add('hidden');
    }
});

// Inline name validation
UI.inName.addEventListener('input', e => {
    const v = e.target.value;
    if (v.length > 0 && !NAME_REGEX.test(v)) {
        UI.inName.classList.add('error-field');
        UI.nameErr.classList.remove('hidden');
    } else {
        UI.inName.classList.remove('error-field');
        UI.nameErr.classList.add('hidden');
    }
});

/* ═══════════════════════════════════════════════ */
/*  Firestore — Write (Enqueue)                    */
/* ═══════════════════════════════════════════════ */

/**
 * Generate the next request ID. 
 * Since students cannot read the global list (security rule),
 * we generate a decentralized random ID to prevent collisions.
 */
async function getNextRequestId() {
    // Generate a short 6-character random ID (e.g. REQ-A4F9B2)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let rand = '';
    for (let i = 0; i < 6; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
    return 'REQ-' + rand;
}

/**
 * Write a new request to Firestore.
 * Document ID = requestId (e.g. REQ-0001) to keep hash-table visualizer working.
 */
async function enqueueToFirestore(rollNo, name, type, detail) {
    // Check local mirror for duplicates first
    const dup = CQ.hasDuplicate(rollNo, type, detail);
    if (dup) return { ok: false, dup };

    const requestId = await getNextRequestId();

    const docData = {
        requestId: requestId,
        rollNumber: rollNo,
        studentName: name,
        problemType: type,
        issueDetail: detail || '',
        status: 'queued',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        department: (() => {
            const p = parseRollNumber(rollNo);
            return p ? p.dept.toUpperCase() : '—';
        })(),
        admissionYear: (() => {
            const p = parseRollNumber(rollNo);
            return p ? '20' + p.year : '—';
        })()
    };

    try {
        await db.collection('requests').doc(requestId).set(docData);
        return { ok: true, requestId: requestId };
    } catch (err) {
        console.error('Firestore write error:', err);
        throw err;
    }
}

/* ═══════════════════════════════════════════════ */
/*  Firestore — Dequeue / Remove                   */
/* ═══════════════════════════════════════════════ */

async function dequeueFromFirestore() {
    if (CQ.size === 0) return null;
    const frontReq = CQ.front;
    try {
        await db.collection('requests').doc(frontReq.requestId).update({
            status: 'resolved',
            resolvedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return frontReq;
    } catch (err) {
        console.error('Firestore dequeue error:', err);
        throw err;
    }
}

async function removeByIdFromFirestore(requestId) {
    try {
        await db.collection('requests').doc(requestId).update({
            status: 'resolved',
            resolvedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (err) {
        console.error('Firestore remove error:', err);
        throw err;
    }
}

/* ═══════════════════════════════════════════════ */
/*  Firestore — Real-Time Listener (onSnapshot)    */
/* ═══════════════════════════════════════════════ */

let unsubscribeSnapshot = null;

/**
 * Rebuild the in-memory HelpdeskQueue from Firestore snapshot data.
 * This drives the visualization — Firestore is the source of truth.
 */
function rebuildQueueFromDocs(docs) {
    const newQ = new HelpdeskQueue();

    // Sort by createdAt (server timestamp), falling back to requestId order
    const sorted = docs.sort((a, b) => {
        const tsA = a.createdAt ? a.createdAt.toMillis() : 0;
        const tsB = b.createdAt ? b.createdAt.toMillis() : 0;
        if (tsA !== tsB) return tsA - tsB;
        return a.requestId.localeCompare(b.requestId);
    });

    let maxCounter = 0;
    sorted.forEach(d => {
        // Extract numeric part of requestId to track counter
        const num = parseInt(d.requestId.replace('REQ-', ''), 10);
        if (num >= maxCounter) maxCounter = num + 1;

        const req = new Request(d.requestId, d.rollNumber, d.studentName, d.problemType, d.issueDetail || '');
        req.status = 'pending'; // only queued docs reach here
        if (d.department) req.department = d.department;
        if (d.admissionYear) req.admissionYear = d.admissionYear;

        // Reconstruct timestamp from Firestore
        if (d.createdAt && d.createdAt.toDate) {
            req.timestamp = d.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        if (!newQ.rear) { newQ.front = newQ.rear = req; }
        else { newQ.rear.next = req; newQ.rear = req; }

        newQ.ht.insert(req.requestId, req);
        newQ.ht.insert(req.rollNumber, req);
        newQ.ht.insert(req.studentName, req);
        newQ.size++;
    });

    return newQ;
}

/**
 * Start the Firestore onSnapshot real-time listener.
 * Only staff users can list the collection (per security rules),
 * so this is called after successful auth.
 */
function startRealtimeListener() {
    if (unsubscribeSnapshot) return; // already listening

    unsubscribeSnapshot = db.collection('requests')
        .where('status', '==', 'queued')
        .orderBy('createdAt', 'asc')
        .onSnapshot(snapshot => {
            initialSnapshotReceived = true;
            const docs = [];
            snapshot.forEach(doc => docs.push(doc.data()));

            const prevSize = CQ.size;
            CQ = rebuildQueueFromDocs(docs);
            syncUI();

            // Subtle sync toast
            if (prevSize !== CQ.size && prevSize > 0) {
                showToast('🔄 Live sync updated', 'success', 1500);
            }
        }, err => {
            console.error('Firestore snapshot error:', err);
        });
}

/* ═══════════════════════════════════════════════ */
/*  Firestore — Student Track Request              */
/* ═══════════════════════════════════════════════ */

/**
 * Students can look up their own request by requestId (direct doc get).
 * This uses the `get` permission (allowed for everyone).
 */
async function studentTrackRequest(searchVal) {
    const upperVal = searchVal.toUpperCase();

    // First try in-memory mirror (fast path — works if snapshot is active)
    const local = CQ.search(upperVal);
    if (local) {
        return { found: true, req: local, position: CQ.getPosition(upperVal) };
    }

    // Fallback: query Firestore directly by doc ID
    try {
        const doc = await db.collection('requests').doc(upperVal).get();
        if (doc.exists) {
            const d = doc.data();
            return {
                found: true,
                req: d,
                position: d.status === 'queued' ? 'in queue' : 'resolved'
            };
        }
    } catch (e) {
        console.warn('Student track query failed:', e);
    }

    return { found: false };
}

/* ═══════════════════════════════════════════════ */
/*  Dashboard Sync (UI Only)                       */
/* ═══════════════════════════════════════════════ */

function syncUI() {
    const items = CQ.toArray();
    UI.sPend.textContent = CQ.size;
    UI.sRes.textContent = resolvedSession;

    // Table
    UI.tbody.innerHTML = '';
    if (CQ.size === 0) {
        UI.table.classList.add('hidden');
        UI.empty.classList.remove('hidden');
        if (hasStaffAccess && !initialSnapshotReceived) {
            UI.empty.textContent = 'Loading live queue...';
        } else {
            UI.empty.textContent = 'Queue is empty.';
        }
    } else {
        UI.table.classList.remove('hidden');
        UI.empty.classList.add('hidden');

        items.forEach((req, idx) => {
            const tr = document.createElement('tr');
            tr.id = 'row-' + req.requestId;

            // # Position
            const tdPos = document.createElement('td');
            tdPos.textContent = idx + 1;
            tdPos.style.fontWeight = '600';
            tdPos.style.color = 'var(--text-secondary)';

            // Request ID
            const tdId = document.createElement('td');
            tdId.className = 'td-id';
            tdId.textContent = req.requestId;

            // Student (Roll + Name stacked)
            const tdStu = document.createElement('td');
            const nameDiv = document.createElement('div');
            nameDiv.className = 'td-name';
            nameDiv.textContent = req.studentName;
            const rollDiv = document.createElement('div');
            rollDiv.className = 'td-roll';
            rollDiv.textContent = req.rollNumber;
            tdStu.append(nameDiv, rollDiv);

            // Department badge
            const tdDept = document.createElement('td');
            const deptBadge = document.createElement('span');
            deptBadge.className = 'badge bd-dept';
            deptBadge.textContent = req.department;
            tdDept.appendChild(deptBadge);

            // Problem
            const tdProb = document.createElement('td');
            tdProb.textContent = req.problemType === 'Other'
                ? 'Other: ' + req.issueDetail : req.problemType;

            // Time
            const tdTime = document.createElement('td');
            tdTime.className = 'td-time';
            tdTime.textContent = req.timestamp;

            // Actions
            const tdAct = document.createElement('td');
            const rmBtn = document.createElement('button');
            rmBtn.className = 'btn-remove';
            rmBtn.textContent = '✕ Remove';
            rmBtn.addEventListener('click', () => staffRemoveById(req.requestId));
            tdAct.appendChild(rmBtn);

            tr.append(tdPos, tdId, tdStu, tdDept, tdProb, tdTime, tdAct);
            UI.tbody.appendChild(tr);
        });
    }

    sync3DScene(items);

    // Hash Table Array Hardware Rendering
    const hArray = document.getElementById('hash-array');
    if (hArray) {
        hArray.innerHTML = '';
        for (let i = 0; i < CQ.ht.size; i++) {
            let cur = CQ.ht.buckets[i];
            let keys = [];
            while (cur) { keys.push(cur.key); cur = cur.hashNext; }

            const b = document.createElement('div');
            b.className = 'hash-bucket';
            b.id = 'hb-' + i;
            b.style.cssText = "flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; border: 1px solid var(--slate-600); border-radius: 4px; overflow: hidden; background: var(--bg-surface); min-width: 50px;";
            const valHtml = keys.length ? keys.join('<br>') : 'NULL';
            b.innerHTML = `<div class="hb-idx" style="background:var(--slate-800); width:100%; text-align:center; padding:2px;">[ ${i} ]</div><div class="hb-val ${keys.length ? '' : 'null'}" style="font-size:0.55rem; line-height:1.2; padding:6px; color:${keys.length ? 'var(--amber-400)' : 'var(--slate-500)'}; font-family:monospace;">${valHtml}</div>`;
            hArray.appendChild(b);
        }
    }
}

/* ═══════════════════════════════════════════════ */
/*  3D Visualizer                                  */
/* ═══════════════════════════════════════════════ */

function sync3DScene(items) {
    UI.scene.className = 'scene ' + 'mode-' + currentVizMode;
    UI.scene.innerHTML = '';
    if (!items.length) { UI.scEmpty.classList.remove('hidden'); return; }
    UI.scEmpty.classList.add('hidden');

    const spacingX = 200;
    const centerOffset = ((items.length - 1) * spacingX) / 2;

    items.forEach((req, idx) => {
        const node = document.createElement('div');
        node.className = 'queue-node';
        node.id = 'q3d-' + req.requestId;

        // Spread horizontally, centered, slight diagonal pop back
        const x = (idx * spacingX) - centerOffset;
        const y = idx * -10;
        const z = idx * -25;
        if (currentVizMode === '3d') {
            node.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;
        } else {
            node.style.transform = '';
        }

        const isFront = idx === 0;
        const isRear = idx === items.length - 1;
        const nextAddr = req.next ? req.next.memAddr : 'NULL';
        const ptrClass = req.next ? '' : 'null';

        node.innerHTML = `
            ${isFront ? '<div class="scene-tag tag-front visible">FRONT</div>' : ''}
            <div style="text-align:center"><span class="node-address">${req.memAddr}</span></div>
            <div class="node-box">
                <div class="node-data">
                    <div class="n-rid">${req.requestId}</div>
                    <div class="n-roll">${req.rollNumber}</div>
                    <div class="n-dept">${req.department}</div>
                </div>
                <div class="node-ptr">
                    <span class="ptr-label">next:</span>
                    <span class="ptr-val ${ptrClass}">${nextAddr}</span>
                </div>
            </div>
            ${!isRear ? '<div class="node-arrow"></div>' : ''}
            ${isRear ? '<div class="scene-tag tag-rear visible">REAR</div>' : ''}
        `;
        UI.scene.appendChild(node);
    });

    // Add Physical Head/Tail Pointers floating in the 3D space
    if (items.length > 0) {
        const headNode = document.createElement('div');
        headNode.className = 'ptr-node';
        if (currentVizMode === '3d') headNode.style.transform = `translate3d(${-centerOffset}px, -100px, 15px)`;
        else headNode.style.transform = '';
        headNode.innerHTML = `
            <div class="ptr-title">Head</div>
            <div class="ptr-target">${items[0].memAddr}</div>
            <div class="ptr-down-arrow"></div>
        `;

        const tailIdx = items.length - 1;
        const tailX = (tailIdx * spacingX) - centerOffset;
        const tailNode = document.createElement('div');
        tailNode.className = 'ptr-node';
        if (currentVizMode === '3d') tailNode.style.transform = `translate3d(${tailX}px, -100px, ${tailIdx * -25 + 15}px)`;
        else tailNode.style.transform = '';
        tailNode.innerHTML = `
            <div class="ptr-title rear">Tail</div>
            <div class="ptr-target rear">${items[tailIdx].memAddr}</div>
            <div class="ptr-down-arrow rear"></div>
        `;

        UI.scene.appendChild(headNode);
        UI.scene.appendChild(tailNode);
    }
}

/* ═══════════════════════════════════════════════ */
/*  Visualizer Modes & Rotation                    */
/* ═══════════════════════════════════════════════ */

UI.vizModes.forEach(radio => {
    radio.addEventListener('change', e => {
        currentVizMode = e.target.value;
        if (currentVizMode === '3d') {
            UI.scene.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(0.9)`;
        } else {
            UI.scene.style.transform = '';
        }
        syncUI();
    });
});

let isDragging3D = false;
let lastMouse = { x: 0, y: 0 };

UI.canvas3D.addEventListener('mousedown', e => {
    if (currentVizMode !== '3d') return;
    isDragging3D = true;
    lastMouse = { x: e.clientX, y: e.clientY };
    UI.scene.style.transition = 'none';
});
document.addEventListener('mousemove', e => {
    if (!isDragging3D) return;
    const deltaX = e.clientX - lastMouse.x;
    const deltaY = e.clientY - lastMouse.y;
    rotY += deltaX * 0.5;
    rotX -= deltaY * 0.5;
    UI.scene.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(0.9)`;
    lastMouse = { x: e.clientX, y: e.clientY };
});
document.addEventListener('mouseup', () => {
    if (isDragging3D) {
        isDragging3D = false;
        UI.scene.style.transition = 'transform 0.8s cubic-bezier(0.33, 1, 0.68, 1)';
    }
});

/* ═══════════════════════════════════════════════ */
/*  Enqueue (Firebase)                             */
/* ═══════════════════════════════════════════════ */

let lastSubmitTime = 0;
UI.addForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (isAnimating) return;

    if (Date.now() - lastSubmitTime < 1500) {
        showToast('Rate limited: Please wait an internal clock cycle before enqueuing.', 'error');
        return;
    }
    lastSubmitTime = Date.now();

    const roll = UI.inRoll.value.toLowerCase().trim();
    const name = UI.inName.value.trim();
    const type = UI.inType.value;
    const detail = UI.inDesc.value.trim();

    // Validate
    if (!AMRITA_ROLL_REGEX.test(roll)) {
        showToast('Invalid roll number — expected e.g. ch.en.u4cce25020', 'error');
        return;
    }
    if (!NAME_REGEX.test(name)) {
        showToast('Name must contain letters and spaces only.', 'error');
        return;
    }

    hlLine(['enq-1', 'enq-2', 'enq-3', 'h-4'], 1200);

    try {
        const res = await enqueueToFirestore(roll, name, type, detail);

        if (!res.ok) {
            const d = res.dup;
            showToast(`You already have an open "${d.problemType}" request (${d.requestId}). Wait for it to be resolved.`, 'error', 6000);
            return;
        }

        // Add to local mirror for immediate feedback (will be overwritten by snapshot)
        const localRes = CQ.enqueue(roll, name, type, detail, res.requestId);
        syncUI();

        // Animate if visualizer is visible
        const n = document.getElementById('q3d-' + res.requestId);
        if (n) {
            const t = n.style.transform;
            n.style.transform = '';
            n.classList.add('anim-enqueue');
            setTimeout(() => { n.classList.remove('anim-enqueue'); n.style.transform = t; }, 600);
        }

        UI.addForm.reset();
        UI.descGrp.classList.add('hidden');
        UI.inRoll.classList.remove('valid-field', 'error-field');
        UI.rollValid.classList.add('hidden');
        showToast(`${res.requestId} submitted — you are #${CQ.size} in queue.`);
    } catch (err) {
        showToast('Failed to submit request. Check your connection.', 'error');
    }
});

/* ═══════════════════════════════════════════════ */
/*  Dequeue & Remove (Firebase)                    */
/* ═══════════════════════════════════════════════ */

UI.btnProcess.addEventListener('click', async () => {
    if (CQ.size === 0 || isAnimating) return;
    isAnimating = true;
    hlLine(['rm-1', 'rm-2', 'rm-3', 'h-4']);

    const frontReq = CQ.front;
    const n = document.getElementById('q3d-' + frontReq.requestId);

    if (n && UI.tVis.checked) {
        n.classList.add('anim-dequeue');
        setTimeout(async () => {
            try {
                await dequeueFromFirestore();
                resolvedSession++;
                // Local mirror will be updated by onSnapshot
                CQ.dequeue();
                syncUI();
                showToast(`Resolved ${frontReq.requestId} — ${frontReq.studentName}`);
            } catch (err) {
                showToast('Failed to process request.', 'error');
            }
            isAnimating = false;
        }, 600);
    } else {
        try {
            await dequeueFromFirestore();
            resolvedSession++;
            CQ.dequeue();
            syncUI();
            showToast(`Resolved ${frontReq.requestId} — ${frontReq.studentName}`);
        } catch (err) {
            showToast('Failed to process request.', 'error');
        }
        isAnimating = false;
    }
});

async function staffRemoveById(id) {
    if (isAnimating) return;
    try {
        await removeByIdFromFirestore(id);
        resolvedSession++;
        CQ.removeById(id);
        syncUI();
        showToast(`Removed ${id} from queue.`);
    } catch (err) {
        showToast('Failed to remove request.', 'error');
    }
}

/* ═══════════════════════════════════════════════ */
/*  Hash-Based Search                              */
/* ═══════════════════════════════════════════════ */

async function animateHashSearch(requestId) {
    if (CQ.size === 0) return { found: false };

    hlLine(['src-1', 'src-2', 'h-2', 'h-3']);
    const h = CQ.ht.hash(requestId);
    UI.hashCalc.textContent = '…';
    UI.hashBkt.textContent = '…';
    UI.hashOvl.classList.remove('hidden');
    await new Promise(r => setTimeout(r, 500));

    hlLine(['h-4', 'h-5']);
    UI.hashCalc.textContent = requestId;
    UI.hashBkt.textContent = h.toString();

    const hb = document.getElementById('hb-' + h);
    if (hb) hb.classList.add('active');

    await new Promise(r => setTimeout(r, 700));

    hlLine(['src-3']);
    UI.hashOvl.classList.add('hidden');
    if (hb) hb.classList.remove('active');

    const req = CQ.ht.find(requestId);
    if (req) {
        const n = document.getElementById('q3d-' + req.requestId);
        if (n) {
            const t = n.style.transform;
            n.style.transform = '';
            n.classList.add('anim-search');
            await new Promise(r => setTimeout(r, 600));
            n.classList.remove('anim-search');
            n.style.transform = t;
        }
        hlLine([], 100);
        return { found: true, pos: CQ.getPosition(requestId) };
    }
    hlLine([], 100);
    return { found: false };
}

// Staff search
UI.btnStaffSrc.addEventListener('click', async () => {
    const val = UI.inStaffSrc.value.trim().toUpperCase();
    if (!val || isAnimating) return;
    isAnimating = true;

    if (UI.tVis.checked) {
        const res = await animateHashSearch(val);
        if (res.found) showToast(`O(1) Hash Hit — position ${res.pos}`);
        else showToast('O(1) Hash Miss — not found.', 'error');
    } else {
        const req = CQ.search(val);
        if (req) {
            const row = document.getElementById('row-' + req.requestId);
            if (row) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                row.classList.add('row-highlight');
                setTimeout(() => row.classList.remove('row-highlight'), 1500);
            }
            showToast(`O(1) Hit — position ${CQ.getPosition(val)}`);
        } else {
            showToast('Request ID not found.', 'error');
        }
    }
    isAnimating = false;
});

// Student self-check — uses Firestore doc get
UI.btnStuSrc.addEventListener('click', async () => {
    const val = UI.inStuSrc.value.trim().toUpperCase();
    if (!val) return;

    const result = await studentTrackRequest(val);
    if (result.found) {
        const pos = typeof result.position === 'number'
            ? `position ${result.position} of ${CQ.size}`
            : result.position;
        UI.stuRes.textContent = `${val} — ${pos} in the queue.`;
        UI.stuRes.style.color = 'var(--accent)';
    } else {
        UI.stuRes.textContent = `${val} was not found in the queue.`;
        UI.stuRes.style.color = 'var(--red-400)';
    }
});

/* ═══════════════════════════════════════════════ */
/*  Auto-Demo                                      */
/* ═══════════════════════════════════════════════ */

let demoCount = 0;
UI.btnDemo.addEventListener('click', async () => {
    if (isAnimating) return;
    UI.btnDemo.disabled = true;
    demoCount++;

    const r1 = `ch.en.u4cse25${String(demoCount).padStart(3, '0')}`;
    const r2 = `ch.en.u4cce25${String(100 + demoCount).padStart(3, '0')}`;

    // For auto-demo, write directly to Firestore if staff is authenticated,
    // otherwise use local-only enqueue for visualization
    if (hasStaffAccess) {
        try {
            await enqueueToFirestore(r1, 'Alice Check', 'WiFi', '');
            // Wait briefly for onSnapshot to update
            await new Promise(r => setTimeout(r, 1000));

            const n1 = document.getElementById('q3d-' + CQ.toArray().slice(-1)[0]?.requestId);
            if (n1) { n1.style.transform = ''; n1.classList.add('anim-enqueue'); }
            await new Promise(r => setTimeout(r, 900));

            await enqueueToFirestore(r2, 'Bob Check', 'Other', 'Demo issue');
            await new Promise(r => setTimeout(r, 1000));

            const n2 = document.getElementById('q3d-' + CQ.toArray().slice(-1)[0]?.requestId);
            if (n2) { n2.style.transform = ''; n2.classList.add('anim-enqueue'); }
            await new Promise(r => setTimeout(r, 1000));

            // Search Demo
            isAnimating = true;
            const lastReq = CQ.toArray().slice(-1)[0];
            if (lastReq) await animateHashSearch(lastReq.requestId);
            isAnimating = false;
            await new Promise(r => setTimeout(r, 500));

            // Dequeue front
            UI.btnProcess.click();
            setTimeout(() => { UI.btnDemo.disabled = false; }, 1000);
        } catch (err) {
            showToast('Demo failed — check Firebase connection.', 'error');
            UI.btnDemo.disabled = false;
        }
    } else {
        // Local-only demo (student view, no Firestore write)
        const d1 = CQ.enqueue(r1, 'Alice Check', 'WiFi', '');
        syncUI();
        const n1 = document.getElementById('q3d-' + d1.req.requestId);
        if (n1) { n1.style.transform = ''; n1.classList.add('anim-enqueue'); }
        await new Promise(r => setTimeout(r, 900));

        const d2 = CQ.enqueue(r2, 'Bob Check', 'Other', 'Demo issue');
        syncUI();
        const n2 = document.getElementById('q3d-' + d2.req.requestId);
        if (n2) { n2.style.transform = ''; n2.classList.add('anim-enqueue'); }
        await new Promise(r => setTimeout(r, 1000));

        // Search Demo
        isAnimating = true;
        await animateHashSearch(d2.req.requestId);
        isAnimating = false;
        await new Promise(r => setTimeout(r, 500));

        // Dequeue front
        CQ.dequeue();
        resolvedSession++;
        syncUI();
        showToast('Demo complete (local only — login as staff for cloud sync).');
        setTimeout(() => { UI.btnDemo.disabled = false; }, 1000);
    }
});

/* ═══════════════════════════════════════════════ */
/*  Modal                                          */
/* ═══════════════════════════════════════════════ */

$('btn-info').addEventListener('click', () => $('info-modal').classList.remove('hidden'));
$('btn-close-modal').addEventListener('click', () => $('info-modal').classList.add('hidden'));

// Close modal on backdrop click
$('info-modal').addEventListener('click', e => {
    if (e.target === $('info-modal')) $('info-modal').classList.add('hidden');
});

/* ═══════════════════════════════════════════════ */
/*  Init                                           */
/* ═══════════════════════════════════════════════ */

renderRouting();
syncUI(); // Initial empty render


