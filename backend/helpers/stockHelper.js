const marketData = require("../marketData");

const NIFTY500_SYMBOLS = [
  // INDICES — View Only
  { symbol: "^NSEI", companyName: "NIFTY 50", sector: "Index" },
  { symbol: "^BSESN", companyName: "SENSEX", sector: "Index" },
  { symbol: "^NSEBANK", companyName: "BANK NIFTY", sector: "Index" },
  { symbol: "^CNXIT", companyName: "NIFTY IT", sector: "Index" },
  { symbol: "^NSMIDCP", companyName: "NIFTY MIDCAP 100", sector: "Index" },
  { symbol: "^CNXSMCAP", companyName: "NIFTY SMALLCAP", sector: "Index" },
  { symbol: "^CNXAUTO", companyName: "NIFTY AUTO", sector: "Index" },
  { symbol: "^CNXPHARMA", companyName: "NIFTY PHARMA", sector: "Index" },
  { symbol: "^CNXFMCG", companyName: "NIFTY FMCG", sector: "Index" },
  { symbol: "^CNXMETAL", companyName: "NIFTY METAL", sector: "Index" },
  { symbol: "^CNXREALTY", companyName: "NIFTY REALTY", sector: "Index" },
  { symbol: "^CNXENERGY", companyName: "NIFTY ENERGY", sector: "Index" },
  { symbol: "^CNXFINANCE", companyName: "NIFTY FINANCE", sector: "Index" },
  { symbol: "^CNXPSUBANK", companyName: "NIFTY PSU BANK", sector: "Index" },
  { symbol: "^CNXINFRA", companyName: "NIFTY INFRA", sector: "Index" },

  // NIFTY 50
  { symbol: "RELIANCE", companyName: "Reliance Industries", sector: "Energy" },
  { symbol: "TCS", companyName: "Tata Consultancy Services", sector: "IT" },
  { symbol: "HDFCBANK", companyName: "HDFC Bank", sector: "Banking" },
  { symbol: "INFY", companyName: "Infosys", sector: "IT" },
  { symbol: "ICICIBANK", companyName: "ICICI Bank", sector: "Banking" },
  { symbol: "HINDUNILVR", companyName: "Hindustan Unilever", sector: "FMCG" },
  { symbol: "ITC", companyName: "ITC Limited", sector: "FMCG" },
  { symbol: "SBIN", companyName: "State Bank of India", sector: "Banking" },
  { symbol: "BHARTIARTL", companyName: "Bharti Airtel", sector: "Telecom" },
  {
    symbol: "KOTAKBANK",
    companyName: "Kotak Mahindra Bank",
    sector: "Banking",
  },
  { symbol: "LT", companyName: "Larsen & Toubro", sector: "Infrastructure" },
  { symbol: "AXISBANK", companyName: "Axis Bank", sector: "Banking" },
  { symbol: "ASIANPAINT", companyName: "Asian Paints", sector: "Consumer" },
  { symbol: "MARUTI", companyName: "Maruti Suzuki", sector: "Auto" },
  { symbol: "TITAN", companyName: "Titan Company", sector: "Consumer" },
  { symbol: "SUNPHARMA", companyName: "Sun Pharmaceutical", sector: "Pharma" },
  { symbol: "WIPRO", companyName: "Wipro", sector: "IT" },
  { symbol: "ULTRACEMCO", companyName: "UltraTech Cement", sector: "Cement" },
  { symbol: "BAJFINANCE", companyName: "Bajaj Finance", sector: "Finance" },
  { symbol: "NESTLEIND", companyName: "Nestle India", sector: "FMCG" },
  {
    symbol: "POWERGRID",
    companyName: "Power Grid Corporation",
    sector: "Power",
  },
  { symbol: "NTPC", companyName: "NTPC Limited", sector: "Power" },
  { symbol: "TECHM", companyName: "Tech Mahindra", sector: "IT" },
  { symbol: "HCLTECH", companyName: "HCL Technologies", sector: "IT" },
  { symbol: "TATAMOTORS", companyName: "Tata Motors", sector: "Auto" },
  { symbol: "TATASTEEL", companyName: "Tata Steel", sector: "Metal" },
  {
    symbol: "ADANIENT",
    companyName: "Adani Enterprises",
    sector: "Conglomerate",
  },
  {
    symbol: "ADANIPORTS",
    companyName: "Adani Ports",
    sector: "Infrastructure",
  },
  { symbol: "COALINDIA", companyName: "Coal India", sector: "Energy" },
  { symbol: "BAJAJFINSV", companyName: "Bajaj Finserv", sector: "Finance" },
  {
    symbol: "DRREDDY",
    companyName: "Dr. Reddy's Laboratories",
    sector: "Pharma",
  },
  { symbol: "EICHERMOT", companyName: "Eicher Motors", sector: "Auto" },
  { symbol: "GRASIM", companyName: "Grasim Industries", sector: "Cement" },
  { symbol: "HEROMOTOCO", companyName: "Hero MotoCorp", sector: "Auto" },
  { symbol: "HINDALCO", companyName: "Hindalco Industries", sector: "Metal" },
  { symbol: "INDUSINDBK", companyName: "IndusInd Bank", sector: "Banking" },
  { symbol: "JSWSTEEL", companyName: "JSW Steel", sector: "Metal" },
  { symbol: "M&M", companyName: "Mahindra & Mahindra", sector: "Auto" },
  {
    symbol: "ONGC",
    companyName: "Oil & Natural Gas Corporation",
    sector: "Energy",
  },
  { symbol: "SBILIFE", companyName: "SBI Life Insurance", sector: "Insurance" },
  {
    symbol: "TATACONSUM",
    companyName: "Tata Consumer Products",
    sector: "FMCG",
  },
  {
    symbol: "APOLLOHOSP",
    companyName: "Apollo Hospitals",
    sector: "Healthcare",
  },
  { symbol: "BAJAJ-AUTO", companyName: "Bajaj Auto", sector: "Auto" },
  { symbol: "BPCL", companyName: "Bharat Petroleum", sector: "Energy" },
  { symbol: "BRITANNIA", companyName: "Britannia Industries", sector: "FMCG" },
  { symbol: "CIPLA", companyName: "Cipla", sector: "Pharma" },
  { symbol: "DIVISLAB", companyName: "Divi's Laboratories", sector: "Pharma" },
  {
    symbol: "HDFCLIFE",
    companyName: "HDFC Life Insurance",
    sector: "Insurance",
  },
  { symbol: "UPL", companyName: "UPL Limited", sector: "Chemicals" },
  { symbol: "SHRIRAMFIN", companyName: "Shriram Finance", sector: "Finance" },

  // NIFTY NEXT 50
  { symbol: "ABB", companyName: "ABB India", sector: "Capital Goods" },
  { symbol: "ADANIGREEN", companyName: "Adani Green Energy", sector: "Power" },
  { symbol: "AMBUJACEM", companyName: "Ambuja Cements", sector: "Cement" },
  { symbol: "AUROPHARMA", companyName: "Aurobindo Pharma", sector: "Pharma" },
  {
    symbol: "BALKRISIND",
    companyName: "Balkrishna Industries",
    sector: "Auto",
  },
  { symbol: "BANDHANBNK", companyName: "Bandhan Bank", sector: "Banking" },
  { symbol: "BERGEPAINT", companyName: "Berger Paints", sector: "Consumer" },
  { symbol: "BIOCON", companyName: "Biocon", sector: "Pharma" },
  { symbol: "BOSCHLTD", companyName: "Bosch", sector: "Auto" },
  { symbol: "CANBK", companyName: "Canara Bank", sector: "Banking" },
  {
    symbol: "CHOLAFIN",
    companyName: "Cholamandalam Investment",
    sector: "Finance",
  },
  { symbol: "COLPAL", companyName: "Colgate-Palmolive India", sector: "FMCG" },
  { symbol: "DABUR", companyName: "Dabur India", sector: "FMCG" },
  { symbol: "DLF", companyName: "DLF", sector: "Realty" },
  { symbol: "GAIL", companyName: "GAIL India", sector: "Energy" },
  {
    symbol: "GODREJCP",
    companyName: "Godrej Consumer Products",
    sector: "FMCG",
  },
  { symbol: "HAVELLS", companyName: "Havells India", sector: "Capital Goods" },
  {
    symbol: "ICICIGI",
    companyName: "ICICI Lombard General Insurance",
    sector: "Insurance",
  },
  {
    symbol: "ICICIPRULI",
    companyName: "ICICI Prudential Life Insurance",
    sector: "Insurance",
  },
  { symbol: "INDUSTOWER", companyName: "Indus Towers", sector: "Telecom" },
  {
    symbol: "IRCTC",
    companyName: "Indian Railway Catering",
    sector: "Infrastructure",
  },
  { symbol: "JUBLFOOD", companyName: "Jubilant FoodWorks", sector: "Consumer" },
  { symbol: "LUPIN", companyName: "Lupin", sector: "Pharma" },
  { symbol: "MARICO", companyName: "Marico", sector: "FMCG" },
  { symbol: "MUTHOOTFIN", companyName: "Muthoot Finance", sector: "Finance" },
  { symbol: "NAUKRI", companyName: "Info Edge India", sector: "IT" },
  { symbol: "PAGEIND", companyName: "Page Industries", sector: "Consumer" },
  {
    symbol: "PIDILITIND",
    companyName: "Pidilite Industries",
    sector: "Chemicals",
  },
  { symbol: "PIIND", companyName: "PI Industries", sector: "Chemicals" },
  { symbol: "PNB", companyName: "Punjab National Bank", sector: "Banking" },
  { symbol: "SAIL", companyName: "Steel Authority of India", sector: "Metal" },
  { symbol: "SIEMENS", companyName: "Siemens", sector: "Capital Goods" },
  { symbol: "SRF", companyName: "SRF", sector: "Chemicals" },
  {
    symbol: "TORNTPHARM",
    companyName: "Torrent Pharmaceuticals",
    sector: "Pharma",
  },
  { symbol: "TRENT", companyName: "Trent", sector: "Consumer" },
  { symbol: "VEDL", companyName: "Vedanta", sector: "Metal" },
  { symbol: "VOLTAS", companyName: "Voltas", sector: "Capital Goods" },
  {
    symbol: "ETERNAL",
    companyName: "Eternal Ltd (Zomato)",
    sector: "Consumer",
  },

  // NIFTY MIDCAP
  {
    symbol: "ABCAPITAL",
    companyName: "Aditya Birla Capital",
    sector: "Finance",
  },
  { symbol: "ABFRL", companyName: "Aditya Birla Fashion", sector: "Consumer" },
  { symbol: "ALKEM", companyName: "Alkem Laboratories", sector: "Pharma" },
  {
    symbol: "APLLTD",
    companyName: "Alembic Pharmaceuticals",
    sector: "Pharma",
  },
  { symbol: "ASTRAL", companyName: "Astral", sector: "Consumer" },
  { symbol: "ATUL", companyName: "Atul", sector: "Chemicals" },
  { symbol: "AUBANK", companyName: "AU Small Finance Bank", sector: "Banking" },
  { symbol: "BATAINDIA", companyName: "Bata India", sector: "Consumer" },
  { symbol: "BEL", companyName: "Bharat Electronics", sector: "Defence" },
  { symbol: "BHARATFORG", companyName: "Bharat Forge", sector: "Auto" },
  {
    symbol: "BHEL",
    companyName: "Bharat Heavy Electricals",
    sector: "Capital Goods",
  },
  { symbol: "CANFINHOME", companyName: "Can Fin Homes", sector: "Finance" },
  {
    symbol: "CARBORUNIV",
    companyName: "Carborundum Universal",
    sector: "Capital Goods",
  },
  {
    symbol: "CGPOWER",
    companyName: "CG Power and Industrial",
    sector: "Capital Goods",
  },
  {
    symbol: "CONCOR",
    companyName: "Container Corporation",
    sector: "Infrastructure",
  },
  {
    symbol: "CUMMINSIND",
    companyName: "Cummins India",
    sector: "Capital Goods",
  },
  { symbol: "DEEPAKNTR", companyName: "Deepak Nitrite", sector: "Chemicals" },
  { symbol: "DIXON", companyName: "Dixon Technologies", sector: "IT" },
  { symbol: "ESCORTS", companyName: "Escorts Kubota", sector: "Auto" },
  { symbol: "EXIDEIND", companyName: "Exide Industries", sector: "Auto" },
  { symbol: "FEDERALBNK", companyName: "Federal Bank", sector: "Banking" },
  {
    symbol: "FLUOROCHEM",
    companyName: "Gujarat Fluorochemicals",
    sector: "Chemicals",
  },
  { symbol: "FORTIS", companyName: "Fortis Healthcare", sector: "Healthcare" },
  {
    symbol: "GMRINFRA",
    companyName: "GMR Airports Infrastructure",
    sector: "Infrastructure",
  },
  { symbol: "GODREJPROP", companyName: "Godrej Properties", sector: "Realty" },
  { symbol: "GRANULES", companyName: "Granules India", sector: "Pharma" },
  {
    symbol: "HAPPSTMNDS",
    companyName: "Happiest Minds Technologies",
    sector: "IT",
  },
  { symbol: "IDFCFIRSTB", companyName: "IDFC First Bank", sector: "Banking" },
  { symbol: "IEX", companyName: "Indian Energy Exchange", sector: "Power" },
  { symbol: "IPCALAB", companyName: "IPCA Laboratories", sector: "Pharma" },
  { symbol: "JKCEMENT", companyName: "JK Cement", sector: "Cement" },
  { symbol: "JSWENERGY", companyName: "JSW Energy", sector: "Power" },
  { symbol: "KAJARIACER", companyName: "Kajaria Ceramics", sector: "Consumer" },
  { symbol: "KEI", companyName: "KEI Industries", sector: "Capital Goods" },
  { symbol: "KPITTECH", companyName: "KPIT Technologies", sector: "IT" },
  {
    symbol: "LICHSGFIN",
    companyName: "LIC Housing Finance",
    sector: "Finance",
  },
  { symbol: "LINDEINDIA", companyName: "Linde India", sector: "Chemicals" },
  { symbol: "LTIM", companyName: "LTIMindtree", sector: "IT" },
  { symbol: "LTTS", companyName: "L&T Technology Services", sector: "IT" },
  {
    symbol: "MANAPPURAM",
    companyName: "Manappuram Finance",
    sector: "Finance",
  },
  {
    symbol: "MAZDOCK",
    companyName: "Mazagon Dock Shipbuilders",
    sector: "Defence",
  },
  { symbol: "MCX", companyName: "Multi Commodity Exchange", sector: "Finance" },
  {
    symbol: "METROPOLIS",
    companyName: "Metropolis Healthcare",
    sector: "Healthcare",
  },
  {
    symbol: "MFSL",
    companyName: "Max Financial Services",
    sector: "Insurance",
  },
  { symbol: "MGL", companyName: "Mahanagar Gas", sector: "Energy" },
  { symbol: "MOTHERSON", companyName: "Samvardhana Motherson", sector: "Auto" },
  { symbol: "MPHASIS", companyName: "Mphasis", sector: "IT" },
  { symbol: "MRF", companyName: "MRF", sector: "Auto" },
  { symbol: "NATCOPHARM", companyName: "Natco Pharma", sector: "Pharma" },
  {
    symbol: "NAVINFLUOR",
    companyName: "Navin Fluorine International",
    sector: "Chemicals",
  },
  { symbol: "NBCC", companyName: "NBCC India", sector: "Infrastructure" },
  { symbol: "NCC", companyName: "NCC", sector: "Infrastructure" },
  { symbol: "NHPC", companyName: "NHPC", sector: "Power" },
  { symbol: "NMDC", companyName: "NMDC", sector: "Metal" },
  { symbol: "OBEROIRLTY", companyName: "Oberoi Realty", sector: "Realty" },
  { symbol: "OIL", companyName: "Oil India", sector: "Energy" },
  { symbol: "OFSS", companyName: "Oracle Financial Services", sector: "IT" },
  { symbol: "PATANJALI", companyName: "Patanjali Foods", sector: "FMCG" },
  { symbol: "PERSISTENT", companyName: "Persistent Systems", sector: "IT" },
  { symbol: "PETRONET", companyName: "Petronet LNG", sector: "Energy" },
  { symbol: "PHOENIXLTD", companyName: "Phoenix Mills", sector: "Realty" },
  { symbol: "POLYCAB", companyName: "Polycab India", sector: "Capital Goods" },
  {
    symbol: "POONAWALLA",
    companyName: "Poonawalla Fincorp",
    sector: "Finance",
  },
  { symbol: "PRESTIGE", companyName: "Prestige Estates", sector: "Realty" },
  { symbol: "SCHAEFFLER", companyName: "Schaeffler India", sector: "Auto" },
  { symbol: "SJVN", companyName: "SJVN", sector: "Power" },
  { symbol: "SOBHA", companyName: "Sobha", sector: "Realty" },
  { symbol: "SONACOMS", companyName: "Sona BLW Precision", sector: "Auto" },
  {
    symbol: "STARHEALTH",
    companyName: "Star Health Insurance",
    sector: "Insurance",
  },
  { symbol: "SUNDARMFIN", companyName: "Sundaram Finance", sector: "Finance" },
  {
    symbol: "SUPREMEIND",
    companyName: "Supreme Industries",
    sector: "Consumer",
  },
  { symbol: "SYNGENE", companyName: "Syngene International", sector: "Pharma" },
  { symbol: "TANLA", companyName: "Tanla Platforms", sector: "IT" },
  { symbol: "TATACHEM", companyName: "Tata Chemicals", sector: "Chemicals" },
  { symbol: "TATACOMM", companyName: "Tata Communications", sector: "Telecom" },
  { symbol: "TATAELXSI", companyName: "Tata Elxsi", sector: "IT" },
  { symbol: "TATAPOWER", companyName: "Tata Power", sector: "Power" },
  { symbol: "TATATECH", companyName: "Tata Technologies", sector: "IT" },
  { symbol: "THERMAX", companyName: "Thermax", sector: "Capital Goods" },
  {
    symbol: "TIINDIA",
    companyName: "Tube Investments of India",
    sector: "Auto",
  },
  { symbol: "TVSMOTOR", companyName: "TVS Motor Company", sector: "Auto" },
  {
    symbol: "UNIONBANK",
    companyName: "Union Bank of India",
    sector: "Banking",
  },
  { symbol: "UTIAMC", companyName: "UTI Asset Management", sector: "Finance" },
  { symbol: "VBL", companyName: "Varun Beverages", sector: "FMCG" },
  { symbol: "VINATIORGA", companyName: "Vinati Organics", sector: "Chemicals" },
  { symbol: "ZYDUSLIFE", companyName: "Zydus Lifesciences", sector: "Pharma" },

  // PSU & GOVERNMENT
  { symbol: "HAL", companyName: "Hindustan Aeronautics", sector: "Defence" },
  { symbol: "BDL", companyName: "Bharat Dynamics", sector: "Defence" },
  { symbol: "COCHINSHIP", companyName: "Cochin Shipyard", sector: "Defence" },
  {
    symbol: "GRSE",
    companyName: "Garden Reach Shipbuilders",
    sector: "Defence",
  },
  { symbol: "MIDHANI", companyName: "Mishra Dhatu Nigam", sector: "Defence" },
  { symbol: "MOIL", companyName: "MOIL", sector: "Metal" },
  {
    symbol: "NALCO",
    companyName: "National Aluminium Company",
    sector: "Metal",
  },
  { symbol: "NFL", companyName: "National Fertilizers", sector: "Chemicals" },
  { symbol: "NLCINDIA", companyName: "NLC India", sector: "Power" },
  { symbol: "RVNL", companyName: "Rail Vikas Nigam", sector: "Infrastructure" },
  {
    symbol: "IRCON",
    companyName: "IRCON International",
    sector: "Infrastructure",
  },
  {
    symbol: "KPIL",
    companyName: "Kalpataru Projects",
    sector: "Infrastructure",
  },
  {
    symbol: "PNCINFRA",
    companyName: "PNC Infratech",
    sector: "Infrastructure",
  },
  { symbol: "RECLTD", companyName: "REC Limited", sector: "Finance" },
  {
    symbol: "PFC",
    companyName: "Power Finance Corporation",
    sector: "Finance",
  },
  { symbol: "IRFC", companyName: "Indian Railway Finance", sector: "Finance" },
  { symbol: "BANKBARODA", companyName: "Bank of Baroda", sector: "Banking" },
  {
    symbol: "BANKOFMAHA",
    companyName: "Bank of Maharashtra",
    sector: "Banking",
  },
  {
    symbol: "CENTRALBK",
    companyName: "Central Bank of India",
    sector: "Banking",
  },
  { symbol: "IOB", companyName: "Indian Overseas Bank", sector: "Banking" },
  { symbol: "UCOBANK", companyName: "UCO Bank", sector: "Banking" },
  { symbol: "INDIANB", companyName: "Indian Bank", sector: "Banking" },
  { symbol: "CESC", companyName: "CESC", sector: "Power" },
  { symbol: "TORNTPOWER", companyName: "Torrent Power", sector: "Power" },
  { symbol: "ADANIPOWER", companyName: "Adani Power", sector: "Power" },
  {
    symbol: "JSWINFRA",
    companyName: "JSW Infrastructure",
    sector: "Infrastructure",
  },
  {
    symbol: "GPPL",
    companyName: "Gujarat Pipavav Port",
    sector: "Infrastructure",
  },
  {
    symbol: "TITAGARH",
    companyName: "Titagarh Rail Systems",
    sector: "Capital Goods",
  },

  // NEW AGE & TECH
  {
    symbol: "NYKAA",
    companyName: "FSN E-Commerce (Nykaa)",
    sector: "Consumer",
  },
  { symbol: "DELHIVERY", companyName: "Delhivery", sector: "Infrastructure" },
  {
    symbol: "PAYTM",
    companyName: "One97 Communications (Paytm)",
    sector: "Finance",
  },
  {
    symbol: "POLICYBZR",
    companyName: "PB Fintech (PolicyBazaar)",
    sector: "Insurance",
  },
  { symbol: "IDEA", companyName: "Vodafone Idea", sector: "Telecom" },
  { symbol: "YESBANK", companyName: "Yes Bank", sector: "Banking" },
  { symbol: "SUZLON", companyName: "Suzlon Energy", sector: "Power" },
  { symbol: "RPOWER", companyName: "Reliance Power", sector: "Power" },
  {
    symbol: "IRB",
    companyName: "IRB Infrastructure",
    sector: "Infrastructure",
  },
  { symbol: "CYIENT", companyName: "Cyient", sector: "IT" },
  { symbol: "MASTEK", companyName: "Mastek", sector: "IT" },
  { symbol: "COFORGE", companyName: "Coforge", sector: "IT" },
  { symbol: "ZENSAR", companyName: "Zensar Technologies", sector: "IT" },
  {
    symbol: "RATEGAIN",
    companyName: "RateGain Travel Technologies",
    sector: "IT",
  },
  {
    symbol: "MAPMYINDIA",
    companyName: "CE Info Systems (MapMyIndia)",
    sector: "IT",
  },
  { symbol: "INTELLECT", companyName: "Intellect Design Arena", sector: "IT" },
  { symbol: "NEWGEN", companyName: "Newgen Software", sector: "IT" },
  { symbol: "KFINTECH", companyName: "KFin Technologies", sector: "Finance" },
  { symbol: "CAMS", companyName: "Computer Age Management", sector: "Finance" },
  { symbol: "BSE", companyName: "BSE", sector: "Finance" },
  {
    symbol: "CDSL",
    companyName: "Central Depository Services",
    sector: "Finance",
  },
  { symbol: "ANGELONE", companyName: "Angel One", sector: "Finance" },
  { symbol: "IIFL", companyName: "IIFL Finance", sector: "Finance" },
  {
    symbol: "MOTILALOFS",
    companyName: "Motilal Oswal Financial",
    sector: "Finance",
  },
  { symbol: "360ONE", companyName: "360 ONE WAM", sector: "Finance" },

  // CONSUMER & RETAIL
  { symbol: "KALYANKJIL", companyName: "Kalyan Jewellers", sector: "Consumer" },
  { symbol: "SENCO", companyName: "Senco Gold", sector: "Consumer" },
  { symbol: "INDHOTEL", companyName: "Indian Hotels", sector: "Consumer" },
  { symbol: "LEMONTREE", companyName: "Lemon Tree Hotels", sector: "Consumer" },
  { symbol: "CHALET", companyName: "Chalet Hotels", sector: "Consumer" },
  { symbol: "WESTLIFE", companyName: "Westlife Foodworld", sector: "Consumer" },
  {
    symbol: "DEVYANI",
    companyName: "Devyani International",
    sector: "Consumer",
  },
  {
    symbol: "SAPPHIRE",
    companyName: "Sapphire Foods India",
    sector: "Consumer",
  },
  { symbol: "JKPAPER", companyName: "JK Paper", sector: "Consumer" },

  // PHARMA & HEALTHCARE
  { symbol: "MANKIND", companyName: "Mankind Pharma", sector: "Pharma" },
  { symbol: "JBCHEPHARM", companyName: "JB Chemicals", sector: "Pharma" },
  { symbol: "ERIS", companyName: "Eris Lifesciences", sector: "Pharma" },
  {
    symbol: "GLENMARK",
    companyName: "Glenmark Pharmaceuticals",
    sector: "Pharma",
  },
  {
    symbol: "LALPATHLAB",
    companyName: "Dr. Lal PathLabs",
    sector: "Healthcare",
  },
  {
    symbol: "THYROCARE",
    companyName: "Thyrocare Technologies",
    sector: "Healthcare",
  },
  {
    symbol: "MEDANTA",
    companyName: "Global Health (Medanta)",
    sector: "Healthcare",
  },
  { symbol: "ASTER", companyName: "Aster DM Healthcare", sector: "Healthcare" },
  { symbol: "MAXHEALTH", companyName: "Max Healthcare", sector: "Healthcare" },
  {
    symbol: "RAINBOW",
    companyName: "Rainbow Children's Medicare",
    sector: "Healthcare",
  },

  // AUTO & MANUFACTURING
  {
    symbol: "ENDURANCE",
    companyName: "Endurance Technologies",
    sector: "Auto",
  },
  { symbol: "CRAFTSMAN", companyName: "Craftsman Automation", sector: "Auto" },
  { symbol: "MINDAIND", companyName: "UNO Minda", sector: "Auto" },
  { symbol: "SUPRAJIT", companyName: "Suprajit Engineering", sector: "Auto" },
  { symbol: "SSWL", companyName: "Steel Strips Wheels", sector: "Auto" },
];

