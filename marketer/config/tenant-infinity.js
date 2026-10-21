/* Tenant config: Infinity Home Improvement. Swap this file to onboard another company (same shape). */
IHITenant.apply({
  id: "infinity", companyName: "Infinity Home Improvement", defaultOffice: "MI",
  divisions: ["Infinity", "Gutter Helmet"],
  products: ["Awnings", "Basement", "Bath", "Cabinets", "Doors", "Gutters", "Roofing", "Siding", "Windows"],
  leadSources: { "Internet": ["Google Ad", "Google LSA", "Angi", "HomeBuddy", "Networx", "Website"], "Referral": ["Customer", "Employee"], "Event": ["Home Show", "Canvass"], "Call-in": ["Yard sign", "Radio", "TV"] },
  users: [
    { id: "u-chris",   name: "Chris Baareman",   role: "marketer",  division: "Infinity" },
    { id: "u-tobyb",  name: "Toby Baker",       role: "marketer",  division: "Infinity" },
    { id: "u-kara",  name: "Kara Tanner", role: "marketer",  division: "Infinity" },
    { id: "u-megan",name: "Megan Lowe",    role: "marketer",  division: "Infinity" },
    { id: "u-carla",   name: "Carla Mason",     role: "marketer",  division: "Infinity" },
    { id: "u-shelby",  name: "Shelby Lane",      role: "confirmer", division: "Infinity" },
    { id: "u-taylorc",  name: "Taylor Cole",  role: "dataproc",  division: "Infinity" },
    { id: "u-erin",   name: "Erin Tate",   role: "dataproc",  division: "Infinity" },
    { id: "u-mitch",   name: "Mitch Stockel",    role: "rep",       division: "Infinity" },
    { id: "u-danny",   name: "Danny Verbrugge",  role: "rep",       division: "Infinity" },
    { id: "u-dylan",   name: "Dylan Harmsen",    role: "rep",       division: "Gutter Helmet" },
    { id: "u-james",   name: "James Koster",     role: "rep",       division: "Infinity" },
    { id: "u-tom",     name: "Thomas Otten",     role: "manager",   division: "Infinity", title: "TM manager" }
  ]
});
