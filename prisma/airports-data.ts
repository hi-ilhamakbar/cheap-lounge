/**
 * Airport reference data used for search autocomplete (name, city, country, IATA, timezone).
 * This is public airport information — it contains NO lounge data. Lounges always come from the
 * configured authorized LoungeKey source. Extend this list freely, or replace it with the partner
 * API's airport endpoint (the LoungeKey provider uses that automatically when configured).
 */
export type AirportSeed = { iata: string; name: string; city: string; country: string; timezone: string };

export const AIRPORTS: AirportSeed[] = [
  // Indonesia
  { iata: "CGK", name: "Soekarno-Hatta International Airport", city: "Jakarta", country: "Indonesia", timezone: "Asia/Jakarta" },
  { iata: "HLP", name: "Halim Perdanakusuma International Airport", city: "Jakarta", country: "Indonesia", timezone: "Asia/Jakarta" },
  { iata: "DPS", name: "I Gusti Ngurah Rai International Airport", city: "Denpasar (Bali)", country: "Indonesia", timezone: "Asia/Makassar" },
  { iata: "SUB", name: "Juanda International Airport", city: "Surabaya", country: "Indonesia", timezone: "Asia/Jakarta" },
  { iata: "KNO", name: "Kualanamu International Airport", city: "Medan", country: "Indonesia", timezone: "Asia/Jakarta" },
  { iata: "UPG", name: "Sultan Hasanuddin International Airport", city: "Makassar", country: "Indonesia", timezone: "Asia/Makassar" },
  { iata: "YIA", name: "Yogyakarta International Airport", city: "Yogyakarta", country: "Indonesia", timezone: "Asia/Jakarta" },
  { iata: "BPN", name: "Sultan Aji Muhammad Sulaiman Sepinggan Airport", city: "Balikpapan", country: "Indonesia", timezone: "Asia/Makassar" },
  { iata: "SRG", name: "Jenderal Ahmad Yani International Airport", city: "Semarang", country: "Indonesia", timezone: "Asia/Jakarta" },
  { iata: "PLM", name: "Sultan Mahmud Badaruddin II International Airport", city: "Palembang", country: "Indonesia", timezone: "Asia/Jakarta" },
  { iata: "BTH", name: "Hang Nadim International Airport", city: "Batam", country: "Indonesia", timezone: "Asia/Jakarta" },
  { iata: "PDG", name: "Minangkabau International Airport", city: "Padang", country: "Indonesia", timezone: "Asia/Jakarta" },
  { iata: "LOP", name: "Lombok International Airport", city: "Lombok", country: "Indonesia", timezone: "Asia/Makassar" },
  { iata: "KJT", name: "Kertajati International Airport", city: "Majalengka", country: "Indonesia", timezone: "Asia/Jakarta" },
  // Southeast Asia
  { iata: "SIN", name: "Singapore Changi Airport", city: "Singapore", country: "Singapore", timezone: "Asia/Singapore" },
  { iata: "KUL", name: "Kuala Lumpur International Airport", city: "Kuala Lumpur", country: "Malaysia", timezone: "Asia/Kuala_Lumpur" },
  { iata: "PEN", name: "Penang International Airport", city: "Penang", country: "Malaysia", timezone: "Asia/Kuala_Lumpur" },
  { iata: "BKI", name: "Kota Kinabalu International Airport", city: "Kota Kinabalu", country: "Malaysia", timezone: "Asia/Kuala_Lumpur" },
  { iata: "BKK", name: "Bangkok Suvarnabhumi Airport", city: "Bangkok", country: "Thailand", timezone: "Asia/Bangkok" },
  { iata: "DMK", name: "Don Mueang International Airport", city: "Bangkok", country: "Thailand", timezone: "Asia/Bangkok" },
  { iata: "HKT", name: "Phuket International Airport", city: "Phuket", country: "Thailand", timezone: "Asia/Bangkok" },
  { iata: "CNX", name: "Chiang Mai International Airport", city: "Chiang Mai", country: "Thailand", timezone: "Asia/Bangkok" },
  { iata: "MNL", name: "Ninoy Aquino International Airport", city: "Manila", country: "Philippines", timezone: "Asia/Manila" },
  { iata: "CEB", name: "Mactan-Cebu International Airport", city: "Cebu", country: "Philippines", timezone: "Asia/Manila" },
  { iata: "SGN", name: "Tan Son Nhat International Airport", city: "Ho Chi Minh City", country: "Vietnam", timezone: "Asia/Ho_Chi_Minh" },
  { iata: "HAN", name: "Noi Bai International Airport", city: "Hanoi", country: "Vietnam", timezone: "Asia/Ho_Chi_Minh" },
  { iata: "DAD", name: "Da Nang International Airport", city: "Da Nang", country: "Vietnam", timezone: "Asia/Ho_Chi_Minh" },
  // East Asia
  { iata: "HKG", name: "Hong Kong International Airport", city: "Hong Kong", country: "Hong Kong SAR", timezone: "Asia/Hong_Kong" },
  { iata: "TPE", name: "Taiwan Taoyuan International Airport", city: "Taipei", country: "Taiwan", timezone: "Asia/Taipei" },
  { iata: "NRT", name: "Narita International Airport", city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo" },
  { iata: "HND", name: "Tokyo Haneda Airport", city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo" },
  { iata: "KIX", name: "Kansai International Airport", city: "Osaka", country: "Japan", timezone: "Asia/Tokyo" },
  { iata: "ICN", name: "Incheon International Airport", city: "Seoul", country: "South Korea", timezone: "Asia/Seoul" },
  { iata: "PEK", name: "Beijing Capital International Airport", city: "Beijing", country: "China", timezone: "Asia/Shanghai" },
  { iata: "PVG", name: "Shanghai Pudong International Airport", city: "Shanghai", country: "China", timezone: "Asia/Shanghai" },
  { iata: "CAN", name: "Guangzhou Baiyun International Airport", city: "Guangzhou", country: "China", timezone: "Asia/Shanghai" },
  // South Asia / Middle East
  { iata: "DEL", name: "Indira Gandhi International Airport", city: "Delhi", country: "India", timezone: "Asia/Kolkata" },
  { iata: "BOM", name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", country: "India", timezone: "Asia/Kolkata" },
  { iata: "DXB", name: "Dubai International Airport", city: "Dubai", country: "United Arab Emirates", timezone: "Asia/Dubai" },
  { iata: "AUH", name: "Zayed International Airport", city: "Abu Dhabi", country: "United Arab Emirates", timezone: "Asia/Dubai" },
  { iata: "DOH", name: "Hamad International Airport", city: "Doha", country: "Qatar", timezone: "Asia/Qatar" },
  { iata: "JED", name: "King Abdulaziz International Airport", city: "Jeddah", country: "Saudi Arabia", timezone: "Asia/Riyadh" },
  { iata: "MED", name: "Prince Mohammad bin Abdulaziz International Airport", city: "Madinah", country: "Saudi Arabia", timezone: "Asia/Riyadh" },
  { iata: "RUH", name: "King Khalid International Airport", city: "Riyadh", country: "Saudi Arabia", timezone: "Asia/Riyadh" },
  { iata: "IST", name: "Istanbul Airport", city: "Istanbul", country: "Türkiye", timezone: "Europe/Istanbul" },
  // Oceania
  { iata: "SYD", name: "Sydney Kingsford Smith Airport", city: "Sydney", country: "Australia", timezone: "Australia/Sydney" },
  { iata: "MEL", name: "Melbourne Airport", city: "Melbourne", country: "Australia", timezone: "Australia/Melbourne" },
  { iata: "PER", name: "Perth Airport", city: "Perth", country: "Australia", timezone: "Australia/Perth" },
  { iata: "AKL", name: "Auckland Airport", city: "Auckland", country: "New Zealand", timezone: "Pacific/Auckland" },
  // Europe
  { iata: "LHR", name: "London Heathrow Airport", city: "London", country: "United Kingdom", timezone: "Europe/London" },
  { iata: "LGW", name: "London Gatwick Airport", city: "London", country: "United Kingdom", timezone: "Europe/London" },
  { iata: "CDG", name: "Paris Charles de Gaulle Airport", city: "Paris", country: "France", timezone: "Europe/Paris" },
  { iata: "AMS", name: "Amsterdam Airport Schiphol", city: "Amsterdam", country: "Netherlands", timezone: "Europe/Amsterdam" },
  { iata: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany", timezone: "Europe/Berlin" },
  { iata: "MUC", name: "Munich Airport", city: "Munich", country: "Germany", timezone: "Europe/Berlin" },
  { iata: "ZRH", name: "Zurich Airport", city: "Zurich", country: "Switzerland", timezone: "Europe/Zurich" },
  { iata: "FCO", name: "Rome Fiumicino Airport", city: "Rome", country: "Italy", timezone: "Europe/Rome" },
  { iata: "MAD", name: "Adolfo Suárez Madrid-Barajas Airport", city: "Madrid", country: "Spain", timezone: "Europe/Madrid" },
  // Americas
  { iata: "JFK", name: "John F. Kennedy International Airport", city: "New York", country: "United States", timezone: "America/New_York" },
  { iata: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", country: "United States", timezone: "America/Los_Angeles" },
  { iata: "SFO", name: "San Francisco International Airport", city: "San Francisco", country: "United States", timezone: "America/Los_Angeles" },
  { iata: "YVR", name: "Vancouver International Airport", city: "Vancouver", country: "Canada", timezone: "America/Vancouver" },
];
