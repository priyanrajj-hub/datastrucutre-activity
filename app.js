/**
 * Campus Helpdesk Queue System — V5 (Production Polish)
 * 
 * Data Structures: Linked-List Queue + Hash Table (separate chaining)
 * 
 * Auth: UI-level demo gate (username: teacher, password: 12345)
 *       NOT production authentication.
 * 
 * Roll Number: Structured Amrita format with named regex groups —
 *   CAMPUS.SCHOOL.LEVELDEPTYYNNN (e.g. ch.en.u4cce25020)
 * 
 * Duplicate Logic: Composite key (rollNo + problemType + detail)
 *   while request is pending. Same student CAN have multiple different issues.
 * 
 * Persistence: localStorage serialization survives page refresh.
 */

/* ═══════════════════════════════════════════════ */
/*  Amrita Roll Number Validator                   */
/* ═══════════════════════════════════════════════ */

/**
 * Structured regex with named capture groups for the Amrita Vishwa Vidyapeetham
 * institutional roll number format.
 *
 * Format: CAMPUS.SCHOOL.LEVELDEPTYYNNN (case-insensitive, normalized to lowercase)
 * Example: ch.en.u4cce25020
 *
 * ┌─ Campus (2 chars): CH=Chennai, CB=Coimbatore, AM=Amritapuri, BL=Bengaluru, MY=Mysuru, KE=Kerala
 * │  ┌─ School (2 chars): EN=Engineering, MB=Business, AS=Arts&Sciences, AY=Ayurveda, NU=Nursing, PH=Pharmacy, DE=Dentistry, LA=Law
 * │  │  ┌─ Level: U2–U6 = UG (2–6yr programs), P1–P3 = PG (1–3yr programs)
 * │  │  │  ┌─ Dept (3 chars): CSE, CCE, ECE, EEE, MEE, CIV, CHE, BME, AIE, ADE, MTE, AGR, BIO, ARC,
 * │  │  │  │              ELC, PHY, MAT, CHM, ENG, MBA, BBA, MCA, BCA, MSW, LLB, LLM, BDS, MDS,
 * │  │  │  │              BPH, MPH, BNS, MNS, BAM, MAM
 * │  │  │  │  ┌─ Year (2 digits): 25 = 2025
 * │  │  │  │  │  ┌─ Serial (3 digits)
 * ch.en.u4cce25020
 */
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

    enqueue(rollNo, name, type, detail) {
        const dup = this.hasDuplicate(rollNo, type, detail);
        if (dup) return { ok: false, dup };

        const id = this._nextId();
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

    /* ── Persistence ── */
    serialize() {
        return JSON.stringify({
            counter: this._counter,
            items: this.toArray().map(r => ({
                requestId: r.requestId, rollNumber: r.rollNumber,
                studentName: r.studentName, problemType: r.problemType,
                issueDetail: r.issueDetail, status: r.status,
                timestamp: r.timestamp, department: r.department,
                admissionYear: r.admissionYear, memAddr: r.memAddr
            }))
        });
    }

    static deserialize(json) {
        const q = new HelpdeskQueue();
        try {
            const d = JSON.parse(json);
            q._counter = d.counter || 1;
            (d.items || []).forEach(i => {
                const r = new Request(i.requestId, i.rollNumber, i.studentName, i.problemType, i.issueDetail);
                r.status = i.status;
                r.timestamp = i.timestamp;
                if (i.department) r.department = i.department;
                if (i.admissionYear) r.admissionYear = i.admissionYear;
                if (i.memAddr) r.memAddr = i.memAddr;
                if (!q.rear) { q.front = q.rear = r; }
                else { q.rear.next = r; q.rear = r; }
                q.ht.insert(r.requestId, r);
                q.ht.insert(r.rollNumber, r);
                q.ht.insert(r.studentName, r);
                q.size++;
            });
        } catch (e) { console.warn('[Helpdesk] Failed to restore queue:', e); }
        return q;
    }
}

/* ═══════════════════════════════════════════════ */
/*  App State                                      */
/* ═══════════════════════════════════════════════ */

const STORAGE_KEY = 'campus_helpdesk_queue_v5';
let CQ = localStorage.getItem(STORAGE_KEY)
    ? HelpdeskQueue.deserialize(localStorage.getItem(STORAGE_KEY))
    : new HelpdeskQueue();

let resolvedSession = 0;
let isAnimating = false;
let currentRole = 'student';
let hasStaffAccess = false;

function persist() { localStorage.setItem(STORAGE_KEY, CQ.serialize()); }

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

// Credential gate
UI.lForm.addEventListener('submit', e => {
    e.preventDefault();
    if (UI.lUser.value.trim() === 'teacher' && UI.lPass.value === '12345') {
        hasStaffAccess = true;
        UI.lError.classList.add('hidden');
        UI.lUser.value = ''; UI.lPass.value = '';
        showToast('Authenticated — welcome to the staff dashboard.');
        renderRouting();
        syncData();
    } else {
        UI.lError.classList.remove('hidden');
    }
});

