/**
 * Veridian IT Service Agent — Enhanced AI Engine
 * 
 * Multi-layer NLP pipeline:
 * 1. User Context & Profile Retrieval (Name, Department, Employment Type)
 * 2. Intent Classification via Multi-Pattern Matching + DB Knowledge Base Full-Text Search
 * 3. Context & Entity Extraction (Age, Asset Tags, WFH Days, Urgency, Follow-up answers)
 * 4. Dynamic & Contextual Response Generation ( personalized, non-repetitive, KB-cited )
 * 5. Ticket & Lifecycle State Management
 */

class AgentEngine {
  constructor(db) {
    this.db = db;
    this.categories = this._buildCategoryPatterns();
    this.kbIndex = [];
    this.precedentIndex = {};
    this.trainModel();
  }

  /**
   * Train / Re-index Agent Model on KB articles and historical resolved tickets
   */
  trainModel() {
    try {
      // 1. Fetch & Index Knowledge Base Articles
      const articles = this.db.prepare('SELECT * FROM knowledge_base').all();
      this.kbIndex = articles.map(a => ({
        kb_id: a.kb_id,
        title: a.title,
        category: a.category,
        content: a.content,
        keywords: JSON.parse(a.keywords || '[]'),
        tokens: (a.title + ' ' + a.content + ' ' + (a.keywords || '')).toLowerCase().split(/\W+/).filter(t => t.length > 2)
      }));

      // 2. Fetch & Train on Historical Resolved Tickets & Precedents
      const tickets = this.db.prepare('SELECT category, subject, description, resolution, agent_reasoning FROM tickets WHERE status IN ("closed", "resolved")').all();
      this.precedentIndex = {};

      const vocabulary = new Set();

      for (const t of tickets) {
        const cat = t.category || 'General';
        if (!this.precedentIndex[cat]) this.precedentIndex[cat] = { count: 0, keywords: new Set() };
        this.precedentIndex[cat].count++;

        const words = (t.subject + ' ' + t.description + ' ' + (t.resolution || '')).toLowerCase().split(/\W+/).filter(w => w.length > 3);
        words.forEach(w => {
          vocabulary.add(w);
          this.precedentIndex[cat].keywords.add(w);
        });
      }

      for (const a of this.kbIndex) {
        a.tokens.forEach(t => vocabulary.add(t));
      }

      this.lastTrainedAt = new Date().toISOString();
      this.trainingMetrics = {
        status: 'trained',
        indexedArticles: this.kbIndex.length,
        historicalTicketsTrained: tickets.length,
        vocabularySize: vocabulary.size,
        categoriesTrained: Object.keys(this.precedentIndex),
        lastTrainedAt: this.lastTrainedAt
      };

      console.log(`🤖 AI Agent Model Trained — ${this.kbIndex.length} KB articles, ${tickets.length} historical precedents, ${vocabulary.size} vocabulary tokens.`);
      return this.trainingMetrics;
    } catch (err) {
      console.error('Error training AI Agent Model:', err);
      return { status: 'error', error: err.message };
    }
  }

