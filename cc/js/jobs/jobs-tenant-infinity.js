/* Jobs Board — INFINITY tenant config. Sample customers only (Sample Homeowner, 555 numbers); sample crew names.
   Rep names approved for public display by Thomas (2026-10-21). */
JobsBoardConfig.define({
  tenant: "infinity",
  crmName: "MarketSharp",
  trades: ["Windows", "Roofing", "Siding", "Gutters/Gutter Helmet", "Doors", "Sliding Doors", "Decks", "Sunrooms", "Bath/Tub", "Insulation", "Awnings"],
  salesmen: ["Mitch Stockel", "Danny Verbrugge", "Dylan D'Agostino", "James Adams", "Drew Schau", "Elliott Miller", "Boyd Levitt", "Jonathan Kroll"],
  setters: ["Chris Baareman", "Lisa Kolenda", "Diana Honicutt", "Cindy Moreno", "Karrie Turashoff"],
  crews: ["Crew A · Windows", "Crew B · Roofing", "Crew C · Siding", "Crew D · Gutters", "Crew E · Doors & Decks", "Crew F · Bath"],
  cities: [["Portage", "49002"], ["Kalamazoo", "49008"], ["Oshtemo", "49009"], ["Grand Rapids", "49503"], ["Wyoming", "49509"], ["Kentwood", "49512"],
    ["Caledonia", "49316"], ["Middleville", "49333"], ["Holland", "49423"], ["Jenison", "49428"], ["Battle Creek", "49015"], ["Plainwell", "49080"], ["Allegan", "49010"]],
  sampleJobs: 42,
  marginTarget: 0.38
});
/* Access-style jobs hub fields (Infinity) */
(function () {
  var c = JobsBoardConfig.get(), map = { "Windows": "Windows", "Roofing": "Roof", "Siding": "Siding", "Gutters/Gutter Helmet": "Gutters", "Doors": "Door", "Sliding Doors": "Door", "Decks": "Deck", "Bath/Tub": "Bath", "Insulation": "Insulation", "Sunrooms": "Other", "Awnings": "Other" };
  JobsBoardConfig.define(Object.assign({}, c, {
    companyName: "Infinity Home Improvement",
    items: ["Roof", "Siding", "Windows", "Bath", "Gutters", "Deck", "Door", "Insulation", "Other"],
    itemOf: function (trade) { return map[trade] || "Other"; },
    tasks: ["Permit Pulled", "HOA Approval", "Materials Ordered", "Dumpster Ordered", "Lien Waiver", "Final Walkthrough"],
    customerTypes: ["Retail", "Warranty", "Service"],
    serviceTypes: ["Warranty", "Cash", "Credit"],
    serviceStatuses: ["OPEN", "SCHEDULED", "WAITING ON PARTS", "IN PROGRESS", "CLOSED"],
    techs: ["Service Tech 1", "Service Tech 2", "Crew A · Windows", "Crew B · Roofing"],
    vendors: ["Sample Supply Co.", "Sample Window Mfg.", "Sample Roofing Dist.", "Sample Gutter Supply"],
    times: ["7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"]
  }));
})();
