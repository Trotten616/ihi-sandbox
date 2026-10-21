/* Future Board — INFINITY tenant config (sample customers only; rep names approved by Thomas 2026-10-21).
   City coordinates are approximate public town centers, used only for drive-time estimates. */
FutureBoardConfig.define({
  tenant: "infinity",
  offices: [{ code: "KZO", label: "Kalamazoo" }, { code: "WM", label: "West Michigan" }],
  products: [
    { code: "WIN", label: "Windows" }, { code: "SID", label: "Siding" }, { code: "RF", label: "Roofing", aliases: ["ROOF"] },
    { code: "GTR", label: "Gutters" }, { code: "TUB", label: "Tub / Bath" }, { code: "INS", label: "Insulation" },
    { code: "DK", label: "Deck" }, { code: "SRM", label: "Sunroom" }, { code: "S DR", label: "Sliding Door / Slider Door" },
    { code: "AWNING", label: "Awning" }, { code: "RHASH", label: "Rehash (different rep than the original demo)" }, { code: "GH", label: "GH" }
  ],
  reps: [
    { id: "r1", name: "Mitch Stockel",    office: "KZO", home: "Caledonia",    skills: ["WIN", "SID", "RF", "INS", "GTR", "RHASH"], offDays: [0] },
    { id: "r2", name: "Dylan D'Agostino", office: "KZO", home: "Grand Rapids", skills: ["WIN", "RF", "S DR", "DK", "GTR", "GH", "RHASH"], offDays: [0] },
    { id: "r3", name: "James Adams",      office: "WM",  home: "Grand Rapids", skills: ["SID", "WIN", "SRM", "INS", "AWNING", "RHASH"], offDays: [0] },
    { id: "r4", name: "Drew Schau",       office: "KZO", home: "Kalamazoo",    skills: ["RF", "SID", "DK", "TUB", "WIN", "RHASH"], offDays: [0] },
    { id: "r5", name: "Elliott Miller",   office: "KZO", home: "Oshtemo",      skills: ["GTR", "RF", "WIN", "GH", "S DR", "RHASH"], offDays: [0], offSlots: [{ dow: 6, time: "18:00" }] },
    { id: "r6", name: "Boyd Levitt",      office: "KZO", home: "Millington",   skills: "*", offDays: [0, 3] },
    { id: "r7", name: "Jonathan Kroll",   office: "WM",  home: "Middleville",  skills: ["RF", "WIN"], offDays: [0] }
  ],
  cities: {
    "Kalamazoo": { lat: 42.2917, lng: -85.5872, office: "KZO" }, "Portage": { lat: 42.2011, lng: -85.5800, office: "KZO" },
    "Oshtemo": { lat: 42.2600, lng: -85.6800, office: "KZO" }, "Battle Creek": { lat: 42.3212, lng: -85.1797, office: "KZO" },
    "Paw Paw": { lat: 42.2176, lng: -85.8911, office: "KZO" }, "Plainwell": { lat: 42.4400, lng: -85.6489, office: "KZO" },
    "Three Rivers": { lat: 41.9439, lng: -85.6325, office: "KZO" }, "Vicksburg": { lat: 42.1200, lng: -85.5328, office: "KZO" },
    "Allegan": { lat: 42.5292, lng: -85.8553, office: "KZO" }, "South Haven": { lat: 42.4031, lng: -86.2736, office: "KZO" },
    "Grand Rapids": { lat: 42.9634, lng: -85.6681, office: "WM" }, "Wyoming": { lat: 42.9134, lng: -85.7053, office: "WM" },
    "Kentwood": { lat: 42.8695, lng: -85.6447, office: "WM" }, "Caledonia": { lat: 42.7892, lng: -85.5167, office: "WM" },
    "Middleville": { lat: 42.7131, lng: -85.4619, office: "WM" }, "Holland": { lat: 42.7875, lng: -86.1089, office: "WM" },
    "Jenison": { lat: 42.9072, lng: -85.7920, office: "WM" }, "Rockford": { lat: 43.1200, lng: -85.5600, office: "WM" },
    "Hastings": { lat: 42.6464, lng: -85.2908, office: "WM" }, "Grandville": { lat: 42.9097, lng: -85.7631, office: "WM" },
    "Millington": { lat: 43.2814, lng: -83.5297, office: "KZO" }
  },
  setters: [{ name: "Chris Baareman", initials: "CB" }, { name: "Lisa Kolenda", initials: "LK" }, { name: "Diana Honicutt", initials: "DH" }, { name: "Cindy Moreno", initials: "CM" }, { name: "Karrie Turashoff", initials: "KT" }]
});
