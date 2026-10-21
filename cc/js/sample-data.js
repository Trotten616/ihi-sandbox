/* Sample data only — clearly fake. No real customer PII. */
window.SampleData = {
  offices: [
    { id: "MI", name: "Michigan", short: "MI" },
    { id: "IL", name: "Illinois", short: "IL" }
  ],

  users: [
    { id: "u-setter", name: "Setter Sample", email: "setter.sample@example.com", role: "Setter", initials: "SS", officeDefault: "MI" },
    { id: "u-confirmer", name: "Confirmer Sample", email: "confirmer.sample@example.com", role: "Confirmer", initials: "CS", officeDefault: "MI" },
    { id: "u-manager", name: "Manager Sample", email: "manager.sample@example.com", role: "Manager", initials: "MS", officeDefault: "MI" },
    { id: "u-dataproc", name: "Data Processor Sample", email: "data.sample@example.com", role: "Data processor", initials: "DP", officeDefault: "MI" },

    /* Named staff (sample logins — emails are fake @example.com). marketer:true → personal Home dashboard */
    { id: "u-chris", name: "Chris Baareman", email: "chris.baareman@example.com", role: "Setter", roleLabel: "Marketer", initials: "CB", officeDefault: "MI", marketer: true },
    { id: "u-lisa", name: "Lisa Kolenda", email: "lisa.kolenda@example.com", role: "Setter", roleLabel: "Marketer", initials: "LK", officeDefault: "MI", marketer: true },
    { id: "u-diana", name: "Diana Honicutt", email: "diana.honicutt@example.com", role: "Setter", roleLabel: "Marketer", initials: "DH", officeDefault: "MI", marketer: true, scheduleNote: "Doesn’t work Mondays" },
    { id: "u-cindy", name: "Cindy Moreno", email: "cindy.moreno@example.com", role: "Setter", roleLabel: "Marketer", initials: "CM", officeDefault: "MI", marketer: true },
    { id: "u-karrie", name: "Karrie Turashoff", email: "karrie.turashoff@example.com", role: "Setter", roleLabel: "Marketer", initials: "KT", officeDefault: "MI", marketer: true, scheduleNote: "Mon–Fri" },
    { id: "u-sally", name: "Sally VanHorn", email: "sally.vanhorn@example.com", role: "Setter", roleLabel: "Marketer", initials: "SV", officeDefault: "MI", marketer: true },
    { id: "u-saundra", name: "Saundra Wells", email: "saundra.wells@example.com", role: "Setter", roleLabel: "Marketer", initials: "SW", officeDefault: "MI", marketer: true },
    { id: "u-stacy", name: "Stacy Snively", email: "stacy.snively@example.com", role: "Setter", roleLabel: "Marketer", initials: "SS", officeDefault: "MI", marketer: true, scheduleNote: "Started Mar 2026" },
    { id: "u-emily", name: "Emily Thompson", email: "emily.thompson@example.com", role: "Data processor", initials: "ET", officeDefault: "MI" },
    { id: "u-tylerc", name: "Tyler Carpenter", email: "tyler.carpenter@example.com", role: "Data processor", initials: "TC", officeDefault: "MI" },
    { id: "u-sheila", name: "Sheila Lung", email: "sheila.lung@example.com", role: "Confirmer", initials: "SL", officeDefault: "MI" },
    { id: "u-tylerb", name: "Tyler Budd", email: "tyler.budd@example.com", role: "Confirmer", initials: "TB", officeDefault: "MI" },
    { id: "u-tom", name: "Tom Otten", email: "tom.otten@example.com", role: "Manager", initials: "TO", officeDefault: "MI" }
  ],

  nextActionsByRole: {
    Manager: {
      MI: [
        { id: "na1", label: "Confirm 8 appointments waiting", view: "appointments", tone: "urgent" },
        { id: "na2", label: "Reply to 5 open text threads", view: "speed", tone: "warn" },
        { id: "na3", label: "Review 2 Access jobs still pending", view: "leads", tone: "info" }
      ],
      IL: [
        { id: "na4", label: "Confirm 3 appointments waiting", view: "appointments", tone: "urgent" },
        { id: "na5", label: "Reply to 2 open text threads", view: "speed", tone: "warn" }
      ]
    },
    Confirmer: {
      MI: [
        { id: "nc1", label: "Work confirm queue — 8 still need a call", view: "appointments", tone: "urgent" },
        { id: "nc2", label: "Check Speed to Lead for unopened confirms", view: "speed", tone: "warn" },
        { id: "nc3", label: "Open Sample Homeowner B for day-2 confirm notes", view: "leads", tone: "info", leadId: "L-1002" }
      ],
      IL: [
        { id: "nc4", label: "Work confirm queue — 3 still need a call", view: "appointments", tone: "urgent" },
        { id: "nc5", label: "Check Speed to Lead for Illinois threads", view: "speed", tone: "warn" }
      ]
    },
    Setter: {
      MI: [
        { id: "ns1", label: "Call list — 4 inquiries need a CTS update", view: "leads", tone: "urgent" },
        { id: "ns2", label: "Text new leads on Speed to Lead (unopened)", view: "speed", tone: "warn" },
        { id: "ns3", label: "Fill open Future Board slots for tonight", view: "appointments", tone: "info" }
      ],
      IL: [
        { id: "ns4", label: "Call list — 2 Illinois inquiries waiting", view: "leads", tone: "urgent" },
        { id: "ns5", label: "Text new Illinois leads on Speed to Lead", view: "speed", tone: "warn" }
      ]
    },
    "Data processor": {
      MI: [
        { id: "nd1", label: "Clean 3 new intakes (address / ZIP / phone)", view: "leads", tone: "urgent" },
        { id: "nd2", label: "Match vendor emails to inquiries", view: "leads", tone: "warn" },
        { id: "nd3", label: "Flag 1 Access job still pending for routing", view: "leads", tone: "info" }
      ],
      IL: [
        { id: "nd4", label: "Clean 2 Illinois intakes", view: "leads", tone: "urgent" },
        { id: "nd5", label: "Verify Naperville address on Sample Homeowner D", view: "leads", tone: "info", leadId: "L-1004" }
      ]
    }
  },

  periods: [
    { id: "PD3926", label: "PD3926", start: "2026-09-27", end: "2026-10-03", current: true },
    { id: "PD3826", label: "PD3826", start: "2026-09-20", end: "2026-09-26", current: false },
    { id: "PD3726", label: "PD3726", start: "2026-09-13", end: "2026-09-19", current: false }
  ],

  /* Aggregate KPIs — fake round numbers, not real dollars */
  kpis: {
    MI: {
      inquiriesToday: 14,
      setsToday: 6,
      issuedToday: 4,
      presentationsToday: 3,
      soldToday: 1,
      confirmQueue: 8,
      openMessages: 5,
      ghlCampaignsActive: 3,
      accessJobsPending: 2
    },
    IL: {
      inquiriesToday: 5,
      setsToday: 2,
      issuedToday: 1,
      presentationsToday: 1,
      soldToday: 0,
      confirmQueue: 3,
      openMessages: 2,
      ghlCampaignsActive: 1,
      accessJobsPending: 1
    }
  },

  kpiSources: {
    inquiriesToday: "MarketSharp",
    setsToday: "MarketSharp",
    issuedToday: "MarketSharp",
    presentationsToday: "MarketSharp",
    soldToday: "MarketSharp",
    confirmQueue: "IHI",
    openMessages: "Hatch",
    ghlCampaignsActive: "GoHighLevel",
    accessJobsPending: "Access"
  },

  leads: [
    {
      id: "L-1001",
      name: "Sample Homeowner A",
      city: "Wyoming",
      state: "MI",
      product: "Infinity",
      source: "Angi",
      cts: "Needs call",
      status: "Inquiry",
      system: "MarketSharp",
      address: "123 Sample Street",
      zip: "49509",
      phones: [{"label": "Mobile", "number": "555-0101"}],
      email: "homeowner.a@example.com",
      rep: null,
      setDate: null,
      inquiryHistory: [{"when": "2026-10-05", "label": "Inquiry created", "detail": "Angi → MarketSharp (sample)"}, {"when": "2026-10-05", "label": "Address cleaned", "detail": "Data Processor Sample"}],
      appointmentHistory: [],
      notes: [
        { when: "2026-10-05 08:12", who: "Data Processor", text: "Address cleaned. ZIP verified. Ready to set." },
        { when: "2026-10-05 08:40", who: "Setter", text: "Left voicemail. Retry after 1 hour." }
      ]
    },
    {
      id: "L-1002",
      name: "Sample Homeowner B",
      city: "Grand Rapids",
      state: "MI",
      product: "Gutter Helmet",
      source: "Canvass",
      cts: "Confirm day 2",
      status: "Set",
      system: "Access",
      address: "45 Sample Ave",
      zip: "49503",
      phones: [{"label": "Home", "number": "555-0102"}, {"label": "Mobile", "number": "555-0112"}],
      email: "homeowner.b@example.com",
      rep: "Sample Rep A",
      setDate: "2026-10-06",
      inquiryHistory: [{"when": "2026-10-04", "label": "Inquiry created", "detail": "Canvass"}, {"when": "2026-10-04", "label": "Set for Tue 2–4", "detail": "Setter Sample"}],
      appointmentHistory: [{"when": "2026-10-06 2:00", "label": "Set · GH", "detail": "Sample Rep A · needs confirm day 2"}],
      notes: [
        { when: "2026-10-04 14:20", who: "Setter", text: "Set for Tue 2–4. Both homeowners home." },
        { when: "2026-10-05 09:05", who: "Confirmer", text: "Day-2 confirm call — answered, still on." }
      ]
    },
    {
      id: "L-1003",
      name: "Sample Homeowner C",
      city: "Kalamazoo",
      state: "MI",
      product: "Infinity",
      source: "IWEB",
      cts: "Issued",
      status: "Issued",
      system: "MarketSharp",
      address: "88 Demo Road",
      zip: "49001",
      phones: [{"label": "Mobile", "number": "555-0103"}],
      email: "homeowner.c@example.com",
      rep: "Sample Rep B",
      setDate: "2026-10-05",
      inquiryHistory: [{"when": "2026-10-05", "label": "Inquiry created", "detail": "IWEB"}, {"when": "2026-10-05", "label": "Issued to rep", "detail": "Appointment Router"}],
      appointmentHistory: [{"when": "2026-10-05 12:00", "label": "Issued · INF", "detail": "Sample Rep B · slot 12–2"}],
      notes: [
        { when: "2026-10-05 07:55", who: "Appointment Router", text: "Issued to Rep Sample 1. Slot 12–2." }
      ]
    },
    {
      id: "L-1004",
      name: "Sample Homeowner D",
      city: "Naperville",
      state: "IL",
      product: "Infinity",
      source: "Porch",
      cts: "New",
      status: "Inquiry",
      system: "MarketSharp",
      address: "10 Sample Court",
      zip: "60540",
      phones: [{"label": "Mobile", "number": "555-0104"}],
      email: "homeowner.d@example.com",
      rep: null,
      setDate: null,
      inquiryHistory: [{"when": "2026-10-05", "label": "Inquiry created", "detail": "Porch vendor feed (sample)"}],
      appointmentHistory: [],
      notes: [
        { when: "2026-10-05 08:00", who: "System", text: "Lead imported from vendor feed (sample)." }
      ]
    },
    {
      id: "L-1005",
      name: "Sample Homeowner E",
      city: "Holland",
      state: "MI",
      product: "Gutter Helmet",
      source: "GH CTS",
      cts: "Confirm day 1",
      status: "Set",
      system: "IHI",
      address: "200 Sample Blvd",
      zip: "49423",
      phones: [{"label": "Mobile", "number": "555-0105"}],
      email: "homeowner.e@example.com",
      rep: "Sample Rep C",
      setDate: "2026-10-07",
      inquiryHistory: [{"when": "2026-10-05", "label": "Inquiry created", "detail": "GH CTS"}, {"when": "2026-10-05", "label": "Set for Wed evening", "detail": "Setter Sample"}],
      appointmentHistory: [{"when": "2026-10-07 6:00", "label": "Set · GH", "detail": "Sample Rep C · confirm day 1"}],
      notes: [
        { when: "2026-10-05 09:30", who: "Setter", text: "Set for Wed evening. Text consent on file." }
      ]
    },
    {
      id: "L-1006",
      name: "Sample Homeowner F",
      city: "Rockford",
      state: "IL",
      product: "Infinity",
      source: "Thumbtack",
      cts: "Callback",
      status: "Inquiry",
      system: "Hatch",
      address: "55 Example Lane",
      zip: "61101",
      phones: [{"label": "Mobile", "number": "555-0106"}],
      email: "homeowner.f@example.com",
      rep: null,
      setDate: null,
      inquiryHistory: [{"when": "2026-10-04", "label": "Inquiry created", "detail": "Thumbtack"}],
      appointmentHistory: [],
      notes: [
        { when: "2026-10-04 16:10", who: "AI text", text: "Homeowner asked about timing. Human follow-up queued." }
      ]
    },
    {
      id: "L-1007",
      name: "Sample Homeowner G",
      city: "Muskegon",
      state: "MI",
      product: "Infinity",
      source: "Referral",
      cts: "Presented",
      status: "Presentation",
      system: "Access",
      address: "77 Sample Parkway",
      zip: "49441",
      phones: [{"label": "Home", "number": "555-0107"}],
      email: "homeowner.g@example.com",
      rep: "Sample Rep D",
      setDate: "2026-10-05",
      inquiryHistory: [{"when": "2026-10-03", "label": "Inquiry created", "detail": "Referral"}, {"when": "2026-10-05", "label": "Presentation complete", "detail": "Sample Rep D"}],
      appointmentHistory: [{"when": "2026-10-05 10:00", "label": "Presented · INF", "detail": "Thinking it over (sample)"}],
      notes: [
        { when: "2026-10-05 11:00", who: "Rep Sample 2", text: "Demo complete. Thinking it over — sample note only." }
      ]
    },
    {
      id: "L-1008",
      name: "Sample Homeowner H",
      city: "Jenison",
      state: "MI",
      product: "Gutter Helmet",
      source: "Google",
      cts: "Sold",
      status: "Sold",
      system: "MarketSharp",
      address: "9 Sample Circle",
      zip: "49428",
      phones: [{"label": "Mobile", "number": "555-0108"}],
      email: "homeowner.h@example.com",
      rep: "Sample Rep A",
      setDate: "2026-10-04",
      inquiryHistory: [{"when": "2026-10-02", "label": "Inquiry created", "detail": "Google"}, {"when": "2026-10-04", "label": "Sold (sample)", "detail": "Sample Rep A"}],
      appointmentHistory: [{"when": "2026-10-04 6:00", "label": "Sold · GH", "detail": "Gross sold (sample) — net pending rescission"}],
      notes: [
        { when: "2026-10-04 19:45", who: "Rep Sample 1", text: "Gross sold (sample). Net pending rescission window." }
      ]
    }
  ],

  boardReps: [
    {
      "id": "r1",
      "name": "Mitch Stockel",
      "city": "Caledonia",
      "products": ["Roofing", "Siding", "Windows", "Insulation"]
    },
    {
      "id": "r2",
      "name": "Dylan Harmsen",
      "city": "Grand Rapids",
      "products": ["Roofing", "Windows", "Doors", "Decks", "Gutters"]
    },
    {
      "id": "r3",
      "name": "James Koster",
      "city": "Grand Rapids",
      "products": ["Siding", "Windows", "Sunrooms", "Insulation"]
    },
    {
      "id": "r4",
      "name": "Drew Schau",
      "city": "Kalamazoo",
      "products": ["Roofing", "Siding", "Decks", "Bath"]
    },
    {
      "id": "r5",
      "name": "Elliott Miller",
      "city": "Oshtemo",
      "products": ["Gutters", "Roofing", "Windows"]
    },
    {
      "id": "r6",
      "name": "Boyd Levitt",
      "city": "Millington",
      "products": ["Roofing", "Siding", "Windows", "Doors", "Decks", "Insulation", "Gutters"]
    },
    {
      "id": "r7",
      "name": "Jonathan Kroll",
      "city": "Middleville",
      "products": ["Windows", "Doors", "Decks", "Sunrooms"]
    }
  ],

  /* Future Board layout — structure/colors from exports; Sample Homeowner names + 555 phones only */
  boardDays: [{"id":"mon","label":"Mon","date":"2026-10-05","confirmAge":"next","slots":[{"time":"10:00","cells":[{"type":"confirmed-next","lead":"Sample Homeowner Q","city":"Wyoming","phone":"555-0141","product":"RF","setter":"LK","state":"MI","label":"Wyoming 555-0141 RF LK."},null,null,null,null,null,null]},{"time":"12:00","cells":[{"type":"cb","lead":"Sample Homeowner B","city":"Wyoming","phone":"555-0102","product":"DECK","setter":"CMM","state":"MI","label":"CB Wyoming 555-0102 DECK CMM."},null,{"type":"confirmed-day2","lead":"Sample Homeowner R","city":"Holland","phone":"555-0142","product":"WIN","setter":"DH","state":"MI","label":"Holland 555-0142 WIN DH."},{"type":"cb","lead":"Sample Homeowner W","city":"South Haven","phone":"555-0150","product":"WIN","setter":"LK","state":"MI","label":"CB South Haven 555-0150 WIN LK."},null,null,null]},{"time":"2:00","cells":[{"type":"confirmed-next","lead":"Sample Homeowner C","city":"Jenison","phone":"555-0113","product":"RF","setter":"DH","state":"MI","label":"Jenison 555-0113 RF DH."},null,null,null,{"type":"confirmed-next","lead":"Sample Homeowner D","city":"Muskegon","phone":"555-0114","product":"SID","setter":"TB","state":"MI","label":"Muskegon 555-0114 SID TB."},{"type":"changed","lead":"Sample Homeowner U","city":"Owosso","phone":"555-0145","product":"SRM","setter":"EM","state":"MI","label":"Owosso 555-0145 SRM EM."},{"type":"unavailable","label":"PTO","state":"MI"}]},{"time":"4:00","cells":[{"type":"product","label":"Product hold"},null,null,null,{"type":"confirmed-day3","lead":"Sample Homeowner S","city":"Jenison","phone":"555-0143","product":"DECK","setter":"TB","state":"MI","label":"Jenison 555-0143 DECK TB."},null,null]},{"time":"6:00","cells":[{"type":"confirmed-next","lead":"Sample Homeowner G","city":"Bay City","phone":"555-0117","product":"DR","setter":"KLM","state":"IL","label":"Bay City 555-0117 DR KLM."},{"type":"newopen","lead":"Sample Homeowner T","city":"Muskegon","phone":"555-0144","product":"SID","setter":"SML","state":"MI","label":"Muskegon 555-0144 SID SML."},null,null,{"type":"confirmed-next","lead":"Sample Homeowner H","city":"Owosso","phone":"555-0118","product":"INSUL","setter":"ML","state":"MI","label":"Owosso 555-0118 INSUL ML."},null,null]}]},{"id":"tue","label":"Tue","date":"2026-10-06","confirmAge":"day2","slots":[{"time":"10:00","cells":[null,{"type":"radius","label":"Within 60 min · Sample City"},null,{"type":"confirmed-day2","lead":"Sample Homeowner I","city":"Newaygo","phone":"555-0119","product":"GTR","setter":"CMM","state":"MI","label":"Newaygo 555-0119 GTR CMM."},{"type":"confirmed-day2","lead":"Sample Homeowner J","city":"South Haven","phone":"555-0120","product":"DECK","setter":"LK","state":"MI","label":"South Haven 555-0120 DECK LK."},null,{"type":"cb","lead":"Sample Homeowner V","city":"Naperville","phone":"555-0146","product":"WIN","setter":"KLM","state":"IL","label":"CB Naperville 555-0146 WIN KLM."}]},{"time":"12:00","cells":[{"type":"radius","label":"Area hold · Sample City"},null,null,null,null,{"type":"confirmed-day2","lead":"Sample Homeowner L","city":"Grand Blanc","phone":"555-0122","product":"RF","setter":"TB","state":"MI","label":"Grand Blanc 555-0122 RF TB."},null]},{"time":"2:00","cells":[null,null,null,null,{"type":"confirmed-day2","lead":"Sample Homeowner M","city":"Fennville","phone":"555-0123","product":"SID","setter":"SML","state":"MI","label":"Fennville 555-0123 SID SML."},null,null]},{"time":"4:00","cells":[null,null,{"type":"product","label":"Product hold"},{"type":"confirmed-day2","lead":"Sample Homeowner N","city":"Lake","phone":"555-0124","product":"SRM","setter":"EM","state":"IL","label":"Lake 555-0124 SRM EM."},null,null,null]},{"time":"6:00","cells":[null,{"type":"cb","lead":"Sample Homeowner O","city":"Wyoming","phone":"555-0125","product":"TUB","setter":"KLM","state":"MI","label":"CB Wyoming 555-0125 TUB KLM."},{"type":"cb","lead":"Sample Homeowner P","city":"Holland","phone":"555-0126","product":"DR","setter":"ML","state":"MI","label":"CB Holland 555-0126 DR ML."},null,null,null,null]}]},{"id":"wed","label":"Wed","date":"2026-10-07","confirmAge":"day3","slots":[{"time":"10:00","cells":[{"type":"cb","lead":"Sample Homeowner Q","city":"Jenison","phone":"555-0127","product":"INSUL","setter":"CMM","state":"MI","label":"CB Jenison 555-0127 INSUL CMM."},{"type":"radius","label":"Within 60 min · Sample City"},{"type":"unavailable","label":"Staff meeting"},null,null,null,null]},{"time":"12:00","cells":[{"type":"product","label":"Product hold"},null,null,null,{"type":"set","lead":"Sample Homeowner R","city":"Muskegon","phone":"555-0128","product":"GTR","setter":"LK","state":"MI","label":"Muskegon 555-0128 GTR LK."},{"type":"set","lead":"Sample Homeowner S","city":"Kalamazoo","phone":"555-0129","product":"DECK","setter":"DH","state":"MI","label":"Kalamazoo 555-0129 DECK DH."},{"type":"changed","lead":"Sample Homeowner T","city":"Lansing","phone":"555-0130","product":"WIN","setter":"TB","state":"MI","label":"Lansing 555-0130 WIN TB."}]},{"time":"2:00","cells":[null,null,null,{"type":"radius","label":"Area hold · Sample City"},null,null,null]},{"time":"4:00","cells":[{"type":"cb","lead":"Sample Homeowner U","city":"Bay City","phone":"555-0131","product":"RF","setter":"SML","state":"IL","label":"CB Bay City 555-0131 RF SML."},{"type":"set","lead":"Sample Homeowner V","city":"Owosso","phone":"555-0132","product":"SID","setter":"EM","state":"MI","label":"Owosso 555-0132 SID EM."},null,{"type":"radius","label":"Area hold · Sample City"},null,null,null]},{"time":"6:00","cells":[{"type":"product","label":"Product hold"},null,null,null,{"type":"set","lead":"Sample Homeowner W","city":"Newaygo","phone":"555-0133","product":"SRM","setter":"KLM","state":"MI","label":"Newaygo 555-0133 SRM KLM."},null,null]}]},{"id":"thu","label":"Thu","date":"2026-10-08","confirmAge":"same","slots":[{"time":"10:00","cells":[null,{"type":"radius","label":"Within 60 min · Sample City"},null,{"type":"cb","lead":"Sample Homeowner X","city":"South Haven","phone":"555-0134","product":"TUB","setter":"ML","state":"MI","label":"CB South Haven 555-0134 TUB ML."},null,null,null]},{"time":"12:00","cells":[null,null,null,null,null,{"type":"cb","lead":"Sample Homeowner Y","city":"Caledonia","phone":"555-0135","product":"DR","setter":"CMM","state":"MI","label":"CB Caledonia 555-0135 DR CMM."},null]},{"time":"2:00","cells":[{"type":"cb","lead":"Sample Homeowner Z","city":"Grand Blanc","phone":"555-0136","product":"INSUL","setter":"LK","state":"MI","label":"CB Grand Blanc 555-0136 INSUL LK."},null,null,{"type":"changed","lead":"Sample Homeowner A","city":"Fennville","phone":"555-0137","product":"GTR","setter":"DH","state":"MI","label":"Fennville 555-0137 GTR DH."},null,{"type":"product","label":"Product hold"},null]},{"time":"4:00","cells":[null,null,{"type":"cb","lead":"Sample Homeowner B","city":"Lake","phone":"555-0138","product":"DECK","setter":"TB","state":"IL","label":"CB Lake 555-0138 DECK TB."},null,null,null,null]},{"time":"6:00","cells":[{"type":"cb","lead":"Sample Homeowner C","city":"Wyoming","phone":"555-0139","product":"WIN","setter":"SML","state":"MI","label":"CB Wyoming 555-0139 WIN SML."},{"type":"cb","lead":"Sample Homeowner D","city":"Holland","phone":"555-0140","product":"RF","setter":"EM","state":"MI","label":"CB Holland 555-0140 RF EM."},{"type":"cb","lead":"Sample Homeowner E","city":"Jenison","phone":"555-0141","product":"SID","setter":"KLM","state":"MI","label":"CB Jenison 555-0141 SID KLM."},null,null,null,null]}]},{"id":"fri","label":"Fri","date":"2026-10-09","confirmAge":"same","slots":[{"time":"10:00","cells":[{"type":"cb","lead":"Sample Homeowner F","city":"Muskegon","phone":"555-0142","product":"SRM","setter":"ML","state":"MI","label":"CB Muskegon 555-0142 SRM ML."},{"type":"radius","label":"Within 60 min · Sample City"},null,{"type":"cb","lead":"Sample Homeowner G","city":"Kalamazoo","phone":"555-0143","product":"TUB","setter":"CMM","state":"MI","label":"CB Kalamazoo 555-0143 TUB CMM."},null,null,null]},{"time":"12:00","cells":[null,null,null,null,null,null,null]},{"time":"2:00","cells":[null,{"type":"cb","lead":"Sample Homeowner H","city":"Lansing","phone":"555-0144","product":"DR","setter":"LK","state":"MI","label":"CB Lansing 555-0144 DR LK."},null,null,null,null,null]},{"time":"4:00","cells":[{"type":"cb","lead":"Sample Homeowner I","city":"Bay City","phone":"555-0145","product":"INSUL","setter":"DH","state":"IL","label":"CB Bay City 555-0145 INSUL DH."},{"type":"cb","lead":"Sample Homeowner J","city":"Owosso","phone":"555-0146","product":"GTR","setter":"TB","state":"MI","label":"CB Owosso 555-0146 GTR TB."},null,null,null,null,{"type":"radius","label":"Within 60 min · Sample City"}]},{"time":"6:00","cells":[null,null,null,null,null,null,null]}]},{"id":"sat","label":"Sat","date":"2026-10-10","confirmAge":"same","slots":[{"time":"10:00","cells":[{"type":"radius","label":"Within 60 min · Sample City"},{"type":"cb","lead":"Sample Homeowner K","city":"Newaygo","phone":"555-0147","product":"DECK","setter":"SML","state":"MI","label":"CB Newaygo 555-0147 DECK SML."},null,{"type":"cb","lead":"Sample Homeowner L","city":"South Haven","phone":"555-0148","product":"WIN","setter":"EM","state":"MI","label":"CB South Haven 555-0148 WIN EM."},{"type":"radius","label":"?"},null,{"type":"radius","label":"Within 60 min · Sample City"}]},{"time":"12:00","cells":[{"type":"radius","label":"Within 60 min · Sample City"},null,null,{"type":"cb","lead":"Sample Homeowner M","city":"Caledonia","phone":"555-0149","product":"RF","setter":"KLM","state":"MI","label":"CB Caledonia 555-0149 RF KLM."},{"type":"radius","label":"?"},null,null]},{"time":"2:00","cells":[null,null,null,null,null,null,null]}]}],
  boardLegend: [
    {
      "type": "open",
      "label": "Open slot",
      "color": "#FFFFFF"
    },
    {
      "type": "cb",
      "label": "Call-back (unconfirmed)",
      "color": "#00FFFF"
    },
    {
      "type": "confirmed-next",
      "label": "Confirmed · next day",
      "color": "#C00000"
    },
    {
      "type": "confirmed-day2",
      "label": "Confirmed · day 2",
      "color": "#FF6D01"
    },
    {
      "type": "confirmed-day3",
      "label": "Confirmed · day 3",
      "color": "#FFC000"
    },
    {
      "type": "newopen",
      "label": "Newly opened",
      "color": "#00FF00"
    },
    {
      "type": "changed",
      "label": "Changed",
      "color": "#9900FF"
    },
    {
      "type": "unavailable",
      "label": "Unavailable / PTO",
      "color": "#434343"
    },
    {
      "type": "radius",
      "label": "Drive radius / area hold",
      "color": "#FFFFFF"
    },
    {
      "type": "product",
      "label": "Product hold",
      "color": "#9900FF"
    }
  ],

  /* Speed to Lead — sample SMS conversations + user activity (Infinity labels; generic AI text) */
  speedToLead: {
    "conversations": [
      {
        "id": "STL-1",
        "lead": "Sample Homeowner A",
        "leadPhone": "555-0101",
        "staff": "Setter Sample",
        "staffRole": "Setter",
        "state": "MI",
        "opened": false,
        "senderKind": "ai",
        "lastSender": "AI text",
        "preview": "Hi — thanks for your roofing request. When works for a free estimate?",
        "updated": "9:12 AM",
        "speedSec": 42,
        "messages": [
          {
            "from": "ai",
            "who": "AI text",
            "text": "Hi! This is Infinity Home Improvement. We got your roofing request. When is a good time for a free estimate?",
            "time": "9:11 AM",
            "opened": false
          },
          {
            "from": "them",
            "who": "Sample Homeowner A",
            "text": "Tonight after 6?",
            "time": "9:12 AM",
            "opened": false
          }
        ]
      },
      {
        "id": "STL-2",
        "lead": "Sample Homeowner E",
        "leadPhone": "555-0105",
        "staff": "Confirmer Sample",
        "staffRole": "Confirmer",
        "state": "MI",
        "opened": true,
        "senderKind": "human",
        "lastSender": "Confirmer Sample",
        "preview": "Confirmed — see you Wednesday 6–8.",
        "updated": "8:50 AM",
        "speedSec": 180,
        "messages": [
          {
            "from": "ai",
            "who": "AI text",
            "text": "Just confirming your visit Wed 6–8. Reply YES to confirm.",
            "time": "Yesterday",
            "opened": true
          },
          {
            "from": "them",
            "who": "Sample Homeowner E",
            "text": "YES",
            "time": "Yesterday",
            "opened": true
          },
          {
            "from": "human",
            "who": "Confirmer Sample",
            "text": "Great — you're confirmed. See you Wednesday.",
            "time": "8:48 AM",
            "opened": true
          },
          {
            "from": "them",
            "who": "Sample Homeowner E",
            "text": "Confirmed — see you Wednesday 6–8.",
            "time": "8:50 AM",
            "opened": true
          }
        ]
      },
      {
        "id": "STL-3",
        "lead": "Sample Homeowner F",
        "leadPhone": "555-0106",
        "staff": "Marketer Sample",
        "staffRole": "Marketer",
        "state": "IL",
        "opened": true,
        "senderKind": "human",
        "lastSender": "Marketer Sample",
        "preview": "Can you text me the address again?",
        "updated": "7:40 AM",
        "speedSec": 95,
        "messages": [
          {
            "from": "ai",
            "who": "AI text",
            "text": "Reminder: your appointment is tomorrow 12–2 with our specialist.",
            "time": "Yesterday",
            "opened": true
          },
          {
            "from": "human",
            "who": "Marketer Sample",
            "text": "Took over from AI text — happy to help.",
            "time": "7:35 AM",
            "opened": true
          },
          {
            "from": "them",
            "who": "Sample Homeowner F",
            "text": "Can you text me the address again?",
            "time": "7:40 AM",
            "opened": true
          }
        ]
      },
      {
        "id": "STL-4",
        "lead": "Sample Homeowner C",
        "leadPhone": "555-0103",
        "staff": "Setter Sample",
        "staffRole": "Setter",
        "state": "MI",
        "opened": false,
        "senderKind": "ai",
        "lastSender": "AI text",
        "preview": "Following up on your inquiry. Still interested?",
        "updated": "Yesterday",
        "speedSec": 60,
        "messages": [
          {
            "from": "ai",
            "who": "AI text",
            "text": "Following up on your inquiry. Still interested in an estimate?",
            "time": "Yesterday",
            "opened": false
          }
        ]
      },
      {
        "id": "STL-5",
        "lead": "Sample Homeowner H",
        "leadPhone": "555-0108",
        "staff": "Confirmer Sample",
        "staffRole": "Confirmer",
        "state": "MI",
        "opened": true,
        "senderKind": "human",
        "lastSender": "Confirmer Sample",
        "preview": "Thanks for confirming — rep is on the way.",
        "updated": "9:05 AM",
        "speedSec": 28,
        "messages": [
          {
            "from": "human",
            "who": "Confirmer Sample",
            "text": "Hi — confirming today's 2–4 visit. Reply YES if still good.",
            "time": "8:55 AM",
            "opened": true
          },
          {
            "from": "them",
            "who": "Sample Homeowner H",
            "text": "YES",
            "time": "9:00 AM",
            "opened": true
          },
          {
            "from": "human",
            "who": "Confirmer Sample",
            "text": "Thanks for confirming — rep is on the way.",
            "time": "9:05 AM",
            "opened": true
          }
        ]
      },
      {
        "id": "STL-6",
        "lead": "Sample Homeowner D",
        "leadPhone": "555-0104",
        "staff": "Setter Sample",
        "staffRole": "Setter",
        "state": "IL",
        "opened": false,
        "senderKind": "ai",
        "lastSender": "AI text",
        "preview": "Welcome! When should we schedule your free estimate?",
        "updated": "9:20 AM",
        "speedSec": 35,
        "messages": [
          {
            "from": "ai",
            "who": "AI text",
            "text": "Welcome! When should we schedule your free estimate?",
            "time": "9:20 AM",
            "opened": false
          }
        ]
      }
    ],
    "userActivity": [
      {
        "when": "2026-10-05 9:20 AM ET",
        "who": "AI text",
        "action": "Sent first text",
        "detail": "Sample Homeowner D · 35s after lead",
        "state": "IL"
      },
      {
        "when": "2026-10-05 9:12 AM ET",
        "who": "AI text",
        "action": "Sent first text",
        "detail": "Sample Homeowner A · 42s after lead",
        "state": "MI"
      },
      {
        "when": "2026-10-05 9:05 AM ET",
        "who": "Confirmer Sample",
        "action": "Sent text",
        "detail": "Sample Homeowner H · confirm on the way",
        "state": "MI"
      },
      {
        "when": "2026-10-05 9:00 AM ET",
        "who": "Confirmer Sample",
        "action": "Opened thread",
        "detail": "Sample Homeowner H replied YES",
        "state": "MI"
      },
      {
        "when": "2026-10-05 8:50 AM ET",
        "who": "Sample Homeowner E",
        "action": "Opened / read texts",
        "detail": "Thread with Confirmer Sample",
        "state": "MI"
      },
      {
        "when": "2026-10-05 8:48 AM ET",
        "who": "Confirmer Sample",
        "action": "Took over from AI text",
        "detail": "Sample Homeowner E",
        "state": "MI"
      },
      {
        "when": "2026-10-05 7:40 AM ET",
        "who": "Marketer Sample",
        "action": "Opened thread",
        "detail": "Sample Homeowner F asked for address",
        "state": "IL"
      },
      {
        "when": "2026-10-05 7:35 AM ET",
        "who": "Marketer Sample",
        "action": "Took over from AI text",
        "detail": "Sample Homeowner F",
        "state": "IL"
      },
      {
        "when": "2026-10-04 4:10 PM ET",
        "who": "Setter Sample",
        "action": "Sent text",
        "detail": "Sample Homeowner C follow-up",
        "state": "MI"
      },
      {
        "when": "2026-10-04 4:05 PM ET",
        "who": "AI text",
        "action": "Sent first text",
        "detail": "Sample Homeowner C · 60s after lead",
        "state": "MI"
      }
    ]
  },

  calendarDays: [
    { date: "2026-10-05", label: "Mon 5", count: 7 },
    { date: "2026-10-06", label: "Tue 6", count: 5 },
    { date: "2026-10-07", label: "Wed 7", count: 6 },
    { date: "2026-10-08", label: "Thu 8", count: 4 },
    { date: "2026-10-09", label: "Fri 9", count: 3 },
    { date: "2026-10-10", label: "Sat 10", count: 2 },
    { date: "2026-10-11", label: "Sun 11", count: 0 }
  ],

  conversations: [
    {
      id: "H-1",
      name: "Sample Homeowner A",
      preview: "Thanks — what time works this week?",
      unread: true,
      system: "Hatch",
      state: "MI",
      messages: [
        { from: "ai", text: "Hi! This is Infinity Home Improvement. We got your roofing request. When is a good time for a free estimate?", time: "8:02 AM" },
        { from: "them", text: "Thanks — what time works this week?", time: "8:15 AM" },
        { from: "ai", text: "We have Tue 2–4 or Wed 6–8. Which is better?", time: "8:16 AM" }
      ]
    },
    {
      id: "H-2",
      name: "Sample Homeowner F",
      preview: "Can you text me the address again?",
      unread: true,
      system: "Hatch",
      state: "IL",
      messages: [
        { from: "ai", text: "Reminder: your appointment is tomorrow 12–2 with our specialist.", time: "Yesterday" },
        { from: "them", text: "Can you text me the address again?", time: "7:40 AM" }
      ]
    },
    {
      id: "H-3",
      name: "Sample Homeowner E",
      preview: "Confirmed — see you Wednesday.",
      unread: false,
      system: "Hatch",
      state: "MI",
      messages: [
        { from: "ai", text: "Just confirming your Gutter Helmet visit Wed 6–8. Reply YES to confirm.", time: "Yesterday" },
        { from: "them", text: "YES", time: "Yesterday" },
        { from: "ai", text: "Great — you're confirmed. Reply STOP to opt out.", time: "Yesterday" },
        { from: "them", text: "Confirmed — see you Wednesday.", time: "8:50 AM" }
      ]
    },
    {
      id: "H-4",
      name: "Sample Homeowner C",
      preview: "Not interested right now.",
      unread: false,
      system: "Hatch",
      state: "MI",
      messages: [
        { from: "ai", text: "Following up on your inquiry. Still interested in an estimate?", time: "Oct 3" },
        { from: "them", text: "Not interested right now.", time: "Oct 3" }
      ]
    }
  ],

  campaigns: [
    {
      id: "G-1",
      name: "Fall Roof Check (sample)",
      status: "Active",
      system: "GoHighLevel",
      metric: "124 contacts in sequence",
      voice: "AI voice: paused — consent check"
    },
    {
      id: "G-2",
      name: "Gutter Helmet Reminder (sample)",
      status: "Active",
      system: "GoHighLevel",
      metric: "48 contacts in sequence",
      voice: "AI voice: not enabled"
    },
    {
      id: "G-3",
      name: "Missed-set Rescue (sample)",
      status: "Draft",
      system: "GoHighLevel",
      metric: "Not launched",
      voice: "AI voice: placeholder only"
    }
  ],

  reports: [
    {
      id: "r-sales",
      title: "Period Sales",
      tip: "Jobs closed in the selected Sunday–Saturday period.",
      rows: [
        { label: "Gross sold (count)", value: "12" },
        { label: "Net sold (count)", value: "10" },
        { label: "Show rate", value: "38%" },
        { label: "Sample total (fake)", value: "$0 sample" }
      ]
    },
    {
      id: "r-leads",
      title: "Lead Activity",
      tip: "How many inquiries and sets by source this period.",
      rows: [
        { label: "Angi inquiries", value: "22" },
        { label: "Canvass inquiries", value: "18" },
        { label: "IWEB inquiries", value: "9" },
        { label: "Sets from inquiries", value: "41%" }
      ]
    },
    {
      id: "r-show",
      title: "Show Rate",
      tip: "Presentations ÷ issued appointments (goal often ~45%).",
      rows: [
        { label: "Issued", value: "28" },
        { label: "Presentations", value: "11" },
        { label: "Show rate", value: "39%" },
        { label: "No-shows", value: "9" }
      ]
    }
  ],

  audit: [
    { when: "2026-10-05 09:41 ET", who: "Manager Sample", action: "Changed office view to Michigan", detail: "Switcher" },
    { when: "2026-10-05 09:12 ET", who: "Confirmer Sample", action: "Marked confirm day 2 complete", detail: "Lead L-1002" },
    { when: "2026-10-05 08:55 ET", who: "Appointment Router", action: "Issued appointment to Rep Sample 1", detail: "Lead L-1003" },
    { when: "2026-10-05 08:40 ET", who: "Setter Sample", action: "Added note on lead", detail: "Lead L-1001" },
    { when: "2026-10-05 08:12 ET", who: "Data Processor", action: "Validated address and ZIP", detail: "Lead L-1001" },
    { when: "2026-10-04 19:45 ET", who: "Rep Sample 1", action: "Recorded presentation result: sold (sample)", detail: "Lead L-1008" },
    { when: "2026-10-04 16:10 ET", who: "AI text", action: "Queued human follow-up on text thread", detail: "Thread H-4" },
    { when: "2026-10-04 14:20 ET", who: "System", action: "Imported vendor lead (sample feed)", detail: "MarketSharp → Infinity Home Improvement Command Center" }
  ],

  nextActions: {
    MI: [
      { id: "na1", label: "Confirm 8 appointments waiting", view: "appointments", tone: "urgent" },
      { id: "na2", label: "Reply to 5 open text threads", view: "messages", tone: "warn" },
      { id: "na3", label: "Review 2 Access jobs still pending", view: "leads", tone: "info" }
    ],
    IL: [
      { id: "na4", label: "Confirm 3 appointments waiting", view: "appointments", tone: "urgent" },
      { id: "na5", label: "Reply to 2 open text threads", view: "messages", tone: "warn" }
    ]
  },

  /* Sales → Daily Results (sample) — structure mirrors a Sales List daily board, Command Center styling only */
  salesDay: {
    label: "Daily Results",
    dateLabel: "Today's Appointments",
    date: "2026-10-05",
    dateDisplay: "Mon Oct 5, 2026",
    views: ["Daily Results", "D.E. Overview", "Default", "GH Check"],
    appointmentTypes: ["All", "Sales Presentation", "GH Presentation", "CB", "Reset"],
    appointmentResults: [
      "All",
      "Confirmed",
      "Demo / Sold",
      "DEMO NO SALE",
      "No Show",
      "Not Issued",
      "Cancelled",
      "TM CANX",
      "Pending Confirmation",
      "Unconfirmed"
    ],
    divisions: ["All", "Infinity", "Gutter Helmet"],
    salespeople: [
      { id: "sp-mitch", name: "Mitch Stockel", active: true },
      { id: "sp-danny", name: "Danny Verbrugge", active: true },
      { id: "sp-dylan", name: "Dylan Harmsen", active: true },
      { id: "sp-james", name: "James Koster", active: true },
      { id: "sp-inactive", name: "Sample Rep (inactive)", active: false }
    ],
    /* Per-rep day summary — Issued / Demos / Sold / No Show / Cancelled / Issues */
    repRollups: [
      { salesperson: "Mitch Stockel", issued: 5, demos: 3, sold: 1, noShow: 1, cancelled: 0, issues: 1, state: "MI" },
      { salesperson: "Danny Verbrugge", issued: 4, demos: 2, sold: 1, noShow: 0, cancelled: 1, issues: 0, state: "MI" },
      { salesperson: "Dylan Harmsen", issued: 3, demos: 2, sold: 0, noShow: 1, cancelled: 0, issues: 1, state: "MI" },
      { salesperson: "James Koster", issued: 3, demos: 1, sold: 1, noShow: 0, cancelled: 0, issues: 0, state: "MI" },
      { salesperson: "Mitch Stockel", issued: 2, demos: 1, sold: 0, noShow: 0, cancelled: 0, issues: 1, state: "IL" },
      { salesperson: "Danny Verbrugge", issued: 2, demos: 1, sold: 1, noShow: 0, cancelled: 0, issues: 0, state: "IL" }
    ],
    appointments: [
      { id: "SA-01", lastName: "Armstrong", firstName: "Christine", typeChip: "L/C", appointmentType: "Sales Presentation", salesperson: "Mitch Stockel", setDate: "2026-08-26", setDateDisplay: "8/26/2026", apptDate: "2026-10-05T16:00:00", apptDateDisplay: "10/5/2026 4:00 PM", address: "12125 13 Mile", city: "Warren", result: "Confirmed", issued: true, division: "Infinity", state: "MI", tagged: true },
      { id: "SA-02", lastName: "Crespo", firstName: "Francine", typeChip: "L", appointmentType: "Sales Presentation", salesperson: "Mitch Stockel", setDate: "2026-09-02", setDateDisplay: "9/2/2026", apptDate: "2026-10-05T14:00:00", apptDateDisplay: "10/5/2026 2:00 PM", address: "1713 Buchanan Ave SW", city: "Grand Rapids", result: "Demo / Sold", issued: true, division: "Infinity", state: "MI", tagged: true },
      { id: "SA-03", lastName: "Nguyen", firstName: "Kevin", typeChip: "L/C", appointmentType: "GH Presentation", salesperson: "Danny Verbrugge", setDate: "2026-09-28", setDateDisplay: "9/28/2026", apptDate: "2026-10-05T12:00:00", apptDateDisplay: "10/5/2026 12:00 PM", address: "884 Leonard St NW", city: "Grand Rapids", result: "DEMO NO SALE", issued: true, division: "Gutter Helmet", state: "MI", tagged: false },
      { id: "SA-04", lastName: "Baker", firstName: "Linda", typeChip: "L", appointmentType: "Sales Presentation", salesperson: "Dylan Harmsen", setDate: "2026-10-01", setDateDisplay: "10/1/2026", apptDate: "2026-10-05T10:00:00", apptDateDisplay: "10/5/2026 10:00 AM", address: "412 Ottawa Ave", city: "Holland", result: "No Show", issued: true, division: "Infinity", state: "MI", tagged: false },
      { id: "SA-05", lastName: "Patel", firstName: "Raj", typeChip: "L/C", appointmentType: "CB", salesperson: "James Koster", setDate: "2026-10-03", setDateDisplay: "10/3/2026", apptDate: "2026-10-05T18:00:00", apptDateDisplay: "10/5/2026 6:00 PM", address: "55 Cottonwood Dr", city: "Jenison", result: "Pending Confirmation", issued: false, division: "Infinity", state: "MI", tagged: true },
      { id: "SA-06", lastName: "Williams", firstName: "Angela", typeChip: "L", appointmentType: "Sales Presentation", salesperson: "Danny Verbrugge", setDate: "2026-09-20", setDateDisplay: "9/20/2026", apptDate: "2026-10-05T16:00:00", apptDateDisplay: "10/5/2026 4:00 PM", address: "2201 Henry St", city: "Muskegon", result: "Confirmed", issued: true, division: "Infinity", state: "MI", tagged: false },
      { id: "SA-07", lastName: "Schmidt", firstName: "Otto", typeChip: "GH", appointmentType: "GH Presentation", salesperson: "Mitch Stockel", setDate: "2026-09-15", setDateDisplay: "9/15/2026", apptDate: "2026-10-05T12:00:00", apptDateDisplay: "10/5/2026 12:00 PM", address: "908 Lake Dr", city: "Grand Haven", result: "Demo / Sold", issued: true, division: "Gutter Helmet", state: "MI", tagged: true },
      { id: "SA-08", lastName: "Torres", firstName: "Maria", typeChip: "L", appointmentType: "Reset", salesperson: "Dylan Harmsen", setDate: "2026-10-02", setDateDisplay: "10/2/2026", apptDate: "2026-10-05T14:00:00", apptDateDisplay: "10/5/2026 2:00 PM", address: "3310 Breton Rd SE", city: "Kentwood", result: "DEMO NO SALE", issued: true, division: "Infinity", state: "MI", tagged: false },
      { id: "SA-09", lastName: "Johnson", firstName: "Earl", typeChip: "L/C", appointmentType: "Sales Presentation", salesperson: "James Koster", setDate: "2026-09-25", setDateDisplay: "9/25/2026", apptDate: "2026-10-05T10:00:00", apptDateDisplay: "10/5/2026 10:00 AM", address: "14 Maple St", city: "Wyoming", result: "Confirmed", issued: true, division: "Infinity", state: "MI", tagged: false },
      { id: "SA-10", lastName: "Kowalski", firstName: "Helen", typeChip: "L", appointmentType: "Sales Presentation", salesperson: "Mitch Stockel", setDate: "2026-10-04", setDateDisplay: "10/4/2026", apptDate: "2026-10-05T18:00:00", apptDateDisplay: "10/5/2026 6:00 PM", address: "7600 Cascade Rd", city: "Grand Rapids", result: "Not Issued", issued: false, division: "Infinity", state: "MI", tagged: true },
      { id: "SA-11", lastName: "Garcia", firstName: "Luis", typeChip: "L", appointmentType: "CB", salesperson: "Danny Verbrugge", setDate: "2026-10-01", setDateDisplay: "10/1/2026", apptDate: "2026-10-05T12:00:00", apptDateDisplay: "10/5/2026 12:00 PM", address: "1890 28th St", city: "Wyoming", result: "TM CANX", issued: true, division: "Infinity", state: "MI", tagged: false },
      { id: "SA-12", lastName: "Brooks", firstName: "Diane", typeChip: "L/C", appointmentType: "Sales Presentation", salesperson: "Dylan Harmsen", setDate: "2026-09-18", setDateDisplay: "9/18/2026", apptDate: "2026-10-05T16:00:00", apptDateDisplay: "10/5/2026 4:00 PM", address: "402 College Ave", city: "Holland", result: "Unconfirmed", issued: false, division: "Infinity", state: "MI", tagged: false },
      { id: "SA-13", lastName: "Miller", firstName: "Todd", typeChip: "L", appointmentType: "Sales Presentation", salesperson: "James Koster", setDate: "2026-09-30", setDateDisplay: "9/30/2026", apptDate: "2026-10-05T14:00:00", apptDateDisplay: "10/5/2026 2:00 PM", address: "555 Maynard Ave", city: "Kalamazoo", result: "Demo / Sold", issued: true, division: "Infinity", state: "MI", tagged: true },
      { id: "SA-14", lastName: "Chen", firstName: "Wei", typeChip: "GH", appointmentType: "GH Presentation", salesperson: "Mitch Stockel", setDate: "2026-10-03", setDateDisplay: "10/3/2026", apptDate: "2026-10-05T10:00:00", apptDateDisplay: "10/5/2026 10:00 AM", address: "120 Park St", city: "Traverse City", result: "Cancelled", issued: true, division: "Gutter Helmet", state: "MI", tagged: false },
      { id: "SA-15", lastName: "Anderson", firstName: "Beth", typeChip: "L/C", appointmentType: "Sales Presentation", salesperson: "Danny Verbrugge", setDate: "2026-09-22", setDateDisplay: "9/22/2026", apptDate: "2026-10-05T18:00:00", apptDateDisplay: "10/5/2026 6:00 PM", address: "910 Fulton St E", city: "Grand Rapids", result: "Confirmed", issued: true, division: "Infinity", state: "MI", tagged: true },
      { id: "SA-16", lastName: "Reed", firstName: "Samuel", typeChip: "L", appointmentType: "Reset", salesperson: "Dylan Harmsen", setDate: "2026-10-04", setDateDisplay: "10/4/2026", apptDate: "2026-10-05T12:00:00", apptDateDisplay: "10/5/2026 12:00 PM", address: "77 Division Ave S", city: "Grand Rapids", result: "Not Issued", issued: false, division: "Infinity", state: "MI", tagged: false },
      { id: "SA-17", lastName: "Hoffman", firstName: "Mary", typeChip: "L/C", appointmentType: "Sales Presentation", salesperson: "Mitch Stockel", setDate: "2026-09-10", setDateDisplay: "9/10/2026", apptDate: "2026-10-05T14:00:00", apptDateDisplay: "10/5/2026 2:00 PM", address: "440 Ogden Ave", city: "Naperville", result: "Confirmed", issued: true, division: "Infinity", state: "IL", tagged: true },
      { id: "SA-18", lastName: "Okafor", firstName: "Chidi", typeChip: "L", appointmentType: "Sales Presentation", salesperson: "Danny Verbrugge", setDate: "2026-09-29", setDateDisplay: "9/29/2026", apptDate: "2026-10-05T16:00:00", apptDateDisplay: "10/5/2026 4:00 PM", address: "218 Washington St", city: "Naperville", result: "Demo / Sold", issued: true, division: "Infinity", state: "IL", tagged: false },
      { id: "SA-19", lastName: "Singh", firstName: "Priya", typeChip: "GH", appointmentType: "GH Presentation", salesperson: "Mitch Stockel", setDate: "2026-10-02", setDateDisplay: "10/2/2026", apptDate: "2026-10-05T10:00:00", apptDateDisplay: "10/5/2026 10:00 AM", address: "15 Main St", city: "Aurora", result: "Not Issued", issued: false, division: "Gutter Helmet", state: "IL", tagged: false },
      { id: "SA-20", lastName: "Novak", firstName: "Peter", typeChip: "L", appointmentType: "CB", salesperson: "Danny Verbrugge", setDate: "2026-10-04", setDateDisplay: "10/4/2026", apptDate: "2026-10-05T18:00:00", apptDateDisplay: "10/5/2026 6:00 PM", address: "902 Lake St", city: "Oak Park", result: "Pending Confirmation", issued: false, division: "Infinity", state: "IL", tagged: true }
    ]
  }
};

