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
   * Process Follow-Up messages dynamically without repeating
   */
  processFollowUp(message, ticketId, userId) {
    const ticket = this.db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) return null;

    const messages = this.db.prepare('SELECT * FROM messages WHERE ticket_id = ? ORDER BY created_at').all(ticketId);

    // Combine recent messages for context-aware processing
    const contextText = messages.slice(-3).map(m => m.content).join(' ') + ' ' + message;
    const result = this.processMessage(contextText, userId, ticketId);

    // If the original ticket was unknown/vague and now has details, update category
    return result;
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