const formatMarketCap = (value) => {
  if (!value) return null;
  if (value >= 1_00_00_00_00_000)
    return `₹${(value / 1_00_00_00_00_000).toFixed(2)}L Cr`;
  if (value >= 1_00_00_00_000)
    return `₹${(value / 1_00_00_00_000).toFixed(2)}K Cr`;
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  return `₹${value.toLocaleString("en-IN")}`;
};

const INDICES_MAP = {
  "^NSEI": "NIFTY 50",
  "^BSESN": "SENSEX",
  "^NSEBANK": "BANK NIFTY",
  "^CNXIT": "NIFTY IT",
  "^NSMIDCP": "NIFTY MIDCAP 100",
  "^NSEMDCP50": "NIFTY MIDCAP 50",
  "^CNXSMCAP": "NIFTY SMALLCAP",
  "^CNXAUTO": "NIFTY AUTO",
  "^CNXPHARMA": "NIFTY PHARMA",
  "^CNXFMCG": "NIFTY FMCG",
  "^CNXMETAL": "NIFTY METAL",
  "^CNXREALTY": "NIFTY REALTY",
  "^CNXENERGY": "NIFTY ENERGY",
  "^CNXFINANCE": "NIFTY FINANCE",
  "^CNXPSUBANK": "NIFTY PSU BANK",
  "^CNXINFRA": "NIFTY INFRA",
};

