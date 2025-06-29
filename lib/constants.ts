
export type EditorBtns =
  | 'dynamicVideo'
  | 'dynamicText'
  | 'text'
  | 'container'
  | 'section'
  | 'link'
  | '2Col'
  | 'video'
  | '__body'
  | 'image'
  | null
  | '3Col'
  | 'inputText'
  | 'dynamicImage'
  | 'audio'
  | 'dynamicAudio'
  | 'checkbox'
  | 'dynamicCheckbox'
  | 'recordAudio'
  | 'recordVideo'
  | 'inputRecordAudio'
  | 'inputRecordVideo'
  | 'Upload'
  | 'dynamicUpload'
  | 'dynamicCarousel'
  | 'UploadInput'
  | 'dynamicImageAnnotation'

export const defaultStyles: React.CSSProperties = {
  backgroundPosition: 'center',
  objectFit: 'cover',
  backgroundRepeat: 'no-repeat',
  textAlign: 'left',
  opacity: '100%',
}

export const elementDefaultStyles = {
  imageAnnotation: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    minHeight: '300px',
    width: '100%',
  },
}

export const defaultContent = JSON.stringify([
  {
    content: [],
    id: '__body',
    name: 'Body',
    styles: { backgroundColor: 'white' },
    type: '__body',
  },
]);

export function extractElementNames(content: any[]) {
  const elements: any[] = [];

  function extractContent(node: any) {
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(extractContent);
    } else if (node.name && node.content) {
      switch (node.type) {
        case 'inputText':
        case 'text':
        case 'dynamicText':
        case 'checkbox':
        case 'imageAnnotation':
          elements.push(node.name);
          break;
        default:
          return
      }
    }
  }
  extractContent(content[0]);
  return elements;
}

export const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'pending':
      return 'outline'
    case 'accepted':
      return 'default'
    case 'rejected':
      return 'destructive'
    case 'reassigned':
      return 'secondary'
    default:
      return 'default'
  }
}




export const locations = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo, Democratic Republic of the",
  "Congo, Republic of the",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "East Timor",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Korea, North",
  "Korea, South",
  "Kosovo",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
]

export const domains = [
  "General",
  "Coding",
  "Mathematics",
  "Statistics",
  "Engineering",
  "Medical",
  "Law",
  "Accounting",
  "Healthcare",
  "Finance",
  "Banking",
  "Politics",
]

export const languages = [
  "English",
  "Catalan",
  "Galician",
  "Malay",
  "Mandarin Chinese",
  "Hindi",
  "Spanish",
  "French",
  "Standard Arabic",
  "Bengali",
  "Russian",
  "Portuguese",
  "Indonesian",
  "Urdu",
  "Hausa",
  "Yoruba",
  "Igbo",
  "Burmese",
  "German",
  "Japanese",
  "Swahili",
  "Marathi",
  "Telugu",
  "Turkish",
  "Tamil",
  "Vietnamese",
  "Italian",
  "Korean",
  "Western Punjabi",
  "Gujarati",
  "Kannada",
  "Polish",
  "Burmese",
  "Ukrainian",
  "Persian",
  "Malayalam",
  "Sinhala",
  "Hausa",
  "Thai",
  "Amharic",
  "Dutch",
  "Yoruba",
  "Odia",
  "Igbo",
  "Maithili",
  "Uzbek",
  "Tagalog",
  "Farsi",
  "Sundanese",
  "Romanian",
  "Javanese",
  "Azerbaijani",
  "Hungarian",
  "Chhattisgarhi",
  "Kurdish",
  "Kinyarwanda",
  "Zulu",
  "Czech",
  "Pashto",
  "Cebuano",
  "Greek",
  "Malagasy",
  "Assamese",
  "Somali",
  "Shona",
  "Serbo-Croatian",
  "Bavarian",
  "Min Nan",
  "Haitian Creole",
  "Belarusian",
  "Khmer",
  "Lithuanian",
  "Armenian",
  "Albanian",
  "Croatian",
  "Finnish",
  "Czech",
  "Latvian",
  "Bosnian",
  "Georgian",
  "Mongolian",
  "Macedonian",
  "Norwegian",
  "Aymara",
  "Bulgarian",
  "Nepali",
  "Kinyarwanda",
  "Danish",
  "Slovak",
  "Akan",
  "Luxembourgish",
  "Maltese",
  "Icelandic",
  "Greenlandic",
  "Basque",
  "Estonian",
  "Kashmiri",
  "Corsican",
  "Breton",
  "Samoan",
  "Galician",
  "Faroese",
  "Irish",
]