  /**
   * Build comprehensive category patterns for intent classification
   */
  _buildCategoryPatterns() {
    return [
      {
        category: 'Security',
        patterns: [/phish/i, /malware/i, /virus/i, /hack/i, /suspicious\s*email/i, /unauthorized/i, /breach/i, /scam/i, /security\s*incident/i, /compromised/i, /spam/i],
        priority: 'critical',
        kb_id: 'KB-09'
      },
      {
        category: 'Account Access',
        subCategories: [
          {
            name: 'Admin Access',
            patterns: [/admin\s*access/i, /finance\s*server/i, /reporting\s*server/i, /elevated\s*privilege/i, /sudo/i, /root\s*access/i, /system\s*admin/i],
            kb_id: 'KB-08'
          },
          {
            name: 'Password & Lockout',
            patterns: [/password/i, /locked\s*out/i, /lock(?:ed)?\s*(?:out|account)/i, /can'?t\s*(?:log|sign)\s*in/i, /login\s*(?:issue|problem|fail|error)/i, /forgot\s*password/i, /reset\s*password/i, /account\s*lock/i, /tried.*password.*times/i, /unlock/i, /credentials/i],
            kb_id: 'KB-01'
          }
        ],
        priority: 'high'
      },
      {
        category: 'Network Access',
        subCategories: [
          {
            name: 'VPN',
            patterns: [/vpn/i, /vpn\s*(?:access|credential|expire)/i, /remote\s*access/i, /credential.*expire/i, /virtual\s*private\s*network/i, /cisco/i, /globalprotect/i],
            kb_id: 'KB-02'
          },
          {
            name: 'Guest Wi-Fi',
            patterns: [/wi-?fi/i, /wifi/i, /guest.*(?:access|internet|wifi|wi-?fi)/i, /visitor.*(?:access|internet|wifi|wi-?fi)/i, /wireless.*guest/i, /office\s*wifi/i],
            kb_id: 'KB-07'
          }
        ],
        priority: 'medium'
      },
      {
        category: 'Hardware',
        subCategories: [
          {
            name: 'Laptop',
            patterns: [/laptop/i, /computer/i, /macbook/i, /thinkpad/i, /dell/i, /screen\s*flicker/i, /(?:not|won'?t|dead|broken)\s*(?:turn|start|power|boot)/i, /hardware\s*fail/i, /dead\s*(?:laptop|computer)/i, /slow\s*laptop/i, /battery/i, /keyboard/i],
            kb_id: 'KB-03'
          },
          {
            name: 'Printer',
            patterns: [/printer/i, /print/i, /paper\s*jam/i, /toner/i, /scanner/i, /spooler/i, /printing/i, /print\s*queue/i],
            kb_id: 'KB-05'
          },
          {
            name: 'WFH Equipment',
            patterns: [/work\s*(?:from|at)\s*home/i, /wfh/i, /home\s*(?:office|equipment)/i, /remote.*(?:monitor|chair|desk|equipment)/i, /(?:monitor|chair).*(?:home|remote)/i, /docking\s*station/i, /second\s*monitor/i],
            kb_id: 'KB-10'
          }
        ],
        priority: 'medium'
      },
      {
        category: 'Software',
        subCategories: [
          {
            name: 'Expense Tool',
            patterns: [/expense/i, /expense\s*(?:tool|management|software)/i, /reimbursement/i, /concur/i, /expensify/i],
            kb_id: 'KB-08'
          },
          {
            name: 'Installation',
            patterns: [/install/i, /software/i, /application/i, /program/i, /extension/i, /browser\s*extension/i, /(?:non|not).*catalog/i, /app\s*(?:install|request)/i, /license/i, /download/i, /zoom/i, /slack/i, /figma/i, /vscode/i],
            kb_id: 'KB-04'
          }
        ],
        priority: 'medium'
      },
      {
        category: 'Email',
        patterns: [/email/i, /mailbox/i, /inbox/i, /quota/i, /(?:can'?t|cannot)\s*send/i, /mail.*full/i, /mailbox.*full/i, /storage.*email/i, /outlook/i, /exchange/i, /attachment/i],
        priority: 'medium',
        kb_id: 'KB-06'
      }
    ];
  }

  /**
   * Process incoming user message
   */
  processMessage(message, userId, existingTicketId = null) {
    const text = message.trim();
    
    // Fetch user details for personalized responses
    let user = null;
    if (userId) {
      user = this.db.prepare('SELECT id, name, email, department, employment_type FROM users WHERE id = ?').get(userId);
    }
    
    // 1. Classify intent
    const classification = this._classifyIntent(text);
    
    // 2. Fallback to KB Full-Text Search if intent classification confidence is low
    if (classification.category === 'Unknown' || classification.confidence === 0) {
      const kbMatch = this._fullTextKBSearch(text);
      if (kbMatch) {
        classification.category = kbMatch.category;
        classification.subCategory = kbMatch.title;
        classification.kb_id = kbMatch.kb_id;
        classification.confidence = 0.7;
      }
    }
    
    // 3. Get relevant KB articles
    const kbArticles = this._getRelevantKB(classification, text);
    
    // 4. Analyze context (entities, sentiment, follow-ups, user metadata)
    const context = this._analyzeContext(text, classification, user);
    
    // 5. Generate dynamic response
    const response = this._generateResponse(classification, kbArticles, context, text, user);
    
    // 6. Build ticket data
    const ticketData = this._buildTicketData(classification, kbArticles, context, text, response, existingTicketId);
    
    return {
      response: response,
      classification: classification,
      kbArticles: kbArticles,
      ticketData: ticketData,
      context: context
    };
  }

  /**
   * Perform Full-Text Keyword Search in Knowledge Base
   */
  _fullTextKBSearch(text) {
    const articles = this.db.prepare('SELECT * FROM knowledge_base').all();
    const textLower = text.toLowerCase();
    
    let bestArticle = null;
    let maxMatches = 0;

    for (const art of articles) {
      let score = 0;
      const keywords = JSON.parse(art.keywords || '[]');
      for (const kw of keywords) {
        if (textLower.includes(kw.toLowerCase())) {
          score += 2;
        }
      }
      // Match in title or content
      if (textLower.includes(art.title.toLowerCase())) score += 3;
      if (textLower.includes(art.category.toLowerCase())) score += 1;

      if (score > maxMatches && score >= 2) {
        maxMatches = score;
        bestArticle = art;
      }
    }

    return bestArticle;
  }

  /**
   * Classify intent with nested subcategory matching
   */
  _classifyIntent(text) {
    let bestMatch = null;
    let bestScore = 0;
    let bestSubCategory = null;
    let bestKbId = null;

    for (const cat of this.categories) {
      if (cat.subCategories) {
        for (const sub of cat.subCategories) {
          let score = 0;
          for (const pattern of sub.patterns) {
            if (pattern.test(text)) score++;
          }
          if (score > bestScore) {
            bestScore = score;
            bestMatch = cat;
            bestSubCategory = sub.name;
            bestKbId = sub.kb_id;
          }
        }
      } else {
        let score = 0;
        for (const pattern of cat.patterns) {
          if (pattern.test(text)) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestMatch = cat;
          bestSubCategory = null;
          bestKbId = cat.kb_id;
        }
      }
    }

    if (!bestMatch || bestScore === 0) {
      return {
        category: 'Unknown',
        subCategory: null,
        confidence: 0,
        priority: 'low',
        kb_id: null
      };
    }

    return {
      category: bestMatch.category,
      subCategory: bestSubCategory,
      confidence: Math.min(bestScore / 3, 1),
      priority: bestMatch.priority,
      kb_id: bestKbId
    };
  }

  /**
   * Get primary and secondary relevant KB articles
   */
  _getRelevantKB(classification, text) {
    const articles = [];
    if (classification.kb_id) {
      const article = this.db.prepare('SELECT * FROM knowledge_base WHERE kb_id = ?').get(classification.kb_id);
      if (article) articles.push(article);
    }

    const textLower = text.toLowerCase();
    const allArticles = this.db.prepare('SELECT * FROM knowledge_base').all();
    
    for (const a of allArticles) {
      if (articles.some(item => item.kb_id === a.kb_id)) continue;
      
      const keywords = JSON.parse(a.keywords || '[]');
      let matchCount = 0;
      for (const kw of keywords) {
        if (textLower.includes(kw.toLowerCase())) matchCount++;
      }
      
      if (matchCount >= 2 && articles.length < 3) {
        articles.push(a);
      }
    }

    return articles;
  }

  /**
   * Extract contextual entities & user flags
   */
  _analyzeContext(text, classification, user) {
    const context = {
      mentionsAge: false,
      age: null,
      mentionsContractor: false,
      mentionsManager: false,
      isVague: false,
      mentionsForwarding: false,
      mentionsUrgent: false,
      employmentType: user ? user.employment_type : 'full-time',
      userName: user ? user.name.split(' ')[0] : 'there',
      userDepartment: user ? user.department : 'General',
      wfhDays: null,
      assetTag: null
    };

    // Age / Duration parsing
    const ageMatch = text.match(/(\d+\.?\d*)\s*(?:year|yr)/i);
    if (ageMatch) {
      context.mentionsAge = true;
      context.age = parseFloat(ageMatch[1]);
    }

    // Asset Tag parsing
    const assetMatch = text.match(/AST-\d+|TAG-\d+|\b[A-Z]{2,3}-\d{4,6}\b/i);
    if (assetMatch) {
      context.assetTag = assetMatch[0].toUpperCase();
    }

    // Role / Personnel parsing
    if (/contractor|vendor|freelancer/i.test(text)) context.mentionsContractor = true;
    if (/manager|lead|supervisor|head/i.test(text)) context.mentionsManager = true;
    if (/forward/i.test(text) && /teammate|colleague|team|everyone/i.test(text)) context.mentionsForwarding = true;
    if (/urgent|asap|emergency|immediately|blocking/i.test(text)) context.mentionsUrgent = true;

    // WFH Days parsing
    const wfhMatch = text.match(/(\d+)\s*day/i);
    if (wfhMatch && (classification.subCategory === 'WFH Equipment' || /home|wfh|remote/i.test(text))) {
      context.wfhDays = parseInt(wfhMatch[1]);
    }

    // Vague check
    if (text.split(/\s+/).length < 6 && !classification.kb_id) {
      context.isVague = true;
    }

    return context;
  }

  /**
   * Generate customized, non-generic responses
   */
  _generateResponse(classification, kbArticles, context, originalText, user) {
    const { category, subCategory } = classification;
    const kbRef = kbArticles.length > 0 ? kbArticles[0] : null;
    const name = context.userName;

    // --- 1. General Info & Specific IT Questions ---
    if (/support\s*hour|working\s*hour|timing|open/i.test(originalText)) {
      return {
        message: `Hello ${name}! 👋\n\nOur **Veridian IT Helpdesk** operates **24/7** for automated self-service and critical incident response.\n\n• **Standard IT Support Hours:** Monday – Friday, 8:00 AM – 6:00 PM EST\n• **Critical Security/Outage Escalations:** 24/7 On-Call Team\n• **Location:** Building B, Floor 2, IT Service Center\n\nHow can I assist you with your equipment or account today?`,
        action: 'info_provided',
        status: 'closed',
        priority: 'low',
        escalate: false,
        autoResolved: true,
        followUpQuestions: []
      };
    }

    if (/mac|apple|macbook|windows|pc/i.test(originalText) && /choose|option|switch|policy/i.test(originalText)) {
      return {
        message: `Hi ${name},\n\n**Standard Hardware Policy:**\n• **Engineering & Design:** Standard issue is Apple MacBook Pro (16" M-series).\n• **Marketing, Sales, Finance & HR:** Standard issue is Lenovo ThinkPad T14.\n\nSwitching device platforms outside standard department allocation requires **Department Head approval** and **IT Security validation**.\n\nWould you like me to submit a platform change request for your manager's review?`,
        action: 'policy_info_provided',
        status: 'waiting_response',
        priority: 'low',
        escalate: false,
        autoResolved: false,
        followUpQuestions: ['Do you have approval from your Department Head?']
      };
    }

    // --- 2. Unknown / Vague request ---
    if (category === 'Unknown' || context.isVague) {
      return {
        message: `Hello ${name},\n\nI want to make sure I resolve your request quickly, but I need a few more details to understand your issue.\n\nCould you specify:\n• **Which system or device is having an issue?** (e.g., Laptop, VPN, Outlook, Printer, Software)\n• **What specific error message or symptom are you seeing?**\n• **When did this problem start occurring?**\n\nOnce you share these details, I'll match your request to our IT policy and get this fixed!`,
        action: 'follow_up_required',
        status: 'waiting_response',
        priority: 'low',
        escalate: false,
        autoResolved: false,
        followUpQuestions: [
          'What system or device are you having trouble with?',
          'What is the exact error message or symptom?',
          'When did this issue start?'
        ]
      };
    }

    // --- 3. Security Incident ---
    if (category === 'Security') {
      let warningMessage = '';
      if (context.mentionsForwarding) {
        warningMessage = `\n\n⚠️ **SECURITY WARNING**: I noticed you mentioned forwarding the email to colleagues. Per **${kbRef ? kbRef.kb_id : 'KB-09'}**, please tell your teammates **NOT** to open or interact with the forwarded message to prevent potential network compromise.`;
      }

      return {
        message: `🚨 **Security Incident Report — Priority Escalation**\n\nThank you ${name} for reporting this suspicious activity. Your report has been **escalated immediately to the Security Incident Response Team**.\n\n**Required Actions:**\n1. Do **NOT** click links or open attachments in the message.\n2. Do **NOT** forward the email internally.${warningMessage}\n3. Send the email header directly to **security@veridian-corp.example**.\n4. If you entered your password, reset it immediately on the self-service portal.\n\n📋 **Policy Reference:** ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-09 Security Incident Reporting'}\n\nA security analyst will contact you directly within 15 minutes.`,
        action: 'escalated_to_security',
        status: 'escalated',
        priority: 'critical',
        escalate: true,
        autoResolved: false,
        followUpQuestions: []
      };
    }

    // --- 4. Account & Password Access ---
    if (category === 'Account Access') {
      if (subCategory === 'Admin Access') {
        const expenseKB = this.db.prepare('SELECT * FROM knowledge_base WHERE kb_id = ?').get('KB-08');
        return {
          message: `Hi ${name},\n\nI understand you are requesting elevated/admin privileges on internal servers.\n\n**Policy & Guidelines:**\n1. **Financial & Administrative Systems** are managed directly by **Finance / System Owners**, not IT support. Per **KB-08**, IT only manages login credentials once accounts are approved.\n2. Admin privileges require a formal **Business Justification** and **Vice-President / Manager approval**.\n\n**Next Steps:**\n• Contact your department lead to initiate an Access Request Form.\n• Ensure you attach business justification detailing why read-only access is insufficient.\n\n📋 **Reference:** ${expenseKB ? `KB-08 — ${expenseKB.title}` : 'KB-08 Admin Access Control'}`,
          action: 'redirected_to_finance',
          status: 'open',
          priority: 'high',
          escalate: false,
          autoResolved: false,
          followUpQuestions: ['Do you have an approved Access Request Form from your manager?']
        };
      }

      return {
        message: `Hello ${name},\n\nI've analyzed your account access issue.\n\n**Policy Guidelines (per ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-01 Password Reset'}):**\n> *"Employees can reset their own password via the self-service portal at any time. If locked out after 5 failed attempts, contact IT to unlock the account manually. No approval required."*\n\n**Resolution Path:**\n1. ✅ Since you were locked out after failed login attempts, an **account unlock request** has been initiated for your profile.\n2. No manager approval is required for this action.\n3. You can reset your password at any time via the **Self-Service Portal** once unlocked (takes ~10–15 mins).\n\n📋 **Reference:** ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-01 Password Reset'}`,
        action: 'account_unlock_initiated',
        status: 'in_progress',
        priority: 'high',
        escalate: false,
        autoResolved: true,
        followUpQuestions: []
      };
    }

    // --- 5. Network & VPN Access ---
    if (category === 'Network Access') {
      if (subCategory === 'VPN') {
        if (context.mentionsContractor) {
          return {
            message: `Hi ${name},\n\nRegarding VPN access setup for contractors:\n\n**Policy Requirements (${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-02 VPN Access'}):**\n• Full-time employees receive automatic VPN access. However, **contractors require Manager Approval** prior to credential generation.\n• VPN credentials for contractors expire every **90 days**.\n\n**Next Steps:**\n1. Have the contracting manager submit the **Contractor Access Form**.\n2. Include contractor full name, end date, and project scope.\n3. Once approved, credentials will be sent securely.\n\n📋 **Reference:** ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-02 VPN Access'}`,
            action: 'awaiting_manager_approval',
            status: 'waiting_approval',
            priority: 'medium',
            escalate: false,
            autoResolved: false,
            followUpQuestions: ['What is the contractor\'s expected project end date?']
          };
        }

        return {
          message: `Hello ${name},\n\nRegarding your VPN connection:\n\n**Guidelines (per ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-02 VPN Access'}):**\n• All standard full-time employee VPN credentials expire every **90 days** for security compliance.\n\n**Self-Service Renewal:**\n1. Connect to the internal network or open the **VPN Self-Service Portal**.\n2. Click "Renew Credentials" and authenticate with MFA.\n3. Your connection will re-establish immediately.\n\n📋 **Reference:** ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-02 VPN Access'}`,
          action: 'vpn_renewal_guided',
          status: 'in_progress',
          priority: 'medium',
          escalate: false,
          autoResolved: true,
          followUpQuestions: []
        };
      }

      if (subCategory === 'Guest Wi-Fi') {
        return {
          message: `Hi ${name}!\n\nYou can issue Guest Wi-Fi passes directly — **no IT ticket or approval required**!\n\n**How to generate credentials (${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-07 Guest Wi-Fi'}):**\n1. Go to any lobby kiosk or open wifi.veridian-corp.example.\n2. Enter your employee email to issue a **24-Hour Guest Wi-Fi Pass**.\n3. Passwords activate instantly.\n\n📋 **Reference:** ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-07 Guest Wi-Fi'}`,
          action: 'auto_resolved',
          status: 'resolved',
          priority: 'low',
          escalate: false,
          autoResolved: true,
          followUpQuestions: []
        };
      }
    }

    // --- 6. Hardware Requests ---
    if (category === 'Hardware') {
      if (subCategory === 'Laptop') {
        const age = context.age;

        if (age && age >= 3) {
          return {
            message: `Hello ${name},\n\nThank you for providing your laptop age details.\n\n**Assessment (per ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-03 Laptop Replacement'}):**\n• Your device age (**${age} years**) meets the **3-year refresh threshold** for hardware replacement! ✅\n• No additional Finance sign-off is required since it falls within the standard 4-year lifecycle.\n\n**Next Steps:**\n1. Replacement order has been submitted to Asset Management.\n2. Lead time is **2 business weeks**.\n3. You will receive an email to schedule data transfer and pickup.\n\n📋 **Reference:** ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-03 Laptop Refresh'}`,
            action: 'replacement_initiated',
            status: 'in_progress',
            priority: 'high',
            escalate: false,
            autoResolved: false,
            followUpQuestions: []
          };
        }

        if (age && age < 3) {
          return {
            message: `Hi ${name},\n\n**Assessment (per ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-03 Laptop Replacement'}):**\n• Your device age (**${age} years**) is under the 3-year replacement threshold.\n• Therefore, this ticket has been routed to **Hardware Repair** rather than full replacement.\n\n**Next Steps:**\n1. A technician will inspect the hardware defect (screen/keyboard/power).\n2. If unrepairable, an early replacement can be escalated with **Finance Sign-off**.\n\n📋 **Reference:** ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-03 Hardware Policy'}`,
            action: 'repair_ticket_created',
            status: 'in_progress',
            priority: 'medium',
            escalate: false,
            autoResolved: false,
            followUpQuestions: ['Does the issue happen when plugged into a charger or external display?']
          };
        }

        return {
          message: `Hello ${name},\n\nI can assist with your laptop issue.\n\nTo determine if your device qualifies for **Replacement** or **Repair**, please let me know:\n1. **How old is the laptop?** (Devices 3+ years old qualify for replacement under KB-03).\n2. **What is the Asset Tag number?** (Sticker on bottom casing).\n\n📋 **Reference:** ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-03 Laptop Policy'}`,
          action: 'follow_up_required',
          status: 'waiting_response',
          priority: 'medium',
          escalate: false,
          autoResolved: false,
          followUpQuestions: ['How old is your laptop?', 'What is your laptop asset tag?']
        };
      }

      if (subCategory === 'Printer') {
        return {
          message: `Hi ${name},\n\nLet's resolve your printer error (${context.assetTag || 'Floor Printer'}).\n\n**Troubleshooting Steps (${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-05 Printer'}):**\n1. Clear print queue on your computer.\n2. Open Services.msc -> Restart **Print Spooler** service.\n3. Check tray paper alignment and toner door.\n\nIf the error persists, please share the **Printer Asset Tag** so an IT technician can be dispatched to your floor.\n\n📋 **Reference:** ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-05 Printer Troubleshooting'}`,
          action: 'troubleshooting_steps_provided',
          status: 'in_progress',
          priority: 'medium',
          escalate: false,
          autoResolved: false,
          followUpQuestions: ['What is the Printer Asset Tag?', 'What floor is the printer located on?']
        };
      }

      if (subCategory === 'WFH Equipment') {
        const days = context.wfhDays;
        if (days && days >= 3) {
          return {
            message: `Hello ${name},\n\n**WFH Allowance Verification (${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-10 WFH Policy'}):**\n• Working **${days} days/week** remotely qualifies you for the one-time Home Office Equipment Package (Chair & External Monitor) ✅\n\n**Process:**\n1. Manager approval will be requested.\n2. Finance processes allowance voucher.\n3. IT dispatches equipment to your primary home address.\n\n📋 **Reference:** ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-10 WFH Equipment'}`,
            action: 'wfh_request_initiated',
            status: 'waiting_approval',
            priority: 'medium',
            escalate: false,
            autoResolved: false,
            followUpQuestions: []
          };
        }

        return {
          message: `Hi ${name},\n\nPer **KB-10 Work-From-Home Policy**:\n• Employees working remotely **3+ days per week** are eligible for an external monitor and ergonomic chair allowance.\n\nHow many days per week do you work from home?\n\n📋 **Reference:** ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-10 WFH Equipment'}`,
          action: 'follow_up_required',
          status: 'waiting_response',
          priority: 'medium',
          escalate: false,
          autoResolved: false,
          followUpQuestions: ['How many days per week do you work remotely?']
        };
      }
    }

    // --- 7. Software Installation & Tools ---
    if (category === 'Software') {
      if (subCategory === 'Expense Tool') {
        return {
          message: `Hi ${name},\n\n**Expense Tool Access (${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-08 Expense Management'}):**\n• Account creation & permissions are managed by **Finance**, not IT.\n• IT handles technical login errors once accounts are provisioned.\n\nDo you already have an expense account, or are you requesting new access?\n\n📋 **Reference:** ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-08 Expense Management'}`,
          action: 'follow_up_required',
          status: 'waiting_response',
          priority: 'medium',
          escalate: false,
          autoResolved: false,
          followUpQuestions: ['Do you already have an active Expense Tool account?']
        };
      }

      return {
        message: `Hello ${name},\n\nRegarding your software installation request:\n\n**Catalog Review (${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-04 Software Catalog'}):**\n• **Approved Catalog Apps:** Available for immediate download via Self-Service Portal.\n• **Non-Catalog / Custom Tools:** Requires **IT Security & Vulnerability Review** (3–5 business days).\n\nYour software request has been logged and submitted for Security Review.\n\n📋 **Reference:** ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-04 Software Policy'}`,
        action: 'security_review_submitted',
        status: 'waiting_approval',
        priority: 'medium',
        escalate: false,
        autoResolved: false,
        followUpQuestions: []
      };
    }

    // --- 8. Email & Storage ---
    if (category === 'Email') {
      return {
        message: `Hi ${name},\n\nRegarding your email mailbox storage:\n\n**Mailbox Policy (${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-06 Mailbox Quota'}):**\n• Standard mailbox quota is **25GB**.\n• Quotas up to 50GB require **Manager Approval**.\n\n**Recommended Action:**\n1. Empty Deleted Items & Junk folders.\n2. Archive emails older than 1 year.\n3. If still full, we can submit a quota increase request for your manager's approval.\n\n📋 **Reference:** ${kbRef ? `${kbRef.kb_id} — ${kbRef.title}` : 'KB-06 Mailbox Quota'}`,
        action: 'troubleshooting_provided',
        status: 'in_progress',
        priority: 'medium',
        escalate: false,
        autoResolved: false,
        followUpQuestions: ['Would you like me to open a Quota Increase Request for your manager?']
      };
    }

    // --- 9. Dynamic Fallback ---
    return {
      message: `Hello ${name},\n\nThank you for contacting IT Support. I've logged your request in our system.\n\nTo ensure we route this to the right specialist, please provide:\n• Device or application name\n• Specific error message or behavior\n• Any troubleshooting steps already taken\n\nWe will update your ticket as soon as additional details are provided!`,
      action: 'follow_up_required',
      status: 'open',
      priority: 'medium',
      escalate: false,
      autoResolved: false,
      followUpQuestions: ['What application or device is affected?']
    };
  }

  /**
   * Build structured ticket payload
   */
  _buildTicketData(classification, kbArticles, context, originalText, response, existingTicketId) {
    const subject = this._generateSubject(classification, originalText);
    
    return {
      category: classification.category,
      priority: response.priority,
      status: response.status,
      subject: subject,
      description: originalText,
      kb_articles_referenced: JSON.stringify(kbArticles.map(a => a.kb_id)),
      agent_reasoning: `Category: ${classification.category}${classification.subCategory ? ` (${classification.subCategory})` : ''}. Confidence: ${(classification.confidence * 100).toFixed(0)}%. Action: ${response.action}. ${kbArticles.length > 0 ? `Referenced: ${kbArticles.map(a => a.kb_id).join(', ')}` : 'No KB match.'}`,
      assigned_to: response.escalate ? 'Security Team' : 'AI Agent',
      action_taken: response.action,
      existingTicketId: existingTicketId
    };
  }

  /**
   * Generate clear, unique subject titles
   */
  _generateSubject(classification, text) {
    const { category, subCategory } = classification;
    
    if (category === 'Unknown') {
      return text.substring(0, 45) + (text.length > 45 ? '...' : '');
    }

    if (subCategory) {
      return `${category}: ${subCategory} Request`;
    }

    return `${category} Issue / Request`;
  }

  /**
   * Process Follow-Up messages with context-aware state machine
   * Detects the last question asked, parses the user's answer intelligently,
   * and generates targeted follow-up responses without repeating itself.
   */
  processFollowUp(message, ticketId, userId) {
    const ticket = this.db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) return null;

    const messages = this.db.prepare('SELECT * FROM messages WHERE ticket_id = ? ORDER BY created_at').all(ticketId);
    const text = message.trim();
    const textLower = text.toLowerCase();

    // Fetch user for personalization
    let user = null;
    if (userId) {
      user = this.db.prepare('SELECT id, name, email, department, employment_type FROM users WHERE id = ?').get(userId);
    }
    const name = user ? user.name.split(' ')[0] : 'there';

    // --- 1. Detect what the agent last asked ---
    const agentMessages = messages.filter(m => m.sender_type === 'agent');
    const lastAgentMsg = agentMessages.length > 0 ? agentMessages[agentMessages.length - 1].content : '';
    const lastAction = agentMessages.length > 0 ? agentMessages[agentMessages.length - 1].action_taken : '';
    const previousEmployeeMessages = messages.filter(m => m.sender_type === 'employee');

    // Detect the follow-up context from the last agent message
    const followUpContext = this._detectFollowUpContext(lastAgentMsg, lastAction, ticket);

    // --- 2. Parse the user's answer based on context ---
    const parsedAnswer = this._parseFollowUpAnswer(text, followUpContext, ticket);

    // --- 3. Generate context-aware follow-up response ---
    const followUpResponse = this._generateFollowUpResponse(parsedAnswer, followUpContext, ticket, name, text, user);

    // If the follow-up handler generated a specific response, use it
    if (followUpResponse) {
      const kbArticles = followUpResponse.kbArticles || [];
      return {
        response: followUpResponse,
        classification: {
          category: followUpResponse.updatedCategory || ticket.category,
          subCategory: followUpResponse.updatedSubCategory || null,
          confidence: followUpResponse.confidence || 0.85,
          priority: followUpResponse.priority,
          kb_id: kbArticles.length > 0 ? kbArticles[0].kb_id : null
        },
        kbArticles: kbArticles,
        ticketData: {
          category: followUpResponse.updatedCategory || ticket.category,
          priority: followUpResponse.priority,
          status: followUpResponse.status,
          subject: ticket.subject,
          description: text,
          kb_articles_referenced: JSON.stringify(kbArticles.map(a => a.kb_id)),
          agent_reasoning: followUpResponse.reasoning || `Follow-up processed: ${followUpResponse.action}`,
          assigned_to: followUpResponse.escalate ? 'Security Team' : ticket.assigned_to || 'AI Agent',
          action_taken: followUpResponse.action,
          existingTicketId: ticketId
        },
        context: { userName: name }
      };
    }

    // --- 4. Fallback: Re-classify with full conversation context ---
    const contextText = previousEmployeeMessages.slice(-2).map(m => m.content).join(' ') + ' ' + text;
    const result = this.processMessage(contextText, userId, ticketId);

    // Prevent repeating the exact same response
    if (result.response.message === lastAgentMsg) {
      result.response.message = `Thank you for that additional information, ${name}. I've updated your ticket with these details.\n\nIs there anything else I can help you with regarding this issue?`;
      result.response.action = 'additional_info_recorded';
    }

    return result;
  }

  /**
   * Detect what type of follow-up question was asked by analyzing the last agent message
   */
  _detectFollowUpContext(lastAgentMsg, lastAction, ticket) {
    const msgLower = lastAgentMsg.toLowerCase();
    const context = {
      type: 'general',
      expectedAnswer: null,
      originalCategory: ticket.category,
      originalAction: lastAction
    };

    // Laptop age question
    if (/how old.*laptop/i.test(msgLower) || /laptop.*age/i.test(msgLower) || /device age/i.test(msgLower) || /3-year.*threshold/i.test(msgLower) || (/asset tag/i.test(msgLower) && /laptop/i.test(msgLower))) {
      context.type = 'laptop_age';
      context.expectedAnswer = 'number_or_age';
    }
    // Laptop asset tag
    else if (/asset tag/i.test(msgLower) && (ticket.category === 'Hardware' || /laptop|computer/i.test(msgLower))) {
      context.type = 'asset_tag';
      context.expectedAnswer = 'tag_identifier';
    }
    // WFH days question
    else if (/how many days/i.test(msgLower) || /days.*week.*remote/i.test(msgLower) || /days.*work.*home/i.test(msgLower)) {
      context.type = 'wfh_days';
      context.expectedAnswer = 'number';
    }
    // Printer location / asset
    else if (/printer.*asset/i.test(msgLower) || /floor.*printer/i.test(msgLower) || /which floor/i.test(msgLower) || /printer.*location/i.test(msgLower)) {
      context.type = 'printer_info';
      context.expectedAnswer = 'location_or_tag';
    }
    // Manager approval question
    else if (/approval.*manager/i.test(msgLower) || /manager.*approval/i.test(msgLower) || /department head/i.test(msgLower) || /do you have.*approval/i.test(msgLower) || /approved.*access.*form/i.test(msgLower)) {
      context.type = 'approval_check';
      context.expectedAnswer = 'yes_no';
    }
    // Expense account question
    else if (/expense.*account/i.test(msgLower) || /already have.*account/i.test(msgLower)) {
      context.type = 'expense_account';
      context.expectedAnswer = 'yes_no';
    }
    // Quota increase question
    else if (/quota.*increase/i.test(msgLower) || /would you like.*request/i.test(msgLower)) {
      context.type = 'quota_request';
      context.expectedAnswer = 'yes_no';
    }
    // Contractor end date
    else if (/end date/i.test(msgLower) || /project.*end/i.test(msgLower) || /contractor.*date/i.test(msgLower)) {
      context.type = 'contractor_date';
      context.expectedAnswer = 'date';
    }
    // Charger / display question (laptop sub-follow-up)
    else if (/charger|external display|plugged in/i.test(msgLower)) {
      context.type = 'laptop_diagnostic';
      context.expectedAnswer = 'yes_no_detail';
    }
    // Vague → specificity (general clarification)
    else if (/which system|what device|what.*error|what.*symptom|when did/i.test(msgLower) || lastAction === 'follow_up_required') {
      context.type = 'clarification';
      context.expectedAnswer = 'descriptive';
    }
    // Platform change confirmation
    else if (/submit.*platform.*change/i.test(msgLower) || /submit.*request.*manager/i.test(msgLower)) {
      context.type = 'confirm_action';
      context.expectedAnswer = 'yes_no';
    }

    return context;
  }

  /**
   * Parse the user's follow-up answer based on what was expected
   */
  _parseFollowUpAnswer(text, followUpContext, ticket) {
    const textLower = text.toLowerCase();
    const parsed = {
      isYes: /^(yes|yeah|yep|sure|ok|okay|correct|affirmative|please|go ahead|do it|submit|proceed)/i.test(textLower.trim()),
      isNo: /^(no|nope|nah|not yet|don't|haven't|i don't|negative|cancel)/i.test(textLower.trim()),
      number: null,
      age: null,
      assetTag: null,
      floor: null,
      date: null,
      newIssueDetected: false,
      rawText: text
    };

    // Extract numbers
    const numMatch = text.match(/(\d+\.?\d*)\s*(?:year|yr|yrs)?/i);
    if (numMatch) {
      parsed.number = parseFloat(numMatch[1]);
      if (/year|yr|yrs|old/i.test(text)) {
        parsed.age = parsed.number;
      }
    }

    // Just a bare number like "4" or "3"
    if (!parsed.number) {
      const bareNum = text.match(/^\s*(\d+\.?\d*)\s*$/);
      if (bareNum) {
        parsed.number = parseFloat(bareNum[1]);
        // Context-dependent: if asking about age, treat as years
        if (followUpContext.type === 'laptop_age') parsed.age = parsed.number;
        if (followUpContext.type === 'wfh_days') parsed.number = parseInt(bareNum[1]);
      }
    }

    // Extract asset tag
    const tagMatch = text.match(/[A-Z]{2,4}-\d{3,6}/i);
    if (tagMatch) parsed.assetTag = tagMatch[0].toUpperCase();

    // Extract floor
    const floorMatch = text.match(/(?:floor|level)\s*(\d+)/i) || text.match(/(\d+)(?:st|nd|rd|th)\s*floor/i);
    if (floorMatch) parsed.floor = parseInt(floorMatch[1]);

    // Extract date
    const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (dateMatch) parsed.date = dateMatch[1];
    const monthMatch = text.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s*\d{0,4}/i);
    if (monthMatch) parsed.date = monthMatch[0];

    // Check if user is raising a completely new issue instead of answering
    const newIssuePatterns = [/my\s+(email|laptop|printer|vpn|wifi|password|software)/i, /i\s+(?:need|want|can't|cannot)\s/i, /install|phishing|suspicious/i];
    if (followUpContext.type !== 'clarification' && newIssuePatterns.some(p => p.test(textLower))) {
      parsed.newIssueDetected = true;
    }

    return parsed;
  }

  /**
   * Generate targeted follow-up response based on parsed answer and context
   */
  _generateFollowUpResponse(parsed, followUpContext, ticket, name, originalText, user) {
    const type = followUpContext.type;

    // If user is raising a new issue entirely, let the main processor handle it
    if (parsed.newIssueDetected && type !== 'clarification') {
      return null; // Fall through to main processMessage
    }

    // ========== LAPTOP AGE FOLLOW-UP ==========
    if (type === 'laptop_age') {
      const age = parsed.age || parsed.number;
      const kbArticle = this.db.prepare('SELECT * FROM knowledge_base WHERE kb_id = ?').get('KB-03');
      const kbArticles = kbArticle ? [kbArticle] : [];

      if (age !== null && age >= 3) {
        return {
          message: `Thank you ${name}! ✅\n\n**Assessment Result (per ${kbArticle ? `${kbArticle.kb_id} — ${kbArticle.title}` : 'KB-03 Laptop Policy'}):**\n• Your device age (**${age} years**) meets the **3-year refresh threshold** for hardware replacement!\n• No additional Finance sign-off is required.\n\n**Next Steps:**\n1. Replacement order has been submitted to Asset Management.\n2. Lead time is **2 business weeks**.\n3. You will receive an email to schedule data transfer and pickup.\n${parsed.assetTag ? `\n📌 **Asset Tag recorded:** ${parsed.assetTag}` : ''}\n\n📋 **Reference:** ${kbArticle ? `${kbArticle.kb_id} — ${kbArticle.title}` : 'KB-03 Laptop Refresh'}`,
          action: 'replacement_approved_via_followup',
          status: 'in_progress',
          priority: 'high',
          escalate: false,
          autoResolved: false,
          followUpQuestions: [],
          kbArticles: kbArticles,
          updatedCategory: 'Hardware',
          updatedSubCategory: 'Laptop',
          reasoning: `Follow-up: Employee confirmed laptop age is ${age} years (≥3yr threshold). Replacement approved per KB-03.`
        };
      }

      if (age !== null && age < 3) {
        return {
          message: `Thank you for confirming, ${name}.\n\n**Assessment (per ${kbArticle ? `${kbArticle.kb_id} — ${kbArticle.title}` : 'KB-03 Laptop Policy'}):**\n• Your device age (**${age} years**) is under the 3-year replacement threshold.\n• This ticket has been routed to **Hardware Repair** instead.\n\n**Next Steps:**\n1. A technician will inspect the hardware defect.\n2. If unrepairable, an early replacement can be escalated with **Finance Sign-off**.\n\nDoes the issue occur when the laptop is plugged into a charger or connected to an external display?`,
          action: 'repair_routed_via_followup',
          status: 'in_progress',
          priority: 'medium',
          escalate: false,
          autoResolved: false,
          followUpQuestions: ['Does the issue happen when plugged into a charger?', 'Is the laptop connected to an external display?'],
          kbArticles: kbArticles,
          updatedCategory: 'Hardware',
          updatedSubCategory: 'Laptop',
          reasoning: `Follow-up: Employee confirmed laptop age is ${age} years (<3yr threshold). Routed to repair per KB-03.`
        };
      }

      // Couldn't parse age — re-ask
      return {
        message: `I wasn't able to determine the laptop age from your response, ${name}. Could you please specify the age in years?\n\nFor example: *"It's about 4 years old"* or just the number like *"3"*.\n\nYou can also provide your **Asset Tag** (sticker on the bottom of the laptop) so I can look it up directly.`,
        action: 'follow_up_reprompt',
        status: 'waiting_response',
        priority: ticket.priority || 'medium',
        escalate: false,
        autoResolved: false,
        followUpQuestions: ['How many years old is your laptop?', 'What is the asset tag number?'],
        kbArticles: [],
        reasoning: 'Follow-up: Could not parse laptop age from employee response. Re-prompting.'
      };
    }

    // ========== WFH DAYS FOLLOW-UP ==========
    if (type === 'wfh_days') {
      const days = parsed.number;
      const kbArticle = this.db.prepare('SELECT * FROM knowledge_base WHERE kb_id = ?').get('KB-10');
      const kbArticles = kbArticle ? [kbArticle] : [];

      if (days !== null && days >= 3) {
        return {
          message: `Great news, ${name}! ✅\n\n**WFH Eligibility Confirmed (per ${kbArticle ? `${kbArticle.kb_id} — ${kbArticle.title}` : 'KB-10 WFH Policy'}):**\n• Working **${days} days/week** remotely qualifies you for the one-time Home Office Equipment Package.\n\n**What's Included:**\n• Ergonomic office chair\n• 27\" external monitor\n• Docking station\n\n**Process:**\n1. ✅ Manager approval request will be sent automatically.\n2. Finance processes the allowance voucher.\n3. IT dispatches equipment to your primary home address.\n\n📋 **Reference:** ${kbArticle ? `${kbArticle.kb_id} — ${kbArticle.title}` : 'KB-10 WFH Equipment'}`,
          action: 'wfh_approved_via_followup',
          status: 'waiting_approval',
          priority: 'medium',
          escalate: false,
          autoResolved: false,
          followUpQuestions: [],
          kbArticles: kbArticles,
          updatedCategory: 'Hardware',
          updatedSubCategory: 'WFH Equipment',
          reasoning: `Follow-up: Employee confirmed ${days} WFH days/week (≥3 threshold). Equipment request submitted per KB-10.`
        };
      }

      if (days !== null && days < 3) {
        return {
          message: `Thank you for confirming, ${name}.\n\n**WFH Policy Check (per ${kbArticle ? `${kbArticle.kb_id} — ${kbArticle.title}` : 'KB-10 WFH Policy'}):**\n• Working **${days} days/week** remotely does **not** meet the minimum **3 days/week** threshold for the Home Office Equipment Package.\n\n**Alternatives:**\n• You may use available shared equipment in the office.\n• If your remote work schedule changes to 3+ days, please re-submit.\n• Your manager can request a policy exception if needed.\n\n📋 **Reference:** ${kbArticle ? `${kbArticle.kb_id} — ${kbArticle.title}` : 'KB-10 WFH Equipment'}`,
          action: 'wfh_ineligible_via_followup',
          status: 'resolved',
          priority: 'low',
          escalate: false,
          autoResolved: true,
          followUpQuestions: [],
          kbArticles: kbArticles,
          updatedCategory: 'Hardware',
          updatedSubCategory: 'WFH Equipment',
          reasoning: `Follow-up: Employee confirmed ${days} WFH days/week (<3 threshold). Not eligible per KB-10.`
        };
      }

      return {
        message: `I wasn't able to determine the number of remote work days, ${name}. Could you specify how many days per week you work from home?\n\nFor example: *"3 days"* or just *"4"*.`,
        action: 'follow_up_reprompt',
        status: 'waiting_response',
        priority: 'medium',
        escalate: false,
        autoResolved: false,
        followUpQuestions: ['How many days per week do you work from home?'],
        kbArticles: [],
        reasoning: 'Follow-up: Could not parse WFH days. Re-prompting.'
      };
    }

    // ========== PRINTER INFO FOLLOW-UP ==========
    if (type === 'printer_info') {
      const kbArticle = this.db.prepare('SELECT * FROM knowledge_base WHERE kb_id = ?').get('KB-05');
      const kbArticles = kbArticle ? [kbArticle] : [];
      const details = [];

      if (parsed.assetTag) details.push(`**Asset Tag:** ${parsed.assetTag}`);
      if (parsed.floor) details.push(`**Floor:** ${parsed.floor}`);

      if (details.length > 0 || originalText.length > 5) {
        return {
          message: `Thank you for those details, ${name}! 🖨️\n\n${details.length > 0 ? `**Recorded Information:**\n${details.map(d => `• ${d}`).join('\n')}\n\n` : ''}**Action Taken:**\nA technician dispatch request has been created for the printer ${parsed.assetTag ? `(${parsed.assetTag})` : ''} ${parsed.floor ? `on Floor ${parsed.floor}` : 'at your location'}.\n\n**Expected Timeline:**\n• Technician visit within **4 business hours**.\n• You will receive a confirmation email shortly.\n\n📋 **Reference:** ${kbArticle ? `${kbArticle.kb_id} — ${kbArticle.title}` : 'KB-05 Printer Support'}`,
          action: 'technician_dispatched_via_followup',
          status: 'in_progress',
          priority: 'medium',
          escalate: false,
          autoResolved: false,
          followUpQuestions: [],
          kbArticles: kbArticles,
          updatedCategory: 'Hardware',
          updatedSubCategory: 'Printer',
          reasoning: `Follow-up: Employee provided printer details${parsed.assetTag ? ` (${parsed.assetTag})` : ''}${parsed.floor ? ` Floor ${parsed.floor}` : ''}. Technician dispatched.`
        };
      }
    }

    // ========== ASSET TAG FOLLOW-UP ==========
    if (type === 'asset_tag') {
      const kbArticle = this.db.prepare('SELECT * FROM knowledge_base WHERE kb_id = ?').get('KB-03');
      const kbArticles = kbArticle ? [kbArticle] : [];

      if (parsed.assetTag) {
        return {
          message: `Got it, ${name}! I've recorded the asset tag **${parsed.assetTag}**.\n\nI'll look up the device records for this asset. In the meantime, could you tell me approximately how old this laptop is?\n\n• Devices **3+ years old** qualify for full replacement.\n• Devices under 3 years are routed to Hardware Repair.`,
          action: 'asset_tag_recorded',
          status: 'waiting_response',
          priority: 'medium',
          escalate: false,
          autoResolved: false,
          followUpQuestions: ['How old is the laptop approximately?'],
          kbArticles: kbArticles,
          updatedCategory: 'Hardware',
          reasoning: `Follow-up: Asset tag ${parsed.assetTag} recorded. Awaiting age to determine replacement vs repair.`
        };
      }
    }

    // ========== YES/NO APPROVAL CHECK ==========
    if (type === 'approval_check') {
      if (parsed.isYes) {
        return {
          message: `Thank you, ${name}! ✅\n\nSince you have manager approval, I'll escalate this request for final processing.\n\n**Next Steps:**\n1. Please email the approved Access Request Form to **it-access@veridian-corp.example**.\n2. Our team will verify and provision within **2 business days**.\n3. You'll receive a confirmation email once access is granted.\n\nIs there anything else I can assist with?`,
          action: 'approval_confirmed_proceeding',
          status: 'in_progress',
          priority: 'high',
          escalate: false,
          autoResolved: false,
          followUpQuestions: [],
          kbArticles: [],
          reasoning: 'Follow-up: Employee confirmed manager approval. Request proceeding to provisioning.'
        };
      }

      if (parsed.isNo) {
        return {
          message: `Understood, ${name}.\n\n**Required Next Steps:**\n1. Contact your **Department Head or Manager** to obtain approval.\n2. Fill out the **Access Request Form** with business justification.\n3. Once approved, reply here or open a new ticket with the signed form.\n\nI'll keep this ticket on hold until approval is received. The ticket will auto-close in 7 days if no update is provided.`,
          action: 'awaiting_approval_document',
          status: 'waiting_approval',
          priority: 'medium',
          escalate: false,
          autoResolved: false,
          followUpQuestions: [],
          kbArticles: [],
          reasoning: 'Follow-up: Employee does not have manager approval yet. Ticket held pending approval document.'
        };
      }
    }

    // ========== EXPENSE ACCOUNT CHECK ==========
    if (type === 'expense_account') {
      const kbArticle = this.db.prepare('SELECT * FROM knowledge_base WHERE kb_id = ?').get('KB-08');
      const kbArticles = kbArticle ? [kbArticle] : [];

      if (parsed.isYes) {
        return {
          message: `Got it, ${name}. Since you already have an expense account, this appears to be a **technical login issue**.\n\n**Troubleshooting Steps:**\n1. Clear your browser cache and cookies.\n2. Try logging in via an Incognito/Private window.\n3. If you see a specific error, please share a screenshot or the exact message.\n\nIf the issue persists, I'll escalate this to the Expense Tool technical support team.\n\n📋 **Reference:** ${kbArticle ? `${kbArticle.kb_id} — ${kbArticle.title}` : 'KB-08 Expense Management'}`,
          action: 'expense_login_troubleshooting',
          status: 'in_progress',
          priority: 'medium',
          escalate: false,
          autoResolved: false,
          followUpQuestions: ['What error message do you see when logging in?'],
          kbArticles: kbArticles,
          updatedCategory: 'Software',
          updatedSubCategory: 'Expense Tool',
          reasoning: 'Follow-up: Employee has existing expense account. Providing login troubleshooting per KB-08.'
        };
      }

      if (parsed.isNo) {
        return {
          message: `Understood, ${name}.\n\nNew expense account creation is managed by the **Finance Department**, not IT.\n\n**Steps to get an account:**\n1. Contact your manager to request expense tool access.\n2. Finance will provision your account within **3 business days**.\n3. Once provisioned, IT can assist with any login credential issues.\n\nI've noted this in your ticket and routed it to Finance for follow-up.\n\n📋 **Reference:** ${kbArticle ? `${kbArticle.kb_id} — ${kbArticle.title}` : 'KB-08 Expense Management'}`,
          action: 'routed_to_finance',
          status: 'open',
          priority: 'medium',
          escalate: false,
          autoResolved: false,
          followUpQuestions: [],
          kbArticles: kbArticles,
          updatedCategory: 'Software',
          updatedSubCategory: 'Expense Tool',
          reasoning: 'Follow-up: Employee needs new expense account. Routed to Finance per KB-08.'
        };
      }
    }

    // ========== QUOTA INCREASE CONFIRMATION ==========
    if (type === 'quota_request') {
      const kbArticle = this.db.prepare('SELECT * FROM knowledge_base WHERE kb_id = ?').get('KB-06');
      const kbArticles = kbArticle ? [kbArticle] : [];

      if (parsed.isYes) {
        return {
          message: `Request submitted, ${name}! ✅\n\n**Mailbox Quota Increase Request:**\n• Current quota: **25GB**\n• Requested quota: **50GB**\n• Status: **Pending Manager Approval**\n\nYour manager will receive an approval email shortly. Once approved, the quota increase will be applied within 1 business day.\n\n📋 **Reference:** ${kbArticle ? `${kbArticle.kb_id} — ${kbArticle.title}` : 'KB-06 Mailbox Quota'}`,
          action: 'quota_increase_submitted',
          status: 'waiting_approval',
          priority: 'medium',
          escalate: false,
          autoResolved: false,
          followUpQuestions: [],
          kbArticles: kbArticles,
          updatedCategory: 'Email',
          reasoning: 'Follow-up: Employee confirmed quota increase request. Submitted for manager approval per KB-06.'
        };
      }

      if (parsed.isNo) {
        return {
          message: `No problem, ${name}. I recommend trying the self-service cleanup steps first:\n\n1. Empty **Deleted Items** & **Junk** folders.\n2. Archive emails older than 1 year.\n3. Remove large attachments from Sent Items.\n\nIf you change your mind about the quota increase, just let me know!\n\n📋 **Reference:** ${kbArticle ? `${kbArticle.kb_id} — ${kbArticle.title}` : 'KB-06 Mailbox Quota'}`,
          action: 'self_service_recommended',
          status: 'resolved',
          priority: 'low',
          escalate: false,
          autoResolved: true,
          followUpQuestions: [],
          kbArticles: kbArticles,
          updatedCategory: 'Email',
          reasoning: 'Follow-up: Employee declined quota increase. Resolved with self-service steps per KB-06.'
        };
      }
    }

    // ========== CONFIRM ACTION (Platform change, etc.) ==========
    if (type === 'confirm_action') {
      if (parsed.isYes) {
        return {
          message: `Request submitted, ${name}! ✅\n\nYour request has been forwarded to your **Department Head** for review and approval.\n\n**Expected Timeline:**\n• Manager review: **1–2 business days**\n• IT Security validation: **1 business day** after manager approval\n• Equipment swap: **3–5 business days** after full approval\n\nYou'll receive email notifications at each stage. Is there anything else I can help with?`,
          action: 'request_submitted_for_approval',
          status: 'waiting_approval',
          priority: 'medium',
          escalate: false,
          autoResolved: false,
          followUpQuestions: [],
          kbArticles: [],
          reasoning: 'Follow-up: Employee confirmed action. Request submitted for manager approval.'
        };
      }

      if (parsed.isNo) {
        return {
          message: `No problem, ${name}. I've kept the information on file in case you change your mind later. Feel free to open a new conversation anytime.\n\nIs there anything else I can help you with today?`,
          action: 'action_cancelled_by_user',
          status: 'closed',
          priority: 'low',
          escalate: false,
          autoResolved: true,
          followUpQuestions: [],
          kbArticles: [],
          reasoning: 'Follow-up: Employee declined action. Ticket closed.'
        };
      }
    }

    // ========== LAPTOP DIAGNOSTIC (charger/display question) ==========
    if (type === 'laptop_diagnostic') {
      const kbArticle = this.db.prepare('SELECT * FROM knowledge_base WHERE kb_id = ?').get('KB-03');
      const kbArticles = kbArticle ? [kbArticle] : [];

      return {
        message: `Thank you for that diagnostic detail, ${name}.\n\n**Updated Assessment:**\nBased on your feedback, I've added this information to the repair ticket for the technician.\n\n**Next Steps:**\n1. A **hardware technician** will contact you within **4 business hours** to schedule an inspection.\n2. Bring your laptop and charger to the **IT Service Center** (Building B, Floor 2).\n3. If it's determined unrepairable, we'll initiate an early replacement with Finance approval.\n\n📋 **Reference:** ${kbArticle ? `${kbArticle.kb_id} — ${kbArticle.title}` : 'KB-03 Hardware Policy'}`,
        action: 'diagnostic_info_recorded',
        status: 'in_progress',
        priority: 'medium',
        escalate: false,
        autoResolved: false,
        followUpQuestions: [],
        kbArticles: kbArticles,
        updatedCategory: 'Hardware',
        updatedSubCategory: 'Laptop',
        reasoning: `Follow-up: Employee provided diagnostic info for laptop repair. Technician dispatch queued.`
      };
    }

    // ========== CONTRACTOR DATE ==========
    if (type === 'contractor_date') {
      const kbArticle = this.db.prepare('SELECT * FROM knowledge_base WHERE kb_id = ?').get('KB-02');
      const kbArticles = kbArticle ? [kbArticle] : [];

      if (parsed.date || originalText.length > 3) {
        return {
          message: `Thank you, ${name}! I've recorded the contractor project timeline.\n\n**Contractor VPN Access Request:**\n• End date: **${parsed.date || originalText}**\n• Status: **Pending Manager Approval**\n\n**Next Steps:**\n1. The contracting manager will receive an approval email.\n2. Once approved, VPN credentials will be generated and sent securely.\n3. Credentials will auto-expire at the project end date.\n\n📋 **Reference:** ${kbArticle ? `${kbArticle.kb_id} — ${kbArticle.title}` : 'KB-02 VPN Access'}`,
          action: 'contractor_vpn_request_submitted',
          status: 'waiting_approval',
          priority: 'medium',
          escalate: false,
          autoResolved: false,
          followUpQuestions: [],
          kbArticles: kbArticles,
          updatedCategory: 'Network Access',
          updatedSubCategory: 'VPN',
          reasoning: `Follow-up: Contractor end date provided (${parsed.date || originalText}). VPN request submitted for approval per KB-02.`
        };
      }
    }

    // ========== CLARIFICATION (vague → specific) ==========
    if (type === 'clarification') {
      // The user is providing details about their issue — re-classify with fresh context
      return null; // Falls through to the main processMessage with combined context
    }

    // No specific handler matched
    return null;
  }

  /**
   * Batch process all 15 pre-seeded employee requests (REQ-01 to REQ-15)
   */
  processBatchRequests() {
    const tickets = this.db.prepare('SELECT * FROM tickets WHERE request_id IS NOT NULL ORDER BY id ASC').all();
    const processedResults = [];

    for (const ticket of tickets) {
      const result = this.processMessage(ticket.description, ticket.user_id, ticket.id);

      // Save AI Agent message
      this.db.prepare(`
        INSERT INTO messages (ticket_id, sender_type, sender_id, content, kb_sources, action_taken)
        VALUES (?, 'agent', NULL, ?, ?, ?)
      `).run(
        ticket.id,
        result.response.message,
        JSON.stringify(result.kbArticles.map(a => a.kb_id)),
        result.response.action
      );

      // Update ticket fields
      this.db.prepare(`
        UPDATE tickets SET
          category = ?,
          priority = ?,
          status = ?,
          kb_articles_referenced = ?,
          agent_reasoning = ?,
          assigned_to = ?,
          updated_at = CURRENT_TIMESTAMP,
          resolved_at = CASE WHEN ? = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END
        WHERE id = ?
      `).run(
        result.classification.category,
        result.response.priority,
        result.response.status,
        result.ticketData.kb_articles_referenced,
        result.ticketData.agent_reasoning,
        result.ticketData.assigned_to,
        result.response.status,
        ticket.id
      );

      // Log audit trail
      this.db.prepare(`
        INSERT INTO audit_log (ticket_id, action, details, performed_by, reasoning)
        VALUES (?, ?, ?, 'AI Agent', ?)
      `).run(
        ticket.id,
        'ai_agent_batch_processed',
        `Processed request ${ticket.request_id}: ${result.response.action}`,
        result.ticketData.agent_reasoning
      );

      processedResults.push({
        request_id: ticket.request_id,
        ticket_id: ticket.ticket_id,
        category: result.classification.category,
        status: result.response.status,
        priority: result.response.priority,
        kb_articles: result.kbArticles.map(a => a.kb_id),
        action: result.response.action
      });
    }

    return processedResults;
  }

  /**
   * Evaluate a request into the strict assignment JSON decision schema
   */
  evaluateRequestToJSON(message, userId = null) {
    const text = message.trim();
    const result = this.processMessage(text, userId);
    const { classification, kbArticles, context, response } = result;

    const summary = text.length > 70 ? text.substring(0, 67) + '...' : text;
    const applicablePolicies = kbArticles.map(a => a.kb_id);

    // Conflict detection (e.g., KB-03 3-yr threshold vs Asset Policy 4-yr refresh cycle)
    let conflictDetected = false;
    let conflictNote = null;

    if (classification.subCategory === 'Laptop' && context.age) {
      if (context.age >= 3 && context.age < 4) {
        conflictDetected = true;
        conflictNote = `KB-03 permits laptop replacement after 3 years of service, but Asset Management Policy (Q2 2026) specifies a standard 4-year refresh cycle. Since device age is ${context.age} years (between 3 and 4 years), replacement fits KB-03 standard threshold.`;
      }
    }

    // Precedent lookup
    let precedentCited = null;
    const precedents = {
      'Security': 'TK-1048: Phishing email reported — auto-flagged and escalated to Security team.',
      'Guest Wi-Fi': 'TK-1051: Guest Wi-Fi pass issued — self-service kiosk guidance provided.',
      'Password & Lockout': 'TK-1049: Password reset / lockout — unlocked via self-service portal.',
      'VPN': 'TK-1042: VPN credential expired — renewed via self-service portal.',
      'Admin Access': 'TK-1050: Admin access request — rejected due to lack of business justification.',
      'Laptop': context.age && context.age >= 3 ? 'TK-1043: Laptop replacement (3.2 yrs old) — approved for replacement.' : 'TK-1064: Laptop issue (<3 yrs) — routed to hardware repair.',
      'Installation': 'TK-1044: Non-catalog software request — pending IT Security review.',
      'Expense Tool': 'TK-1063: Expense tool login — routed to user for screenshot / technical credentials check.',
      'Printer': 'TK-1046: Printer paper jam — resolved after print spooler check & technician dispatch.',
      'Mailbox': 'TK-1045: Mailbox quota increase — approved at 35GB with manager sign-off.',
      'WFH Equipment': 'TK-1047: Home office equipment request — pending Finance sign-off.'
    };

    const sub = classification.subCategory || classification.category;
    if (precedents[sub]) {
      precedentCited = precedents[sub];
    } else if (precedents[classification.category]) {
      precedentCited = precedents[classification.category];
    }

    // Outcome Decision Logic
    let decision = 'auto_resolve';
    let routedTo = null;
    let missingInfo = null;

    if (classification.category === 'Unknown' || context.isVague) {
      decision = 'needs_clarification';
      missingInfo = 'Specific device or system affected, error symptoms, and when the issue started.';
    } else if (
      response.escalate ||
      response.status === 'waiting_approval' ||
      response.status === 'open' ||
      context.mentionsContractor ||
      /non-catalog|admin|expense|wfh|home office|repair/i.test(text)
    ) {
      decision = 'route_to_human';

      if (classification.category === 'Security' || response.escalate) {
        routedTo = 'IT Security Team';
      } else if (/admin/i.test(text) || classification.subCategory === 'Admin Access') {
        routedTo = 'Finance & Department Manager';
      } else if (context.mentionsContractor || classification.subCategory === 'WFH Equipment') {
        routedTo = 'Reporting Manager & Finance';
      } else if (classification.category === 'Software') {
        routedTo = 'IT Security Review Board';
      } else {
        routedTo = 'IT Support Lead';
      }
    } else if (applicablePolicies.length === 0) {
      decision = 'route_to_human';
      routedTo = 'IT Support Helpdesk';
    }

    // Build 2-3 sentence reasoning
    let reasoning = `The request was classified under ${classification.category}${classification.subCategory ? ` (${classification.subCategory})` : ''} with ${applicablePolicies.length > 0 ? applicablePolicies.join(', ') : 'no KB policy'} applicable. `;
    if (decision === 'auto_resolve') {
      reasoning += `Per ${applicablePolicies.join(', ')}, this request can be fulfilled directly via self-service without human intervention or approval.`;
    } else if (decision === 'route_to_human') {
      reasoning += `Per policy, this request requires human approval or specialized routing (${routedTo}) due to security review, asset allocation, or elevated privilege policies.`;
    } else {
      reasoning += `The request lacks sufficient technical details to determine policy eligibility and requires clarification from the employee.`;
    }

    return {
      request_summary: summary,
      applicable_policies: applicablePolicies,
      conflict_detected: conflictDetected,
      conflict_note: conflictNote,
      precedent_cited: precedentCited,
      decision: decision,
      routed_to: routedTo,
      missing_info: missingInfo,
      reasoning: reasoning,
      confidence: classification.confidence >= 0.7 ? 'high' : (classification.confidence >= 0.3 ? 'medium' : 'low')
    };
  }
}

module.exports = AgentEngine;