// Adds the app's display name / sector to a provider quote
const decorateQuote = (quote) => {
  const { symbol } = quote;
  const isIndex = symbol.startsWith("^");
  const listed = NIFTY500_SYMBOLS.find((s) => s.symbol === symbol);

  return {
    symbol,
    companyName: isIndex
      ? INDICES_MAP[symbol] || symbol
      : listed?.companyName || quote.companyName || symbol,
    currentPrice: quote.currentPrice,
    previousClose: quote.previousClose,
    dayHigh: quote.dayHigh,
    dayLow: quote.dayLow,
    volume: quote.volume,
    change: quote.change,
    changePercent: quote.changePercent,
    weekHigh52: quote.weekHigh52,
    weekLow52: quote.weekLow52,
    marketCap: formatMarketCap(quote.marketCapRaw),
    marketCapRaw: quote.marketCapRaw,
    peRatio: quote.peRatio,
    upperCircuit: quote.upperCircuit,
    lowerCircuit: quote.lowerCircuit,
    sector: isIndex ? "Index" : listed?.sector || null,
  };
};

const getQuote = async (symbol) => {
  try {
    return decorateQuote(await marketData.getQuote(symbol));
  } catch (error) {
    throw new Error(`Failed to fetch quote for ${symbol}: ${error.message}`);
  }
};