// Payment methods
export const PAYMENT_METHODS = [
  'card', 'us_bank_account', 'sepa_debit', 'ideal', 'link', 'giropay',
  'bacs_debit', 'acss_debit', 'au_becs_debit', 'other'
]

export const SUPPORTED_COUNTRIES = [
  // North America
  'US', 'CA', 'MX',

  // Europe 
  'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'AT', 'BE', 'CH', 'NO', 'SE', 'DK',
  'FI', 'IE', 'PT', 'PL', 'CZ', 'GR', 'HU', 'RO', 'BG', 'HR', 'SK', 'SI',
  'EE', 'LV', 'LT', 'LU', 'MT', 'CY', 'IS',

  // Asia Pacific
  'HK', 'TH'
]

// Supported currencies
export const SUPPORTED_CURRENCIES = [
  'usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'sgd', 'hkd', 'nzd', 'myr',
  'thb', 'mxn', 'brl', 'inr', 'aed', 'chf', 'nok', 'dkk', 'sek', 'pln',
  'czk', 'huf', 'ron', 'bgn', 'hrk', 'isk',
  'php', 'sar', 'egp', 'try', 'ars', 'ngn', 'kes', 'zar'
] as const;

export const PREDEFINED_OPTIONS = {
  Countries: [
    "Afghanistan", "Albania", "Algeria", "Angola", "Anguilla", "Antarctica",
    "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
    "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus",
    "Belgium", "Belize", "Benin", "Bolivia", "Bosnia and Herzegovina",
    "Botswana", "Brazil", "British Indian Ocean Territory", "Brunei",
    "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada",
    "Cape Verde", "Chad", "Chile", "China", "Colombia",
    "Congo (Democratic Republic of the)", "Costa Rica", "Croatia", "Cuba",
    "Curaçao", "Cyprus", "Czech Republic", "Dominica", "Dominican Republic",
    "Ecuador", "Egypt", "El Salvador", "Eritrea", "Estonia", "Eswatini",
    "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia",
    "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guernsey",
    "Guinea", "Guyana", "Haiti", "Heard Island and McDonald Islands",
    "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia",
    "Iran", "Iraq", "Ireland", "Ireland {Republic}", "Israel", "Italy",
    "Ivory Coast", "Jamaica", "Japan", "Jersey", "Jordan", "Kazakhstan",
    "Kenya", "Korea (South)", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos",
    "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein",
    "Lithuania", "Luxembourg", "Macao", "Macedonia", "Madagascar", "Malawi",
    "Malaysia", "Maldives", "Mali", "Malta", "Mauritania", "Mauritius",
    "Mexico", "Moldova", "Mongolia", "Montenegro", "Morocco", "Mozambique",
    "Myanmar", "Myanmar, {Burma}", "Namibia", "Nepal", "Netherlands",
    "New Caledonia", "New Zealand", "Nicaragua", "Nigeria", "Niue",
    "Norfolk Island", "Northern Mariana Islands", "Norway", "Oman",
    "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea",
    "Paraguay", "Peru", "Philippines", "Pitcairn Islands", "Poland",
    "Portugal", "Puerto Rico", "Romania", "Russia", "Russian Federation",
    "Rwanda", "Saint Barthélemy", "Saint Lucia",
    "Saint Vincent & the Grenadines", "San Marino", "Saudi Arabia",
    "Senegal", "Serbia", "Sierra Leone", "Singapore", "Slovakia",
    "Slovenia", "Solomon Islands", "Somalia", "South Africa",
    "South Georgia and the South Sandwich Islands", "South Sudan", "Spain",
    "Sri Lanka", "St Lucia", "Sudan", "Suriname", "Swaziland", "Sweden",
    "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand",
    "Togo", "Trinidad & Tobago", "Tunisia", "Turkey", "Turkmenistan",
    "Uganda", "Ukraine", "Ukraine (Other)", "United Arab Emirates",
    "United Kingdom - England", "United Kingdom - Northern Ireland",
    "United Kingdom - Scotland", "United Kingdom - Wales", "United States",
    "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Yemen",
    "Zambia", "Zimbabwe"
  ],

  "Country Codes": [
    "Afghanistan +93", "Albania +355", "Algeria +213", "American Samoa +1684",
    "Andorra +376", "Angola +244", "Anguilla +1264", "Antarctica +672",
    "Antigua and Barbuda +1268", "Argentina +54", "Armenia +374", "Aruba +297",
    "Australia +61", "Austria +43", "Azerbaijan +994", "Bahamas +1242",
    "Bahrain +973", "Bangladesh +880", "Barbados +1246", "Belarus +375",
    "Belgium +32", "Belize +501", "Benin +229", "Bermuda +1441",
    "Bhutan +975", "Bolivia +591", "Bosnia and Herzegovina +387",
    "Botswana +267", "Brazil +55", "British Indian Ocean Territory +246",
    "British Virgin Islands +1284", "Brunei +673", "Bulgaria +359",
    "Burkina Faso +226", "Burundi +257", "Cambodia +855", "Cameroon +237",
    "Canada +1", "Cape Verde +238", "Cayman Islands +1345",
    "Central African Republic +236", "Chad +235", "Chile +56", "China +86",
    "Christmas Island +61", "Cocos Islands +61", "Colombia +57",
    "Comoros +269", "Cook Islands +682", "Costa Rica +506", "Croatia +385",
    "Cuba +53", "Curacao +599", "Cyprus +357", "Czech Republic +420",
    "Democratic Republic of the Congo +243", "Denmark +45", "Djibouti +253",
    "Dominica +1767", "Dominican Republic +1809", "Dominican Republic +1829",
    "Dominican Republic +1849", "East Timor +670", "Ecuador +593",
    "Egypt +20", "El Salvador +503", "Equatorial Guinea +240", "Eritrea +291",
    "Estonia +372", "Ethiopia +251", "Falkland Islands +500",
    "Faroe Islands +298", "Fiji +679", "Finland +358", "France +33",
    "French Polynesia +689", "Gabon +241", "Gambia +220", "Georgia +995",
    "Germany +49", "Ghana +233", "Gibraltar +350", "Greece +30",
    "Greenland +299", "Grenada +1473", "Guam +1671", "Guatemala +502",
    "Guernsey +441481", "Guinea +224", "Guinea-Bissau +245", "Guyana +592",
    "Haiti +509", "Honduras +504", "Hong Kong +852", "Hungary +36",
    "Iceland +354", "India +91", "Indonesia +62", "Iran +98", "Iraq +964",
    "Ireland +353", "Isle of Man +441624", "Israel +972", "Italy +39",
    "Ivory Coast +225", "Jamaica +1876", "Japan +81", "Jersey +441534",
    "Jordan +962", "Kazakhstan +7", "Kenya +254", "Kiribati +686",
    "Kosovo +383", "Kuwait +965", "Kyrgyzstan +996", "Laos +856",
    "Latvia +371", "Lebanon +961", "Lesotho +266", "Liberia +231",
    "Libya +218", "Liechtenstein +423", "Lithuania +370", "Luxembourg +352",
    "Macau +853", "Macedonia +389", "Madagascar +261", "Malawi +265",
    "Malaysia +60", "Maldives +960", "Mali +223", "Malta +356",
    "Marshall Islands +692", "Mauritania +222", "Mauritius +230",
    "Mayotte +262", "Mexico +52", "Micronesia +691", "Moldova +373",
    "Monaco +377", "Mongolia +976", "Montenegro +382", "Montserrat +1664",
    "Morocco +212", "Mozambique +258", "Myanmar +95", "Namibia +264",
    "Nauru +674", "Nepal +977", "Netherlands +31", "Netherlands Antilles +599",
    "New Caledonia +687", "New Zealand +64", "Nicaragua +505", "Niger +227",
    "Nigeria +234", "Niue +683", "North Korea +850",
    "Northern Mariana Islands +1670", "Norway +47", "Oman +968",
    "Pakistan +92", "Palau +680", "Palestine +970", "Panama +507",
    "Papua New Guinea +675", "Paraguay +595", "Peru +51", "Philippines +63",
    "Pitcairn +64", "Poland +48", "Portugal +351", "Puerto Rico +1787",
    "Puerto Rico +1939", "Qatar +974", "Republic of the Congo +242",
    "Reunion +262", "Romania +40", "Russia +7", "Rwanda +250",
    "Saint Barthelemy +590", "Saint Helena +290", "Saint Kitts and Nevis +1869",
    "Saint Lucia +1758", "Saint Martin +590", "Saint Pierre and Miquelon +508",
    "Saint Vincent and the Grenadines +1784", "Samoa +685", "San Marino +378",
    "Sao Tome and Principe +239", "Saudi Arabia +966", "Senegal +221",
    "Serbia +381", "Seychelles +248", "Sierra Leone +232", "Singapore +65",
    "Sint Maarten +1721", "Slovakia +421", "Slovenia +386",
    "Solomon Islands +677", "Somalia +252", "South Africa +27",
    "South Korea +82", "South Sudan +211", "Spain +34", "Sri Lanka +94",
    "Sudan +249", "Suriname +597", "Svalbard and Jan Mayen +47",
    "Swaziland +268", "Sweden +46", "Switzerland +41", "Syria +963",
    "Taiwan +886", "Tajikistan +992", "Tanzania +255", "Thailand +66",
    "Togo +228", "Tokelau +690", "Tonga +676", "Trinidad and Tobago +1868",
    "Tunisia +216", "Turkey +90", "Turkmenistan +993",
    "Turks and Caicos Islands +1649", "Tuvalu +688", "U.S. Virgin Islands +1340",
    "Uganda +256", "Ukraine +380", "United Arab Emirates +971",
    "United Kingdom +44", "United States +1", "Uruguay +598",
    "Uzbekistan +998", "Vanuatu +678", "Vatican +379", "Venezuela +58",
    "Vietnam +84", "Wallis and Futuna +681", "Western Sahara +212",
    "Yemen +967", "Zambia +260", "Zimbabwe +263"
  ],

  "Field of Expertise": [
    "IT and Software", "Finance", "Marketing", "Lifestyle and Hobbies",
    "Economics", "Environment", "Public Sector", "Medical", "Technical",
    "Legal", "Education", "Arts and Culture"
  ],

  LanguageVariant: [
    "Acehnese Indonesia", "Afrikaans South Africa", "Ahom India",
    "Albanian Albania", "Alemannic Germany", "Amharic Ethiopia",
    "Arabic Modern Standard", "Arabic Saudi Arabia", "Armenian Armenia",
    "Assamese India", "Azerbaijani Azerbaijan", "Bagheli Devanagari",
    "Balinese Indonesia", "Baluchi Pakistan", "Bambara Mali", "Banjar Indonesia",
    "Basque Spain", "Batak Toba Indonesia", "Belarusian Cyrillic",
    "Bemba Zambia", "Bengali Bangladesh", "Betawi Indonesia",
    "Bhojpuri Devanagari", "Bodo Bengali", "Boro India",
    "Bosnian Bosnia and Herzegovina", "Bosnian Latin", "Buginese Indonesia",
    "Bulgarian Bulgaria", "Burmese Myanmar", "Cantonese Simplified",
    "Cantonese Traditional", "Catalan Spain", "Cebuano Philippines",
    "Central Malay Indonesia", "Chewa Malawi", "Chinese Simplified",
    "Chinese Traditional", "Croatian Croatia", "Czech Czech Republic",
    "Dogri India", "Dutch Netherlands", "Dyula Burkina Faso",
    "English Australia", "English United Kingdom - England",
    "English United States", "Esperanto", "Estonian Estonia", "Ewe Ghana",
    "Filipino Philippines", "Finnish Finland", "French Canada", "French France",
    "Fulah Burkina Faso", "Galician Spain", "Gan Traditional", "Ganda Uganda",
    "Garhwali Devanagari", "Georgian Georgia", "German Germany", "Greek Greece",
    "Gujarati India", "Haitian Haiti", "Haryanvi Devanagari", "Hausa Nigeria",
    "Hebrew Hebrew", "Hiligaynon Philippines", "Hindi India", "Hungarian Hungary",
    "Icelandic Iceland", "Igbo Nigeria", "Ilocano Philippines",
    "Indonesian Indonesia", "Iraqi Iraq", "Irish Gaelic", "Italian Italy",
    "Japanese Japan", "Javanese Indonesia", "Kachchi Gujarati", "Kannada India",
    "Kapampangan Philippines", "Kashmiri India", "Kazakh Cyrillic",
    "Kazakh Kazakhstan", "Khmer Cambodia", "Kikuyu Kenya", "Kinyarwanda Rwanda",
    "Kirghiz Cyrillic", "Kirundi Burundi", "Kok Borok Bengali",
    "Kongo Congo (Democratic Republic of the)", "Konkani India",
    "Korean Korea (South)", "Lao Laos", "Latin Latin", "Latvian Latvia",
    "Lithuanian Lithuania", "Luba Congo (Democratic Republic of the)",
    "Luxembourgish Luxembourg", "Macedonian North Macedonia",
    "Maithili Devanagari", "Maithili Nepal", "Malagasy Madagascar",
    "Malay Latin", "Malayalam India", "Maltese Malta", "Mandarin China",
    "Maori New Zealand", "Marathi India", "Marwadi India", "Marwari Devanagari",
    "Meitei India", "Mesopotamian Arabic", "Minangkabau Indonesia",
    "Mongolian Cyrillic", "Mongolian Mongolia", "Montenegrin Montenegro",
    "Mooré Burkina Faso", "Nepali Devanagari", "Nepali Nepal",
    "Nigerian Fulfulde Nigeria", "Nigerian Pidgin Nigeria",
    "Northern Sotho South Africa", "Norwegian Norway", "Odia India",
    "Oromo Ethiopia", "Pangasinan Philippines", "Pashto Pakistan",
    "Persian Iran", "Polish Poland", "Portuguese Brazil", "Portuguese Portugal",
    "Punjabi Gurmukhi", "Punjabi India", "Rajasthani Devanagari",
    "Rangpuri Bengali", "Romanian Romania", "Russian Latin", "Russian Russia",
    "Samoan Samoa", "Saraiki Pakistan", "Serbian Serbia", "Sesotho South Africa",
    "Shona Zimbabwe", "Sindhi Arabic", "Sindhi Devanagari", "Sindhi India",
    "Sinhalese Sri Lanka", "Slovak Slovak Republic", "Slovenian Latin",
    "Slovenian Slovenia", "Somali Somalia", "Sorani Latin", "Spanish Argentina",
    "Spanish Latin", "Spanish Spain", "Sunda Indonesia", "Swahili Kenya",
    "Swedish Sweden", "Sylheti Bengali", "Tagalog Philippines",
    "Tajik Uzbekistan", "Tamil India", "Telugu India", "Thai Thai",
    "Tibetan Tibetan", "Tigrinya Ethiopia", "Tswana Botswana", "Turkish Turkey",
    "Turkmen Turkmenistan", "Uighur Arabic", "Ukrainian Ukraine (Other)",
    "Urdu Arabic", "Urdu Pakistan", "Uzbek Uzbekistan", "Vietnamese Vietnam",
    "Wagdi Devanagari", "Waray Philippines", "Welsh United Kingdom - Wales",
    "Wolof Senegal", "Xhosa South Africa", "Yiddish", "Yoruba Nigeria",
    "Zulu South Africa"
  ]
};

// Helper function to get options by reference tab
export const getOptionsByReferenceTab = (referenceTab: string): string[] => {
  return PREDEFINED_OPTIONS[referenceTab as keyof typeof PREDEFINED_OPTIONS] || [];
};

// Helper function to get all available reference tabs
export const getAvailableReferenceTabs = (): string[] => {
  return Object.keys(PREDEFINED_OPTIONS);
};

export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number];
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];