const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'veridian.db');

async function seedDatabase() {
  // Remove existing DB for fresh seed
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('🗑️  Removed existing database');
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run('PRAGMA foreign_keys = ON');

  console.log('📦 Creating database schema...');

  // ============================================================
  // SCHEMA
  // ============================================================

  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('employee', 'admin')) DEFAULT 'employee',
      department TEXT,
      employment_type TEXT CHECK(employment_type IN ('full-time', 'contractor')) DEFAULT 'full-time',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE knowledge_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kb_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      keywords TEXT NOT NULL,
      requires_approval INTEGER DEFAULT 0,
      auto_resolvable INTEGER DEFAULT 0,
      escalation_required INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT UNIQUE NOT NULL,
      request_id TEXT,
      user_id INTEGER REFERENCES users(id),
      category TEXT NOT NULL,
      priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
      status TEXT CHECK(status IN ('open', 'in_progress', 'waiting_approval', 'waiting_response',
        'escalated', 'resolved', 'rejected', 'closed')) DEFAULT 'open',
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      resolution TEXT,
      assigned_to TEXT DEFAULT 'AI Agent',
      kb_articles_referenced TEXT DEFAULT '[]',
      agent_reasoning TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    )
  `);

  db.run(`
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
      sender_type TEXT CHECK(sender_type IN ('employee', 'agent', 'admin', 'system')) NOT NULL,
      sender_id INTEGER,
      content TEXT NOT NULL,
      kb_sources TEXT DEFAULT '[]',
      action_taken TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      reasoning TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run('CREATE INDEX idx_tickets_user_id ON tickets(user_id)');
  db.run('CREATE INDEX idx_tickets_status ON tickets(status)');
  db.run('CREATE INDEX idx_tickets_category ON tickets(category)');
  db.run('CREATE INDEX idx_tickets_created_at ON tickets(created_at)');
  db.run('CREATE INDEX idx_messages_ticket_id ON messages(ticket_id)');
  db.run('CREATE INDEX idx_audit_log_ticket_id ON audit_log(ticket_id)');

  console.log('✅ Schema created');

  // ============================================================
  // SEED DATA
  // ============================================================

  const salt = bcrypt.genSaltSync(10);
  const employeePass = bcrypt.hashSync('Employee@2026', salt);
  const adminPass = bcrypt.hashSync('Admin@2026', salt);

  // --- USERS ---
  console.log('👤 Seeding users...');

  const users = [
    ['EMP-ADMIN', 'IT Admin', 'admin@veridian-corp.example', adminPass, 'admin', 'IT', 'full-time'],
    ['EMP-001', 'Aditi Sharma', 'aditi.sharma@veridian-corp.example', employeePass, 'employee', 'Engineering', 'full-time'],
    ['EMP-002', 'Vikram Chawla', 'vikram.chawla@veridian-corp.example', employeePass, 'employee', 'Marketing', 'full-time'],
    ['EMP-003', 'Karan Mehta', 'karan.mehta@veridian-corp.example', employeePass, 'employee', 'Sales', 'full-time'],
    ['EMP-004', 'Ritu Bhatia', 'ritu.bhatia@veridian-corp.example', employeePass, 'employee', 'Analytics', 'full-time'],
    ['EMP-005', 'Sanjay Oberoi', 'sanjay.oberoi@veridian-corp.example', employeePass, 'employee', 'Engineering', 'full-time'],
    ['EMP-006', 'Meera Iyer', 'meera.iyer@veridian-corp.example', employeePass, 'employee', 'Operations', 'full-time'],
    ['EMP-007', 'Farhan Ali', 'farhan.ali@veridian-corp.example', employeePass, 'employee', 'Design', 'full-time'],
    ['EMP-008', 'Ananya Reddy', 'ananya.reddy@veridian-corp.example', employeePass, 'employee', 'HR', 'full-time'],
    ['EMP-009', 'Rohit Desai', 'rohit.desai@veridian-corp.example', employeePass, 'employee', 'Finance', 'full-time'],
    ['EMP-010', 'Kavya Pillai', 'kavya.pillai@veridian-corp.example', employeePass, 'employee', 'Finance', 'full-time'],
    ['EMP-011', 'Nikhil Bansal', 'nikhil.bansal@veridian-corp.example', employeePass, 'employee', 'Engineering', 'full-time'],
    ['EMP-012', 'Sneha Kulkarni', 'sneha.kulkarni@veridian-corp.example', employeePass, 'employee', 'Procurement', 'full-time'],
    ['EMP-013', 'Aman Gupta', 'aman.gupta@veridian-corp.example', employeePass, 'employee', 'Engineering', 'full-time'],
    ['EMP-014', 'Tanya Chopra', 'tanya.chopra@veridian-corp.example', employeePass, 'employee', 'Product', 'full-time'],
    ['EMP-015', 'Rahul Menon', 'rahul.menon@veridian-corp.example', employeePass, 'employee', 'Support', 'full-time'],
    ['EMP-100', 'R. Verma', 'r.verma@veridian-corp.example', employeePass, 'employee', 'Engineering', 'full-time'],
    ['EMP-101', 'S. Iyer', 's.iyer@veridian-corp.example', employeePass, 'employee', 'Marketing', 'full-time'],
    ['EMP-102', 'A. Khan', 'a.khan@veridian-corp.example', employeePass, 'employee', 'Analytics', 'full-time'],
    ['EMP-103', 'A. Joshi', 'a.joshi@veridian-corp.example', employeePass, 'employee', 'Sales', 'full-time'],
    ['EMP-104', 'M. Das', 'm.das@veridian-corp.example', employeePass, 'employee', 'Operations', 'full-time'],
    ['EMP-105', 'K. Singh', 'k.singh@veridian-corp.example', employeePass, 'employee', 'Design', 'full-time'],
    ['EMP-106', 'T. Rao', 't.rao@veridian-corp.example', employeePass, 'employee', 'Finance', 'full-time'],
    ['EMP-107', 'V. Nambiar', 'v.nambiar@veridian-corp.example', employeePass, 'employee', 'HR', 'full-time'],
    ['EMP-108', 'J. Fernandes', 'j.fernandes@veridian-corp.example', employeePass, 'employee', 'Product', 'full-time'],
    ['EMP-109', 'L. Menon', 'l.menon@veridian-corp.example', employeePass, 'employee', 'Support', 'full-time'],
  ];

  for (const u of users) {
    db.run(
      'INSERT INTO users (employee_id, name, email, password_hash, role, department, employment_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      u
    );
  }
  console.log(`   ✅ ${users.length} users created`);

  // --- KNOWLEDGE BASE ---
  console.log('📚 Seeding knowledge base...');

  const kbArticles = [
    ['KB-01', 'Password Reset', 'Account Access',
      'Employees can reset their own password via the self-service portal at any time. If locked out after 5 failed attempts, contact IT to unlock the account manually. No approval required.',
      JSON.stringify(['password', 'reset', 'locked', 'locked out', 'login', 'account', 'unlock', 'forgot password', 'cant login', 'sign in', 'credentials']),
      0, 1, 0],
    ['KB-02', 'VPN Access', 'Network Access',
      'VPN access is granted automatically to all full-time employees. Contractors require manager approval submitted via the access request form. VPN credentials expire every 90 days and must be renewed by the employee.',
      JSON.stringify(['vpn', 'remote access', 'credentials expired', 'vpn access', 'virtual private network', 'remote', 'connect remotely', 'contractor vpn']),
      0, 0, 0],
    ['KB-03', 'Laptop Replacement', 'Hardware',
      'Laptops are eligible for replacement after 3 years of service, or earlier in case of verified hardware failure. Requests must be raised at least 2 weeks in advance of intended replacement. Asset Management Policy: All company-issued hardware follows a standard 4-year refresh cycle. Early replacement outside this cycle requires Finance sign-off in addition to IT approval.',
      JSON.stringify(['laptop', 'computer', 'replacement', 'hardware failure', 'broken', 'dead', 'not turning on', 'screen', 'flickering', 'old laptop', 'new laptop']),
      0, 0, 0],
    ['KB-04', 'Software Installation Requests', 'Software',
      'Standard software (listed in the approved catalog) can be self-installed. Non-catalog software requires IT Security review, which takes 3-5 business days.',
      JSON.stringify(['software', 'install', 'application', 'program', 'tool', 'extension', 'browser extension', 'non-catalog', 'approved catalog', 'app']),
      1, 0, 0],
    ['KB-05', 'Printer Troubleshooting', 'Hardware',
      'For printer issues, first check the printer queue and restart the print spooler. If the issue persists after restart, log a ticket with the printer\'s asset tag.',
      JSON.stringify(['printer', 'print', 'paper jam', 'printing', 'spooler', 'paper', 'toner', 'scanner']),
      0, 0, 0],
    ['KB-06', 'Email Mailbox Quota', 'Email',
      'Default mailbox quota is 25GB. Employees nearing quota should archive old mail. Quota increases beyond 25GB require manager approval and are capped at 50GB.',
      JSON.stringify(['email', 'mailbox', 'quota', 'full', 'inbox', 'storage', 'cant send', 'mail', 'archive', 'mailbox full']),
      0, 0, 0],
    ['KB-07', 'Guest Wi-Fi Access', 'Network Access',
      'Guest Wi-Fi credentials are valid for 24 hours and can be generated by any employee from the front-desk kiosk. No IT ticket required.',
      JSON.stringify(['wifi', 'wi-fi', 'guest', 'visitor', 'wireless', 'guest access', 'internet access']),
      0, 1, 0],
    ['KB-08', 'Expense Software Access', 'Software',
      'Access to the expense management tool is granted by Finance, not IT. IT can only assist with login/technical issues once an account already exists.',
      JSON.stringify(['expense', 'expense tool', 'expense management', 'finance tool', 'expense software', 'reimbursement']),
      0, 0, 0],
    ['KB-09', 'Security Incident Reporting', 'Security',
      'Any suspected phishing email, malware, or unauthorized access attempt must be reported to security@veridian-corp.example immediately and should not be forwarded to other employees.',
      JSON.stringify(['phishing', 'suspicious', 'malware', 'virus', 'security', 'hack', 'unauthorized', 'breach', 'suspicious email', 'scam']),
      0, 0, 1],
    ['KB-10', 'Work-From-Home Equipment', 'Hardware',
      'Employees working remotely more than 3 days/week are eligible for a one-time home office equipment allowance (chair, monitor). Requires manager sign-off and Finance processing — IT only handles the equipment shipping request once approved.',
      JSON.stringify(['work from home', 'wfh', 'remote', 'home office', 'monitor', 'chair', 'equipment', 'home equipment', 'remote work']),
      1, 0, 0]
  ];

  for (const kb of kbArticles) {
    db.run(
      'INSERT INTO knowledge_base (kb_id, title, category, content, keywords, requires_approval, auto_resolvable, escalation_required) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      kb
    );
  }
  console.log(`   ✅ ${kbArticles.length} KB articles created`);

  // --- HISTORICAL TICKETS ---
  console.log('🎫 Seeding historical tickets...');

  const historicalTickets = [
    { ticket_id: 'TK-1042', user_emp: 'EMP-100', category: 'Network Access', priority: 'medium', status: 'closed', subject: 'VPN credential expired', description: 'VPN credentials have expired and need renewal.', resolution: 'Guided employee to renew VPN credentials via the self-service portal. Credentials renewed successfully.', kb_refs: '["KB-02"]', reasoning: 'Full-time employee with expired VPN credentials. Per KB-02, credentials expire every 90 days and can be renewed by the employee.', created: '2026-09-15 09:30:00', updated: '2026-09-15 10:15:00', resolved: '2026-09-15 10:15:00' },
    { ticket_id: 'TK-1043', user_emp: 'EMP-101', category: 'Hardware', priority: 'medium', status: 'in_progress', subject: 'Laptop replacement (3.2 yrs old)', description: 'Requesting laptop replacement. Current laptop is 3.2 years old.', resolution: null, kb_refs: '["KB-03"]', reasoning: 'Laptop is 3.2 years old, exceeding the 3-year eligibility threshold per KB-03. Approved for replacement.', created: '2026-09-16 11:00:00', updated: '2026-09-18 14:00:00', resolved: null },
    { ticket_id: 'TK-1044', user_emp: 'EMP-102', category: 'Software', priority: 'medium', status: 'waiting_approval', subject: 'Non-catalog software request', description: 'Requesting installation of a non-catalog analytics tool.', resolution: null, kb_refs: '["KB-04"]', reasoning: 'Non-catalog software requires IT Security review per KB-04. Submitted for review.', created: '2026-09-17 09:00:00', updated: '2026-09-17 09:30:00', resolved: null },
    { ticket_id: 'TK-1045', user_emp: 'EMP-103', category: 'Email', priority: 'low', status: 'closed', subject: 'Mailbox quota increase', description: 'Mailbox is nearing capacity, requesting quota increase.', resolution: 'Manager approved quota increase. Mailbox quota increased from 25GB to 35GB.', kb_refs: '["KB-06"]', reasoning: 'Per KB-06, quota increases beyond 25GB require manager approval, capped at 50GB.', created: '2026-09-14 14:00:00', updated: '2026-09-16 11:00:00', resolved: '2026-09-16 11:00:00' },
    { ticket_id: 'TK-1046', user_emp: 'EMP-104', category: 'Hardware', priority: 'low', status: 'closed', subject: 'Printer paper jam, floor 2', description: 'Printer on floor 2 showing paper jam error.', resolution: 'Technician cleared the paper jam and restarted the printer. Issue resolved.', kb_refs: '["KB-05"]', reasoning: 'Per KB-05, printer issue persisted after basic troubleshooting. Technician dispatched.', created: '2026-09-15 13:00:00', updated: '2026-09-15 15:30:00', resolved: '2026-09-15 15:30:00' },
    { ticket_id: 'TK-1047', user_emp: 'EMP-105', category: 'Hardware', priority: 'medium', status: 'waiting_approval', subject: 'Home office equipment request', description: 'Working remotely 4 days/week. Requesting home office equipment allowance.', resolution: null, kb_refs: '["KB-10"]', reasoning: 'Employee works remotely 4 days/week, qualifying for WFH equipment per KB-10.', created: '2026-09-17 10:00:00', updated: '2026-09-18 09:00:00', resolved: null },
    { ticket_id: 'TK-1048', user_emp: 'EMP-106', category: 'Security', priority: 'critical', status: 'escalated', subject: 'Phishing email reported', description: 'Employee reported receiving a suspicious phishing email.', resolution: null, kb_refs: '["KB-09"]', reasoning: 'Potential phishing attack. Immediately escalated to Security team per KB-09.', created: '2026-09-18 08:30:00', updated: '2026-09-18 08:35:00', resolved: null },
    { ticket_id: 'TK-1049', user_emp: 'EMP-107', category: 'Account Access', priority: 'medium', status: 'closed', subject: 'Password reset', description: 'Employee locked out of account after multiple failed login attempts.', resolution: 'Account unlocked and temporary password issued. Employee reset password via self-service portal.', kb_refs: '["KB-01"]', reasoning: 'Per KB-01, locked out after 5 failed attempts. IT unlocked the account manually.', created: '2026-09-16 09:00:00', updated: '2026-09-16 09:30:00', resolved: '2026-09-16 09:30:00' },
    { ticket_id: 'TK-1050', user_emp: 'EMP-108', category: 'Account Access', priority: 'high', status: 'closed', subject: 'Admin access request', description: 'Requesting admin access to internal system.', resolution: 'Request rejected. No sufficient business justification provided for admin-level access.', kb_refs: '[]', reasoning: 'Admin access requests require strong business justification. Rejected.', created: '2026-09-15 16:00:00', updated: '2026-09-16 10:00:00', resolved: '2026-09-16 10:00:00' },
    { ticket_id: 'TK-1051', user_emp: 'EMP-109', category: 'Network Access', priority: 'low', status: 'closed', subject: 'Guest Wi-Fi issued', description: 'Guest visiting office needs Wi-Fi access.', resolution: 'Directed employee to front-desk kiosk to generate guest Wi-Fi credentials.', kb_refs: '["KB-07"]', reasoning: 'Per KB-07, guest Wi-Fi credentials can be generated by any employee.', created: '2026-09-17 11:00:00', updated: '2026-09-17 11:05:00', resolved: '2026-09-17 11:05:00' }
  ];

  // Helper to get user id by employee_id
  function getUserId(empId) {
    const stmt = db.prepare('SELECT id FROM users WHERE employee_id = ?');
    stmt.bind([empId]);
    if (stmt.step()) {
      const result = stmt.get()[0];
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  function getTicketDbId(ticketId) {
    const stmt = db.prepare('SELECT id FROM tickets WHERE ticket_id = ?');
    stmt.bind([ticketId]);
    if (stmt.step()) {
      const result = stmt.get()[0];
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  for (const t of historicalTickets) {
    const userId = getUserId(t.user_emp);

    db.run(
      'INSERT INTO tickets (ticket_id, request_id, user_id, category, priority, status, subject, description, resolution, assigned_to, kb_articles_referenced, agent_reasoning, created_at, updated_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [t.ticket_id, null, userId, t.category, t.priority, t.status, t.subject, t.description, t.resolution, 'AI Agent', t.kb_refs, t.reasoning, t.created, t.updated, t.resolved]
    );

    const ticketDbId = getTicketDbId(t.ticket_id);

    // Add initial message
    db.run(
      'INSERT INTO messages (ticket_id, sender_type, sender_id, content, kb_sources, action_taken, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [ticketDbId, 'employee', userId, t.description, '[]', null, t.created]
    );

    // Add agent response
    const agentContent = t.resolution || t.reasoning;
    db.run(
      'INSERT INTO messages (ticket_id, sender_type, sender_id, content, kb_sources, action_taken, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [ticketDbId, 'agent', null, agentContent, t.kb_refs, t.resolution ? 'resolved' : 'processing', t.updated]
    );

    // Add audit entry
    db.run(
      'INSERT INTO audit_log (ticket_id, action, details, performed_by, reasoning, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [ticketDbId, t.resolution ? 'ticket_resolved' : 'ticket_updated', agentContent, 'AI Agent', t.reasoning, t.updated]
    );
  }
  console.log(`   ✅ ${historicalTickets.length} historical tickets created`);

  // --- EMPLOYEE REQUESTS ---
  console.log('📝 Seeding employee requests...');

  const employeeRequests = [
    { request_id: 'REQ-01', user_emp: 'EMP-001', category: 'Hardware', priority: 'high', status: 'open', subject: 'Laptop not turning on', description: "My laptop won't turn on at all, it's completely dead. I've had it about 3.5 years now.", created: '2026-09-21 09:15:00' },
    { request_id: 'REQ-02', user_emp: 'EMP-002', category: 'Network Access', priority: 'low', status: 'open', subject: 'Guest Wi-Fi access for visitor', description: 'Can I get Wi-Fi access for a guest visiting our office tomorrow?', created: '2026-09-21 10:30:00' },
    { request_id: 'REQ-03', user_emp: 'EMP-003', category: 'Account Access', priority: 'high', status: 'in_progress', subject: 'Account locked out', description: "I'm locked out of my account, tried my password 6 times.", created: '2026-09-21 11:00:00' },
    { request_id: 'REQ-04', user_emp: 'EMP-004', category: 'Software', priority: 'medium', status: 'waiting_approval', subject: 'Non-catalog software installation', description: "Need approval to install a data-analysis tool that's not in the software catalog.", created: '2026-09-22 09:00:00' },
    { request_id: 'REQ-05', user_emp: 'EMP-005', category: 'Network Access', priority: 'medium', status: 'open', subject: 'VPN credentials expired', description: 'My VPN stopped working this morning, says credentials expired.', created: '2026-09-22 10:00:00' },
    { request_id: 'REQ-06', user_emp: 'EMP-006', category: 'Hardware', priority: 'medium', status: 'in_progress', subject: 'Printer issue - false paper jam', description: 'Printer on the 3rd floor keeps showing "paper jam" even though there\'s no jam.', created: '2026-09-22 11:30:00' },
    { request_id: 'REQ-07', user_emp: 'EMP-007', category: 'Hardware', priority: 'medium', status: 'open', subject: 'Work from home equipment request', description: "I've started working from home 4 days a week. How do I get a monitor?", created: '2026-09-23 09:00:00' },
    { request_id: 'REQ-08', user_emp: 'EMP-008', category: 'Security', priority: 'critical', status: 'escalated', subject: 'Phishing email - forwarded to teammates', description: 'I think I got a phishing email asking for my login — forwarding it to a few teammates to check.', created: '2026-09-23 10:00:00' },
    { request_id: 'REQ-09', user_emp: 'EMP-009', category: 'Email', priority: 'medium', status: 'open', subject: 'Mailbox full - cannot send emails', description: "My mailbox is full and I can't send emails.", created: '2026-09-23 11:00:00' },
    { request_id: 'REQ-10', user_emp: 'EMP-010', category: 'Account Access', priority: 'high', status: 'open', subject: 'Finance server admin access request', description: 'Can someone give me admin access to the finance reporting server? Need it urgently for month-end.', created: '2026-09-23 14:00:00' },
    { request_id: 'REQ-11', user_emp: 'EMP-011', category: 'Network Access', priority: 'medium', status: 'open', subject: 'VPN access for new contractor', description: "New contractor joining my team next week, they'll need VPN access.", created: '2026-09-24 09:30:00' },
    { request_id: 'REQ-12', user_emp: 'EMP-012', category: 'Software', priority: 'medium', status: 'waiting_response', subject: 'Cannot login to expense tool', description: "I can't log into the expense tool, keeps saying invalid credentials.", created: '2026-09-24 10:00:00' },
    { request_id: 'REQ-13', user_emp: 'EMP-013', category: 'Hardware', priority: 'medium', status: 'open', subject: 'Laptop screen flickering', description: 'Laptop screen is flickering on and off, had it 2 years, might just need a fix not a replacement.', created: '2026-09-24 13:00:00' },
    { request_id: 'REQ-14', user_emp: 'EMP-014', category: 'Software', priority: 'low', status: 'open', subject: 'Browser extension installation request', description: 'Requesting approval to install a browser extension for productivity tracking.', created: '2026-09-25 09:00:00' },
    { request_id: 'REQ-15', user_emp: 'EMP-015', category: 'Unknown', priority: 'low', status: 'open', subject: 'Vague request - needs clarification', description: 'hey can you help, its not working', created: '2026-09-25 10:30:00' }
  ];

  let nextTicketId = 1052;
  for (const r of employeeRequests) {
    const userId = getUserId(r.user_emp);
    const ticketId = `TK-${nextTicketId++}`;

    db.run(
      'INSERT INTO tickets (ticket_id, request_id, user_id, category, priority, status, subject, description, resolution, assigned_to, kb_articles_referenced, agent_reasoning, created_at, updated_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ticketId, r.request_id, userId, r.category, r.priority, r.status, r.subject, r.description, null, 'AI Agent', '[]', null, r.created, r.created, null]
    );

    const ticketDbId = getTicketDbId(ticketId);

    db.run(
      'INSERT INTO messages (ticket_id, sender_type, sender_id, content, kb_sources, action_taken, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [ticketDbId, 'employee', userId, r.description, '[]', null, r.created]
    );

    db.run(
      'INSERT INTO audit_log (ticket_id, action, details, performed_by, reasoning, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [ticketDbId, 'ticket_created', `Request ${r.request_id}: ${r.subject}`, 'System', 'Employee submitted new request', r.created]
    );
  }
  console.log(`   ✅ ${employeeRequests.length} employee requests created`);

  // Save to file
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  db.close();

  console.log('\n🎉 Database initialization complete!');
  console.log(`   Database file: ${DB_PATH}`);
  console.log(`   Total users: ${users.length}`);
  console.log(`   KB articles: ${kbArticles.length}`);
  console.log(`   Historical tickets: ${historicalTickets.length}`);
  console.log(`   Employee requests: ${employeeRequests.length}`);
  console.log('\n📋 Test credentials:');
  console.log('   Admin:    admin@veridian-corp.example / Admin@2026');
  console.log('   Employee: aditi.sharma@veridian-corp.example / Employee@2026');
}

seedDatabase().catch(err => {
  console.error('❌ Database initialization failed:', err);
  process.exit(1);
});