/* Enrich Speed to Lead so texts show as MarketSharp activities (sample only) */
(function enrichMarketSharpTexts() {
  const SD = window.SampleData;
  const stl = SD && SD.speedToLead;
  if (!stl) return;
  (stl.conversations || []).forEach((c) => {
    c.source = "MarketSharp";
    c.loggedIn = "MarketSharp Activities";
    (c.messages || []).forEach((m) => {
      m.loggedAs = "MarketSharp activity";
      m.direction = m.from === "them" ? "inbound" : "outbound";
      if (m.from !== "them") m.sentByUser = m.who;
      if (m.opened === true) {
        m.openedAt = m.openedAt || m.time;
        m.openedTrackedIn = "MarketSharp";
      } else if (m.from !== "them") {
        m.openedTrackedIn = "MarketSharp";
      }
    });
  });
  (stl.userActivity || []).forEach((a) => {
    a.source = "MarketSharp";
    const act = a.action || "";
    if (/open/i.test(act) && !/MarketSharp/i.test(act)) {
      a.action = "Text opened (MarketSharp)";
    } else if (/sent|first text|took over/i.test(act) && !/MarketSharp/i.test(act)) {
      a.action = act.replace(/\s*$/, "") + " (MarketSharp)";
    }
  });
  const hasOpen = (stl.userActivity || []).some((a) => /opened/i.test(a.action || ""));
  if (!hasOpen) {
    stl.userActivity = stl.userActivity || [];
    stl.userActivity.unshift({
      when: "2026-10-05 8:50 AM ET",
      who: "Sample Homeowner E",
      action: "Text opened (MarketSharp)",
      detail: "Opened confirmer follow-up · tracked in MarketSharp",
      state: "MI",
      source: "MarketSharp"
    });
  }
})();