// symbol → quote for many symbols in one request; failed symbols are left out
const getQuotes = async (symbols) => {
  const quotes = await marketData.getQuotes(symbols);
  const results = {};
  Object.entries(quotes).forEach(([symbol, quote]) => {
    results[symbol] = decorateQuote(quote);
  });
  return results;
};

const searchStock = async (query) => {
  try {
    return await marketData.search(query);
  } catch (error) {
    throw new Error(`Search failed: ${error.message}`);
  }
};

const getAllStocks = () => NIFTY500_SYMBOLS;

const getWatchlistQuotes = async (symbols) => {
  try {
    const promises = symbols.map((symbol) =>
      getQuote(symbol).catch(() => ({
        symbol,
        companyName:
          NIFTY500_SYMBOLS.find((s) => s.symbol === symbol)?.companyName ||
          INDICES_MAP[symbol] ||
          symbol,
        currentPrice: 0,
        previousClose: 0,
        dayHigh: 0,
        dayLow: 0,
        volume: 0,
        change: 0,
        changePercent: 0,
        weekHigh52: null,
        weekLow52: null,
        marketCap: null,
        peRatio: null,
      })),
    );
    return await Promise.all(promises);
  } catch (error) {
    throw new Error("Failed to fetch watchlist quotes: " + error.message);
  }
};

module.exports = {
  getQuote,
  getQuotes,
  getAllStocks,
  searchStock,
  getWatchlistQuotes,
  NIFTY500_SYMBOLS,
};