UI.btnLogout.addEventListener('click', () => {
    hasStaffAccess = false;
    currentRole = 'student';
    UI.rSelect.value = 'student';
    showToast('Signed out successfully.');
    renderRouting();
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
/*  Dashboard Sync                                 */
/* ═══════════════════════════════════════════════ */

function syncData() {
    const items = CQ.toArray();
    UI.sPend.textContent = CQ.size;
    UI.sRes.textContent = resolvedSession;

    // Table
    UI.tbody.innerHTML = '';
    if (CQ.size === 0) {
        UI.table.classList.add('hidden');
        UI.empty.classList.remove('hidden');
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
            const valHtml = keys.length ? keys.join('<br>') : 'NULL';
            b.innerHTML = `<div class="hb-idx">[ ${i} ]</div><div class="hb-val ${keys.length ? '' : 'null'}" style="font-size:0.55rem; line-height:1.2;">${valHtml}</div>`;
            hArray.appendChild(b);
        }
    }

    persist();
}

/* ═══════════════════════════════════════════════ */
/*  3D Visualizer                                  */
/* ═══════════════════════════════════════════════ */

function sync3DScene(items) {
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
        node.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;

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
        headNode.style.transform = `translate3d(${-centerOffset}px, -100px, 15px)`;
        headNode.innerHTML = `
            <div class="ptr-title">Head</div>
            <div class="ptr-target">${items[0].memAddr}</div>
            <div class="ptr-down-arrow"></div>
        `;

        const tailIdx = items.length - 1;
        const tailX = (tailIdx * spacingX) - centerOffset;
        const tailNode = document.createElement('div');
        tailNode.className = 'ptr-node';
        tailNode.style.transform = `translate3d(${tailX}px, -100px, ${tailIdx * -25 + 15}px)`;
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
/*  Enqueue                                        */
/* ═══════════════════════════════════════════════ */

let lastSubmitTime = 0;
UI.addForm.addEventListener('submit', e => {
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
    const res = CQ.enqueue(roll, name, type, detail);

    if (!res.ok) {
        const d = res.dup;
        showToast(`You already have an open "${d.problemType}" request (${d.requestId}). Wait for it to be resolved.`, 'error', 6000);
        return;
    }

    syncData();

    // Animate if visualizer is visible
    const n = document.getElementById('q3d-' + res.req.requestId);
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
    showToast(`${res.req.requestId} submitted — you are #${CQ.size} in queue.`);
});

/* ═══════════════════════════════════════════════ */
/*  Dequeue & Remove                               */
/* ═══════════════════════════════════════════════ */

UI.btnProcess.addEventListener('click', () => {
    if (CQ.size === 0 || isAnimating) return;
    isAnimating = true;
    hlLine(['rm-1', 'rm-2', 'rm-3', 'h-4']);

    const frontReq = CQ.front;
    const n = document.getElementById('q3d-' + frontReq.requestId);

    if (n && UI.tVis.checked) {
        n.classList.add('anim-dequeue');
        setTimeout(() => finishDequeue(frontReq), 600);
    } else {
        finishDequeue(frontReq);
    }
});

function finishDequeue(frontReq) {
    CQ.dequeue();
    resolvedSession++;
    isAnimating = false;
    syncData();
    showToast(`Resolved ${frontReq.requestId} — ${frontReq.studentName}`);
}

function staffRemoveById(id) {
    if (isAnimating) return;
    const removed = CQ.removeById(id);
    if (removed) {
        resolvedSession++;
        syncData();
        showToast(`Removed ${removed.requestId} from queue.`);
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

// Student self-check
UI.btnStuSrc.addEventListener('click', () => {
    const val = UI.inStuSrc.value.trim().toUpperCase();
    if (!val) return;
    const req = CQ.search(val);
    if (req) {
        UI.stuRes.textContent = `${val} is at position ${CQ.getPosition(val)} of ${CQ.size} in the queue.`;
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

    // Enqueue node 1
    const d1 = CQ.enqueue(r1, 'Alice Check', 'WiFi', '');
    syncData();
    const n1 = document.getElementById('q3d-' + d1.req.requestId);
    if (n1) { n1.style.transform = ''; n1.classList.add('anim-enqueue'); }
    await new Promise(r => setTimeout(r, 900));

    // Enqueue node 2
    const d2 = CQ.enqueue(r2, 'Bob Check', 'Other', 'Demo issue');
    syncData();
    const n2 = document.getElementById('q3d-' + d2.req.requestId);
    if (n2) { n2.style.transform = ''; n2.classList.add('anim-enqueue'); }
    await new Promise(r => setTimeout(r, 1000));

    // Search Demo
    isAnimating = true;
    await animateHashSearch(d2.req.requestId);
    isAnimating = false;
    await new Promise(r => setTimeout(r, 500));

    // Dequeue front
    UI.btnProcess.click();
    setTimeout(() => { UI.btnDemo.disabled = false; }, 1000);
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
syncData();
