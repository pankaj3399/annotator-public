
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

export const defaultStyles: React.CSSProperties = {
  backgroundPosition: 'center',
  objectFit: 'cover',
  backgroundRepeat: 'no-repeat',
  textAlign: 'left',
  opacity: '100%',
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
        // case 'dynamicVideo':
        // case 'dynamicImage':
        // case 'dynamicAudio':
        // case 'recordAudio':
        // case 'recordVideo':
        // case 'inputRecordAudio':
        // case 'inputRecordVideo':
        case 'checkbox':
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