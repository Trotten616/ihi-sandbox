/* Tenant config: Infinity Home Improvement. Swap this file to onboard another company (same shape). */
IHITenant.apply({
  id: "infinity", companyName: "Infinity Home Improvement", defaultOffice: "MI",
  divisions: ["Infinity", "Gutter Helmet"],
  products: ["Awnings", "Basement", "Bath", "Cabinets", "Doors", "Gutters", "Roofing", "Siding", "Windows"],
  leadSources: { "Internet": ["Google Ad", "Google LSA", "Angi", "HomeBuddy", "Networx", "Website"], "Referral": ["Customer", "Employee"], "Event": ["Home Show", "Canvass"], "Call-in": ["Yard sign", "Radio", "TV"] },
  users: [
    { id: "u-chris",   name: "Chris Baareman",   role: "marketer",  division: "Infinity" },
    { id: "u-tylerb",  name: "Tyler Budd",       role: "marketer",  division: "Infinity" },
    { id: "u-karrie",  name: "Karrie Turashoff", role: "marketer",  division: "Infinity" },
    { id: "u-michelle",name: "Michelle Lund",    role: "marketer",  division: "Infinity" },
    { id: "u-cindy",   name: "Cindy Moreno",     role: "marketer",  division: "Infinity" },
    { id: "u-sheila",  name: "Sheila Lung",      role: "confirmer", division: "Infinity" },
    { id: "u-tylerc",  name: "Tyler Carpenter",  role: "dataproc",  division: "Infinity" },
    { id: "u-emily",   name: "Emily Thompson",   role: "dataproc",  division: "Infinity" },
    { id: "u-mitch",   name: "Mitch Stockel",    role: "rep",       division: "Infinity" },
    { id: "u-danny",   name: "Danny Verbrugge",  role: "rep",       division: "Infinity" },
    { id: "u-dylan",   name: "Dylan Harmsen",    role: "rep",       division: "Gutter Helmet" },
    { id: "u-james",   name: "James Koster",     role: "rep",       division: "Infinity" },
    { id: "u-drew",    name: "Drew Schau",       role: "rep",       division: "Infinity" },
    { id: "u-elliott", name: "Elliott Miller",   role: "rep",       division: "Infinity" },
    { id: "u-boyd",    name: "Boyd Levitt",      role: "rep",       division: "Infinity" },
    { id: "u-jonathan",name: "Jonathan Kroll",   role: "rep",       division: "Infinity" },
    { id: "u-tom",     name: "Thomas Otten",     role: "manager",   division: "Infinity", title: "TM manager" }
  ],
  /* Future Board columns, in the real board's order: rep name + home office (from the Future Board export, 2026-10-19) */
  futureBoard: [
    { name: "Mitch Stockel",  city: "Caledonia" },
    { name: "Dylan Harmsen",  city: "Grand Rapids" },
    { name: "James Koster",   city: "Grand Rapids" },
    { name: "Drew Schau",     city: "Kalamazoo" },
    { name: "Elliott Miller", city: "Oshtemo" },
    { name: "Boyd Levitt",    city: "Millington" },
    { name: "Jonathan Kroll", city: "Middleville" }
  ]
});
