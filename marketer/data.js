// Sample data only. Every person except the marketer is made up. Relative times resolve at load.
(function(){var now=Date.now(),M=60000,iso=function(m){return m==null?null:new Date(now-m*M).toISOString();};
var d={
 "marketer": {
  "name": "Chris Baareman",
  "role": "Marketer"
 },
 "leads": [
  {
   "id": "L1001",
   "name": "Brian Castellan",
   "phone": "(616) 555-0107",
   "city": "Hudsonville, MI",
   "source": "Website",
   "product": "windows",
   "status": "Attempting",
   "createdMinutesAgo": 10020,
   "lastContactMinutesAgo": 9820,
   "notes": "Wants quote before winter",
   "history": [
    {
     "minutesAgo": 10020,
     "by": "Chris Baareman",
     "result": "No answer",
     "note": "Sample note"
    },
    {
     "minutesAgo": 9930,
     "by": "Chris Baareman",
     "result": "No answer",
     "note": "Sample note"
    },
    {
     "minutesAgo": 9840,
     "by": "Chris Baareman",
     "result": "No answer",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1002",
   "name": "Ryan Nowicki",
   "phone": "(616) 555-0107",
   "city": "Jenison, MI",
   "source": "Website",
   "product": "gutter guards",
   "status": "Callback",
   "createdMinutesAgo": 2760,
   "lastContactMinutesAgo": 2560,
   "notes": "Prefers evening calls",
   "history": [
    {
     "minutesAgo": 2760,
     "by": "Chris Baareman",
     "result": "No answer",
     "note": "Sample note"
    },
    {
     "minutesAgo": 2670,
     "by": "Chris Baareman",
     "result": "Left VM",
     "note": "Sample note"
    },
    {
     "minutesAgo": 2580,
     "by": "Chris Baareman",
     "result": "No answer",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1003",
   "name": "Carla Castellan",
   "phone": "(616) 555-0150",
   "city": "Grand Rapids, MI",
   "source": "Angi",
   "product": "gutter guards",
   "status": "Not interested",
   "createdMinutesAgo": 19440,
   "lastContactMinutesAgo": null,
   "notes": "Older home, 2 stories",
   "history": []
  },
  {
   "id": "L1004",
   "name": "Ryan Okafor",
   "phone": "(616) 555-0113",
   "city": "Kentwood, MI",
   "source": "Website",
   "product": "baths",
   "status": "Contacted",
   "createdMinutesAgo": 4200,
   "lastContactMinutesAgo": 4000,
   "notes": "Prefers evening calls",
   "history": [
    {
     "minutesAgo": 4200,
     "by": "Chris Baareman",
     "result": "Left VM",
     "note": "Sample note"
    },
    {
     "minutesAgo": 4110,
     "by": "Chris Baareman",
     "result": "No answer",
     "note": "Sample note"
    },
    {
     "minutesAgo": 4020,
     "by": "Chris Baareman",
     "result": "Not interested",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1005",
   "name": "Ryan Brenner",
   "phone": "(616) 555-0172",
   "city": "Grand Rapids, MI",
   "source": "Website",
   "product": "windows",
   "status": "New",
   "createdMinutesAgo": 11520,
   "lastContactMinutesAgo": null,
   "notes": "Asked about financing",
   "history": []
  },
  {
   "id": "L1006",
   "name": "Brian Tashjian",
   "phone": "(616) 555-0131",
   "city": "Rockford, MI",
   "source": "Angi",
   "product": "baths",
   "status": "Callback",
   "createdMinutesAgo": 16440,
   "lastContactMinutesAgo": 16240,
   "notes": "Prefers evening calls",
   "history": [
    {
     "minutesAgo": 16440,
     "by": "Chris Baareman",
     "result": "Callback",
     "note": "Sample note"
    },
    {
     "minutesAgo": 16350,
     "by": "Chris Baareman",
     "result": "Callback",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1007",
   "name": "Holly Tashjian",
   "phone": "(616) 555-0177",
   "city": "Kalamazoo, MI",
   "source": "Networx",
   "product": "doors",
   "status": "Appointment set",
   "createdMinutesAgo": 2580,
   "lastContactMinutesAgo": 2380,
   "notes": "Asked about financing",
   "history": [
    {
     "minutesAgo": 2580,
     "by": "Chris Baareman",
     "result": "Callback",
     "note": "Sample note"
    },
    {
     "minutesAgo": 2490,
     "by": "Chris Baareman",
     "result": "Not interested",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1008",
   "name": "Eric Kowalczyk",
   "phone": "(616) 555-0185",
   "city": "Kalamazoo, MI",
   "source": "Website",
   "product": "doors",
   "status": "Contacted",
   "createdMinutesAgo": 5160,
   "lastContactMinutesAgo": 4960,
   "notes": "Spouse must be present",
   "history": [
    {
     "minutesAgo": 5160,
     "by": "Chris Baareman",
     "result": "Callback",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1009",
   "name": "Laura Brenner",
   "phone": "(616) 555-0134",
   "city": "Portage, MI",
   "source": "Referral",
   "product": "baths",
   "status": "Not interested",
   "createdMinutesAgo": 10560,
   "lastContactMinutesAgo": 10360,
   "notes": "Wants quote before winter",
   "history": [
    {
     "minutesAgo": 10560,
     "by": "Chris Baareman",
     "result": "Callback",
     "note": "Sample note"
    },
    {
     "minutesAgo": 10470,
     "by": "Chris Baareman",
     "result": "Callback",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1010",
   "name": "Julie Quist",
   "phone": "(616) 555-0102",
   "city": "Portage, MI",
   "source": "HomeBuddy",
   "product": "windows",
   "status": "Not interested",
   "createdMinutesAgo": 1980,
   "lastContactMinutesAgo": 1780,
   "notes": "Older home, 2 stories",
   "history": [
    {
     "minutesAgo": 1980,
     "by": "Chris Baareman",
     "result": "Callback",
     "note": "Sample note"
    },
    {
     "minutesAgo": 1890,
     "by": "Chris Baareman",
     "result": "Not interested",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1011",
   "name": "Rachel Tashjian",
   "phone": "(616) 555-0116",
   "city": "Zeeland, MI",
   "source": "Angi",
   "product": "roofing",
   "status": "Callback",
   "createdMinutesAgo": 3660,
   "lastContactMinutesAgo": null,
   "notes": "Asked about financing",
   "history": []
  },
  {
   "id": "L1012",
   "name": "Paul Ramsey",
   "phone": "(616) 555-0151",
   "city": "Wyoming, MI",
   "source": "HomeBuddy",
   "product": "windows",
   "status": "New",
   "createdMinutesAgo": 15360,
   "lastContactMinutesAgo": null,
   "notes": "Asked about financing",
   "history": []
  },
  {
   "id": "L1013",
   "name": "Tina Brenner",
   "phone": "(616) 555-0122",
   "city": "Holland, MI",
   "source": "Angi",
   "product": "baths",
   "status": "Contacted",
   "createdMinutesAgo": 16980,
   "lastContactMinutesAgo": 16780,
   "notes": "Prefers evening calls",
   "history": [
    {
     "minutesAgo": 16980,
     "by": "Chris Baareman",
     "result": "Not interested",
     "note": "Sample note"
    },
    {
     "minutesAgo": 16890,
     "by": "Chris Baareman",
     "result": "Callback",
     "note": "Sample note"
    },
    {
     "minutesAgo": 16800,
     "by": "Chris Baareman",
     "result": "Left VM",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1014",
   "name": "Scott Vanderlin",
   "phone": "(616) 555-0118",
   "city": "Battle Creek, MI",
   "source": "Website",
   "product": "siding",
   "status": "Callback",
   "createdMinutesAgo": 480,
   "lastContactMinutesAgo": 280,
   "notes": "Older home, 2 stories",
   "history": [
    {
     "minutesAgo": 480,
     "by": "Chris Baareman",
     "result": "Not interested",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1015",
   "name": "Holly Yoder",
   "phone": "(616) 555-0150",
   "city": "Battle Creek, MI",
   "source": "Google LSA",
   "product": "roofing",
   "status": "Contacted",
   "createdMinutesAgo": 17460,
   "lastContactMinutesAgo": 17260,
   "notes": "Wants quote before winter",
   "history": [
    {
     "minutesAgo": 17460,
     "by": "Chris Baareman",
     "result": "No answer",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1016",
   "name": "Rachel Ramsey",
   "phone": "(616) 555-0120",
   "city": "Kalamazoo, MI",
   "source": "HomeBuddy",
   "product": "doors",
   "status": "Not interested",
   "createdMinutesAgo": 14880,
   "lastContactMinutesAgo": 14680,
   "notes": "Wants quote before winter",
   "history": [
    {
     "minutesAgo": 14880,
     "by": "Chris Baareman",
     "result": "No answer",
     "note": "Sample note"
    },
    {
     "minutesAgo": 14790,
     "by": "Chris Baareman",
     "result": "Left VM",
     "note": "Sample note"
    },
    {
     "minutesAgo": 14700,
     "by": "Chris Baareman",
     "result": "No answer",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1017",
   "name": "Carla Pruitt",
   "phone": "(616) 555-0168",
   "city": "Kalamazoo, MI",
   "source": "HomeBuddy",
   "product": "doors",
   "status": "New",
   "createdMinutesAgo": 3240,
   "lastContactMinutesAgo": null,
   "notes": "Wants quote before winter",
   "history": []
  },
  {
   "id": "L1018",
   "name": "Derek Quist",
   "phone": "(616) 555-0160",
   "city": "Kalamazoo, MI",
   "source": "Networx",
   "product": "roofing",
   "status": "Attempting",
   "createdMinutesAgo": 2280,
   "lastContactMinutesAgo": 2080,
   "notes": "Asked about financing",
   "history": [
    {
     "minutesAgo": 2280,
     "by": "Chris Baareman",
     "result": "Left VM",
     "note": "Sample note"
    },
    {
     "minutesAgo": 2190,
     "by": "Chris Baareman",
     "result": "Not interested",
     "note": "Sample note"
    },
    {
     "minutesAgo": 2100,
     "by": "Chris Baareman",
     "result": "Not interested",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1019",
   "name": "Greg Fennimore",
   "phone": "(616) 555-0194",
   "city": "Ann Arbor, MI",
   "source": "Google LSA",
   "product": "baths",
   "status": "Callback",
   "createdMinutesAgo": 14820,
   "lastContactMinutesAgo": 14620,
   "notes": "Prefers evening calls",
   "history": [
    {
     "minutesAgo": 14820,
     "by": "Chris Baareman",
     "result": "No answer",
     "note": "Sample note"
    },
    {
     "minutesAgo": 14730,
     "by": "Chris Baareman",
     "result": "Left VM",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1020",
   "name": "Rachel Wexler",
   "phone": "(616) 555-0146",
   "city": "Holland, MI",
   "source": "Referral",
   "product": "doors",
   "status": "New",
   "createdMinutesAgo": 15960,
   "lastContactMinutesAgo": null,
   "notes": "Wants quote before winter",
   "history": []
  },
  {
   "id": "L1021",
   "name": "Megan Wexler",
   "phone": "(616) 555-0146",
   "city": "Hudsonville, MI",
   "source": "Angi",
   "product": "siding",
   "status": "Contacted",
   "createdMinutesAgo": 16320,
   "lastContactMinutesAgo": null,
   "notes": "Prefers evening calls",
   "history": []
  },
  {
   "id": "L1022",
   "name": "Kevin Albrecht",
   "phone": "(616) 555-0194",
   "city": "Rockford, MI",
   "source": "Angi",
   "product": "windows",
   "status": "Appointment set",
   "createdMinutesAgo": 16440,
   "lastContactMinutesAgo": 16240,
   "notes": "Older home, 2 stories",
   "history": [
    {
     "minutesAgo": 16440,
     "by": "Chris Baareman",
     "result": "Left VM",
     "note": "Sample note"
    },
    {
     "minutesAgo": 16350,
     "by": "Chris Baareman",
     "result": "Left VM",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1023",
   "name": "Dana Mirelli",
   "phone": "(616) 555-0160",
   "city": "Ann Arbor, MI",
   "source": "Angi",
   "product": "baths",
   "status": "Contacted",
   "createdMinutesAgo": 15240,
   "lastContactMinutesAgo": null,
   "notes": "Older home, 2 stories",
   "history": []
  },
  {
   "id": "L1024",
   "name": "Kevin Hollister",
   "phone": "(616) 555-0129",
   "city": "Portage, MI",
   "source": "Angi",
   "product": "siding",
   "status": "Callback",
   "createdMinutesAgo": 10680,
   "lastContactMinutesAgo": 10480,
   "notes": "Prefers evening calls",
   "history": [
    {
     "minutesAgo": 10680,
     "by": "Chris Baareman",
     "result": "Not interested",
     "note": "Sample note"
    },
    {
     "minutesAgo": 10590,
     "by": "Chris Baareman",
     "result": "No answer",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1025",
   "name": "Todd Quist",
   "phone": "(616) 555-0182",
   "city": "Kalamazoo, MI",
   "source": "Referral",
   "product": "gutter guards",
   "status": "Appointment set",
   "createdMinutesAgo": 14940,
   "lastContactMinutesAgo": null,
   "notes": "Asked about financing",
   "history": []
  },
  {
   "id": "L1026",
   "name": "Amy Brenner",
   "phone": "(616) 555-0192",
   "city": "Battle Creek, MI",
   "source": "Google LSA",
   "product": "roofing",
   "status": "Callback",
   "createdMinutesAgo": 6240,
   "lastContactMinutesAgo": 6040,
   "notes": "",
   "history": [
    {
     "minutesAgo": 6240,
     "by": "Chris Baareman",
     "result": "Callback",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1027",
   "name": "Tina Vanderlin",
   "phone": "(616) 555-0119",
   "city": "Kentwood, MI",
   "source": "Google LSA",
   "product": "baths",
   "status": "Not interested",
   "createdMinutesAgo": 2700,
   "lastContactMinutesAgo": 2500,
   "notes": "Prefers evening calls",
   "history": [
    {
     "minutesAgo": 2700,
     "by": "Chris Baareman",
     "result": "Left VM",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1028",
   "name": "Dana Vanderlin",
   "phone": "(616) 555-0192",
   "city": "Grandville, MI",
   "source": "Networx",
   "product": "doors",
   "status": "Appointment set",
   "createdMinutesAgo": 18900,
   "lastContactMinutesAgo": 18700,
   "notes": "",
   "history": [
    {
     "minutesAgo": 18900,
     "by": "Chris Baareman",
     "result": "Not interested",
     "note": "Sample note"
    },
    {
     "minutesAgo": 18810,
     "by": "Chris Baareman",
     "result": "Left VM",
     "note": "Sample note"
    },
    {
     "minutesAgo": 18720,
     "by": "Chris Baareman",
     "result": "Left VM",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1029",
   "name": "Dana Mirelli",
   "phone": "(616) 555-0127",
   "city": "Ann Arbor, MI",
   "source": "Website",
   "product": "windows",
   "status": "Callback",
   "createdMinutesAgo": 4380,
   "lastContactMinutesAgo": 4180,
   "notes": "Older home, 2 stories",
   "history": [
    {
     "minutesAgo": 4380,
     "by": "Chris Baareman",
     "result": "Left VM",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1030",
   "name": "Holly Castellan",
   "phone": "(616) 555-0166",
   "city": "Battle Creek, MI",
   "source": "Website",
   "product": "windows",
   "status": "Contacted",
   "createdMinutesAgo": 10080,
   "lastContactMinutesAgo": 9880,
   "notes": "Older home, 2 stories",
   "history": [
    {
     "minutesAgo": 10080,
     "by": "Chris Baareman",
     "result": "Left VM",
     "note": "Sample note"
    },
    {
     "minutesAgo": 9990,
     "by": "Chris Baareman",
     "result": "No answer",
     "note": "Sample note"
    },
    {
     "minutesAgo": 9900,
     "by": "Chris Baareman",
     "result": "Not interested",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1031",
   "name": "Holly Okafor",
   "phone": "(616) 555-0177",
   "city": "Grand Rapids, MI",
   "source": "Angi",
   "product": "windows",
   "status": "Appointment set",
   "createdMinutesAgo": 4740,
   "lastContactMinutesAgo": null,
   "notes": "Prefers evening calls",
   "history": []
  },
  {
   "id": "L1032",
   "name": "Ryan Kowalczyk",
   "phone": "(616) 555-0141",
   "city": "Grandville, MI",
   "source": "Website",
   "product": "doors",
   "status": "Appointment set",
   "createdMinutesAgo": 14640,
   "lastContactMinutesAgo": null,
   "notes": "Older home, 2 stories",
   "history": []
  },
  {
   "id": "L1033",
   "name": "Ryan Kowalczyk",
   "phone": "(616) 555-0131",
   "city": "Lansing, MI",
   "source": "HomeBuddy",
   "product": "gutter guards",
   "status": "New",
   "createdMinutesAgo": 14940,
   "lastContactMinutesAgo": null,
   "notes": "Wants quote before winter",
   "history": []
  },
  {
   "id": "L1034",
   "name": "Laura Ramsey",
   "phone": "(616) 555-0141",
   "city": "Kentwood, MI",
   "source": "Website",
   "product": "doors",
   "status": "Callback",
   "createdMinutesAgo": 15660,
   "lastContactMinutesAgo": null,
   "notes": "Older home, 2 stories",
   "history": []
  },
  {
   "id": "L1035",
   "name": "Nicole Strand",
   "phone": "(616) 555-0189",
   "city": "Wyoming, MI",
   "source": "HomeBuddy",
   "product": "doors",
   "status": "Not interested",
   "createdMinutesAgo": 6240,
   "lastContactMinutesAgo": 6040,
   "notes": "Prefers evening calls",
   "history": [
    {
     "minutesAgo": 6240,
     "by": "Chris Baareman",
     "result": "Callback",
     "note": "Sample note"
    },
    {
     "minutesAgo": 6150,
     "by": "Chris Baareman",
     "result": "Callback",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1036",
   "name": "Amy Brenner",
   "phone": "(616) 555-0185",
   "city": "Lansing, MI",
   "source": "Google LSA",
   "product": "gutter guards",
   "status": "Attempting",
   "createdMinutesAgo": 13860,
   "lastContactMinutesAgo": 13660,
   "notes": "Prefers evening calls",
   "history": [
    {
     "minutesAgo": 13860,
     "by": "Chris Baareman",
     "result": "No answer",
     "note": "Sample note"
    },
    {
     "minutesAgo": 13770,
     "by": "Chris Baareman",
     "result": "Callback",
     "note": "Sample note"
    },
    {
     "minutesAgo": 13680,
     "by": "Chris Baareman",
     "result": "Callback",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1037",
   "name": "Tina Quist",
   "phone": "(616) 555-0118",
   "city": "Ann Arbor, MI",
   "source": "Angi",
   "product": "roofing",
   "status": "New",
   "createdMinutesAgo": 9420,
   "lastContactMinutesAgo": null,
   "notes": "Prefers evening calls",
   "history": []
  },
  {
   "id": "L1038",
   "name": "Eric Wexler",
   "phone": "(616) 555-0151",
   "city": "Muskegon, MI",
   "source": "Google LSA",
   "product": "windows",
   "status": "Callback",
   "createdMinutesAgo": 3000,
   "lastContactMinutesAgo": 2800,
   "notes": "Spouse must be present",
   "history": [
    {
     "minutesAgo": 3000,
     "by": "Chris Baareman",
     "result": "Left VM",
     "note": "Sample note"
    },
    {
     "minutesAgo": 2910,
     "by": "Chris Baareman",
     "result": "Left VM",
     "note": "Sample note"
    },
    {
     "minutesAgo": 2820,
     "by": "Chris Baareman",
     "result": "Left VM",
     "note": "Sample note"
    }
   ]
  },
  {
   "id": "L1039",
   "name": "Brian Vanderlin",
   "phone": "(616) 555-0143",
   "city": "Wyoming, MI",
   "source": "Google LSA",
   "product": "roofing",
   "status": "New",
   "createdMinutesAgo": 9900,
   "lastContactMinutesAgo": null,
   "notes": "",
   "history": []
  },
  {
   "id": "L1040",
   "name": "Greg Strand",
   "phone": "(616) 555-0113",
   "city": "Kalamazoo, MI",
   "source": "HomeBuddy",
   "product": "siding",
   "status": "Callback",
   "createdMinutesAgo": 660,
   "lastContactMinutesAgo": 460,
   "notes": "Wants quote before winter",
   "history": [
    {
     "minutesAgo": 660,
     "by": "Chris Baareman",
     "result": "Not interested",
     "note": "Sample note"
    },
    {
     "minutesAgo": 570,
     "by": "Chris Baareman",
     "result": "No answer",
     "note": "Sample note"
    }
   ]
  }
 ],
 "callbacks": [
  {
   "id": "CB1",
   "leadId": "L1001",
   "name": "Brian Castellan",
   "phone": "(616) 555-0107",
   "dueOffsetMin": -401,
   "reason": "Waiting on insurance"
  },
  {
   "id": "CB2",
   "leadId": "L1004",
   "name": "Ryan Okafor",
   "phone": "(616) 555-0113",
   "dueOffsetMin": -295,
   "reason": "Call after work"
  },
  {
   "id": "CB3",
   "leadId": "L1007",
   "name": "Holly Tashjian",
   "phone": "(616) 555-0177",
   "dueOffsetMin": -1414,
   "reason": "Waiting on insurance"
  },
  {
   "id": "CB4",
   "leadId": "L1010",
   "name": "Julie Quist",
   "phone": "(616) 555-0102",
   "dueOffsetMin": -861,
   "reason": "Checking with spouse"
  },
  {
   "id": "CB5",
   "leadId": "L1013",
   "name": "Tina Brenner",
   "phone": "(616) 555-0122",
   "dueOffsetMin": -1128,
   "reason": "Call after work"
  },
  {
   "id": "CB6",
   "leadId": "L1016",
   "name": "Rachel Ramsey",
   "phone": "(616) 555-0120",
   "dueOffsetMin": 373,
   "reason": "Waiting on insurance"
  },
  {
   "id": "CB7",
   "leadId": "L1019",
   "name": "Greg Fennimore",
   "phone": "(616) 555-0194",
   "dueOffsetMin": 60,
   "reason": "Waiting on insurance"
  },
  {
   "id": "CB8",
   "leadId": "L1022",
   "name": "Kevin Albrecht",
   "phone": "(616) 555-0194",
   "dueOffsetMin": 44,
   "reason": "Checking with spouse"
  },
  {
   "id": "CB9",
   "leadId": "L1025",
   "name": "Todd Quist",
   "phone": "(616) 555-0182",
   "dueOffsetMin": 232,
   "reason": "Asked to call back"
  },
  {
   "id": "CB10",
   "leadId": "L1028",
   "name": "Dana Vanderlin",
   "phone": "(616) 555-0192",
   "dueOffsetMin": 152,
   "reason": "Asked to call back"
  },
  {
   "id": "CB11",
   "leadId": "L1031",
   "name": "Holly Okafor",
   "phone": "(616) 555-0177",
   "dueOffsetMin": 339,
   "reason": "Asked to call back"
  },
  {
   "id": "CB12",
   "leadId": "L1034",
   "name": "Laura Ramsey",
   "phone": "(616) 555-0141",
   "dueOffsetMin": 425,
   "reason": "Waiting on insurance"
  }
 ],
 "stl": [
  {
   "id": "S1",
   "name": "Laura Bjornsen",
   "phone": "(269) 555-0228",
   "city": "Kalamazoo, MI",
   "source": "HomeBuddy",
   "product": "gutter guards",
   "minutesAgo": 1
  },
  {
   "id": "S2",
   "name": "Holly Vanderlin",
   "phone": "(269) 555-0243",
   "city": "Wyoming, MI",
   "source": "Google LSA",
   "product": "siding",
   "minutesAgo": 2
  },
  {
   "id": "S3",
   "name": "Derek Pruitt",
   "phone": "(269) 555-0205",
   "city": "Wyoming, MI",
   "source": "Referral",
   "product": "windows",
   "minutesAgo": 4
  },
  {
   "id": "S4",
   "name": "Greg Okafor",
   "phone": "(269) 555-0233",
   "city": "Grand Rapids, MI",
   "source": "Angi",
   "product": "windows",
   "minutesAgo": 6
  },
  {
   "id": "S5",
   "name": "Scott Tashjian",
   "phone": "(269) 555-0267",
   "city": "Rockford, MI",
   "source": "Angi",
   "product": "siding",
   "minutesAgo": 9
  },
  {
   "id": "S6",
   "name": "Holly Wexler",
   "phone": "(269) 555-0286",
   "city": "Holland, MI",
   "source": "HomeBuddy",
   "product": "siding",
   "minutesAgo": 13
  },
  {
   "id": "S7",
   "name": "Dana Mirelli",
   "phone": "(269) 555-0204",
   "city": "Grand Rapids, MI",
   "source": "Networx",
   "product": "baths",
   "minutesAgo": 18
  },
  {
   "id": "S8",
   "name": "Nicole Yoder",
   "phone": "(269) 555-0224",
   "city": "Wyoming, MI",
   "source": "Google LSA",
   "product": "windows",
   "minutesAgo": 27
  }
 ],
 "stats": {
  "dials": 47,
  "contacts": 18,
  "appts": 4,
  "setRate": 22,
  "byHour": [
   {
    "hour": 9,
    "dials": 8,
    "contacts": 3,
    "appts": 1
   },
   {
    "hour": 10,
    "dials": 11,
    "contacts": 4,
    "appts": 1
   },
   {
    "hour": 11,
    "dials": 9,
    "contacts": 4,
    "appts": 0
   },
   {
    "hour": 12,
    "dials": 4,
    "contacts": 1,
    "appts": 0
   },
   {
    "hour": 13,
    "dials": 7,
    "contacts": 3,
    "appts": 1
   },
   {
    "hour": 14,
    "dials": 8,
    "contacts": 3,
    "appts": 1
   }
  ]
 },
 "reps": [
  "Jordan Pell",
  "Avery Lindqvist",
  "Marcus Duvall",
  "Sienna Roark",
  "Caleb Hartigan",
  "Priya Mendel"
 ],
 "dispositions": [
  "No answer",
  "Left VM",
  "Not interested",
  "Callback",
  "Appointment set",
  "Wrong number",
  "DNC"
 ]
};
d.leads.forEach(function(l){l.createdAt=iso(l.createdMinutesAgo);l.lastContact=iso(l.lastContactMinutesAgo);l.history.forEach(function(h){h.at=iso(h.minutesAgo);});});
d.callbacks.forEach(function(c){c.dueAt=new Date(now+c.dueOffsetMin*M).toISOString();c.overdue=c.dueOffsetMin<0;});
d.stl.forEach(function(s){s.receivedAt=iso(s.minutesAgo);});
window.MARKETER_DATA=d;})();
