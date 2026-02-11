// German tax allowance rates (Verpflegungspauschalen) by year
// Sources:
// - 2025: BMF Schreiben vom 02.12.2024 - steuerliche Behandlung von Reisekosten
// - 2024: BMF Schreiben vom 21.11.2023
// - 2023: BMF Schreiben vom 23.11.2022
//
// Format: [fullDay, partialDay]
// fullDay: bei einer Abwesenheitsdauer von mindestens 24 Stunden je Kalendertag
// partialDay: fuer den An- und Abreisetag sowie bei einer Abwesenheitsdauer von mehr als 8 Stunden je Kalendertag

import type { AllowanceYear } from '../types';
import { getCountryFromAirport } from './airports';

// Default year for calculations
export const DEFAULT_ALLOWANCE_YEAR: AllowanceYear = 2025;

// 2025 rates (current)
const ALLOWANCES_2025: Record<string, [number, number]> = {
  'Deutschland': [28, 14],
  'Afghanistan': [30, 20],
  'Aegypten': [50, 33],
  'Aethiopien': [44, 29],
  'Aequatorialguinea': [42, 28],
  'Albanien': [27, 18],
  'Algerien': [47, 32],
  'Andorra': [41, 28],
  'Angola': [40, 27],
  'Argentinien': [35, 24],
  'Armenien': [29, 20],
  'Aserbaidschan': [44, 29],
  'Australien': [57, 38],
  'Australien - Canberra': [74, 49],
  'Australien - Sydney': [57, 38],
  'Bahrain': [48, 32],
  'Bangladesch': [46, 31],
  'Barbados': [54, 36],
  'Belgien': [59, 40],
  'Benin': [40, 27],
  'Bhutan': [27, 18],
  'Bolivien': [46, 31],
  'Bosnien und Herzegowina': [23, 16],
  'Botsuana': [46, 31],
  'Brasilien': [46, 31],
  'Brasilien - Brasilia': [51, 34],
  'Brasilien - Rio de Janeiro': [69, 46],
  'Brasilien - Sao Paulo': [46, 31],
  'Brunei': [45, 30],
  'Bulgarien': [22, 15],
  'Burkina Faso': [38, 25],
  'Burundi': [36, 24],
  'Chile': [44, 29],
  'China': [48, 32],
  'China - Chengdu': [41, 28],
  'China - Hongkong': [71, 48],
  'China - Kanton': [36, 24],
  'China - Peking': [30, 20],
  'China - Shanghai': [58, 39],
  'Hongkong': [71, 48],
  'Costa Rica': [60, 40],
  'Elfenbeinkueste': [59, 40],
  'Daenemark': [75, 50],
  'Dominikanische Republik': [50, 33],
  'Dschibuti': [77, 52],
  'Ecuador': [27, 18],
  'El Salvador': [65, 44],
  'Eritrea': [46, 31],
  'Estland': [29, 20],
  'Fidschi': [32, 21],
  'Finnland': [54, 36],
  'Frankreich': [53, 36],
  'Frankreich - Paris': [58, 39],
  'Gabun': [64, 43],
  'Gambia': [40, 27],
  'Georgien': [45, 30],
  'Ghana': [46, 31],
  'Griechenland': [36, 24],
  'Griechenland - Athen': [40, 27],
  'Grossbritannien': [52, 35],
  'Grossbritannien - London': [66, 44],
  'Guatemala': [46, 31],
  'Guinea': [59, 40],
  'Guinea-Bissau': [32, 21],
  'Haiti': [58, 39],
  'Honduras': [57, 38],
  'Indien': [22, 15],
  'Indien - Bangalore': [42, 28],
  'Indien - Chennai': [22, 15],
  'Indien - Kalkutta': [32, 21],
  'Indien - Mumbai': [53, 36],
  'Indien - Neu Delhi': [46, 31],
  'Indonesien': [45, 30],
  'Iran': [33, 22],
  'Irland': [58, 39],
  'Island': [62, 41],
  'Israel': [66, 44],
  'Italien': [42, 28],
  'Italien - Mailand': [42, 28],
  'Italien - Rom': [48, 32],
  'Jamaika': [39, 26],
  'Japan': [33, 22],
  'Japan - Tokio': [50, 33],
  'Japan - Osaka': [33, 22],
  'Jemen': [24, 16],
  'Jordanien': [57, 38],
  'Kambodscha': [42, 28],
  'Kamerun': [56, 37],
  'Kanada': [54, 36],
  'Kanada - Ottawa': [62, 41],
  'Kanada - Toronto': [54, 36],
  'Kanada - Vancouver': [63, 42],
  'Kap Verde': [38, 25],
  'Kasachstan': [33, 22],
  'Katar': [56, 37],
  'Kenia': [51, 34],
  'Kirgisistan': [27, 18],
  'Kolumbien': [34, 23],
  'Kongo': [62, 41],
  'Kongo, Demokratische Republik': [65, 44],
  'Korea, Demokratische Volksrepublik': [28, 19],
  'Korea, Republik': [48, 32],
  'Kosovo': [24, 16],
  'Kroatien': [46, 31],
  'Kuba': [51, 34],
  'Kuwait': [56, 37],
  'Laos': [35, 24],
  'Lesotho': [28, 19],
  'Lettland': [35, 24],
  'Libyen': [63, 42],
  'Libanon': [69, 46],
  'Liberia': [65, 44],
  'Liechtenstein': [56, 37],
  'Litauen': [26, 17],
  'Luxemburg': [63, 42],
  'Madagaskar': [33, 22],
  'Malawi': [41, 28],
  'Malaysia': [36, 24],
  'Malediven': [70, 47],
  'Mali': [38, 25],
  'Malta': [46, 31],
  'Marokko': [41, 28],
  'Marshall Inseln': [63, 42],
  'Mauretanien': [35, 24],
  'Mauritius': [44, 29],
  'Mexiko': [48, 32],
  'Moldau': [26, 17],
  'Monaco': [52, 35],
  'Mongolei': [23, 16],
  'Montenegro': [32, 21],
  'Mosambik': [51, 34],
  'Myanmar': [23, 16],
  'Namibia': [30, 20],
  'Nepal': [36, 24],
  'Neuseeland': [58, 39],
  'Nicaragua': [46, 31],
  'Niederlande': [47, 32],
  'Niger': [42, 28],
  'Nigeria': [46, 31],
  'Nordmazedonien': [27, 18],
  'Norwegen': [75, 50],
  'Oesterreich': [50, 33],
  'Oman': [64, 43],
  'Pakistan': [34, 23],
  'Pakistan - Islamabad': [23, 16],
  'Palau': [51, 34],
  'Panama': [41, 28],
  'Papua-Neuguinea': [59, 40],
  'Paraguay': [39, 26],
  'Peru': [34, 23],
  'Philippinen': [41, 28],
  'Polen': [34, 23],
  'Polen - Breslau': [34, 23],
  'Polen - Warschau': [40, 27],
  'Portugal': [32, 21],
  'Ruanda': [44, 29],
  'Rumaenien': [27, 18],
  'Rumaenien - Bukarest': [32, 21],
  'Russland': [28, 19],
  'Russland - Moskau': [30, 20],
  'Russland - St. Petersburg': [28, 19],
  'Sambia': [38, 25],
  'Samoa': [39, 26],
  'San Marino': [34, 23],
  'Sao Tome und Principe': [36, 24],
  'Saudi-Arabien': [56, 37],
  'Saudi-Arabien - Djidda': [57, 38],
  'Saudi-Arabien - Riad': [56, 37],
  'Schweden': [66, 44],
  'Schweiz': [64, 43],
  'Schweiz - Genf': [66, 44],
  'Senegal': [42, 28],
  'Serbien': [27, 18],
  'Seychellen': [63, 42],
  'Sierra Leone': [57, 38],
  'Simbabwe': [63, 42],
  'Singapur': [71, 48],
  'Slowakei': [33, 22],
  'Slowenien': [38, 25],
  'Spanien': [34, 23],
  'Spanien - Barcelona': [34, 23],
  'Spanien - Kanarische Inseln': [36, 24],
  'Spanien - Madrid': [42, 28],
  'Spanien - Palma de Mallorca': [44, 29],
  'Sri Lanka': [36, 24],
  'Sudan': [33, 22],
  'Suedafrika': [29, 20],
  'Suedafrika - Kapstadt': [33, 22],
  'Suedafrika - Johannesburg': [36, 24],
  'Suedsudan': [51, 34],
  'Syrien': [38, 25],
  'Tadschikistan': [27, 18],
  'Taiwan': [51, 34],
  'Tansania': [44, 29],
  'Thailand': [36, 24],
  'Togo': [39, 26],
  'Tonga': [29, 20],
  'Trinidad und Tobago': [66, 44],
  'Tschad': [42, 28],
  'Tschechien': [32, 21],
  'Tunesien': [40, 27],
  'Tuerkei': [24, 16],
  'Tuerkei - Ankara': [32, 21],
  'Tuerkei - Izmir': [44, 29],
  'Turkmenistan': [28, 19],
  'Uganda': [41, 28],
  'Ukraine': [26, 17],
  'Ungarn': [32, 21],
  'Uruguay': [40, 27],
  'USA': [59, 40],
  'USA - Atlanta': [77, 52],
  'USA - Boston': [63, 42],
  'USA - Chicago': [65, 44],
  'USA - Houston': [62, 41],
  'USA - Los Angeles': [64, 43],
  'USA - Miami': [65, 44],
  'USA - New York': [66, 44],
  'USA - San Francisco': [59, 40],
  'USA - Washington': [66, 44],
  'Usbekistan': [34, 23],
  'Vatikanstadt': [48, 32],
  'Venezuela': [45, 30],
  'Vereinigte Arabische Emirate': [65, 44],
  'Vietnam': [36, 24],
  'Weissrussland': [20, 13],
  'Zentralafrikanische Republik': [53, 36],
  'Zypern': [42, 28],
};

// 2024 rates (BMF-Schreiben vom 21.11.2023)
const ALLOWANCES_2024: Record<string, [number, number]> = {
  'Deutschland': [28, 14],
  'Afghanistan': [30, 20],
  'Aegypten': [50, 33],
  'Aethiopien': [44, 29],
  'Aequatorialguinea': [42, 28],
  'Albanien': [27, 18],
  'Algerien': [47, 32],
  'Andorra': [41, 28],
  'Angola': [40, 27],
  'Argentinien': [35, 24],
  'Armenien': [29, 20],
  'Aserbaidschan': [44, 29],
  'Australien': [57, 38],
  'Australien - Canberra': [74, 49],
  'Australien - Sydney': [57, 38],
  'Bahrain': [48, 32],
  'Bangladesch': [46, 31],
  'Barbados': [54, 36],
  'Belgien': [59, 40],
  'Benin': [40, 27],
  'Bhutan': [27, 18],
  'Bolivien': [46, 31],
  'Bosnien und Herzegowina': [23, 16],
  'Botsuana': [46, 31],
  'Brasilien': [46, 31],
  'Brasilien - Brasilia': [51, 34],
  'Brasilien - Rio de Janeiro': [69, 46],
  'Brasilien - Sao Paulo': [46, 31],
  'Brunei': [45, 30],
  'Bulgarien': [22, 15],
  'Burkina Faso': [38, 25],
  'Burundi': [36, 24],
  'Chile': [44, 29],
  'China': [48, 32],
  'China - Chengdu': [41, 28],
  'China - Hongkong': [71, 48],
  'China - Kanton': [36, 24],
  'China - Peking': [30, 20],
  'China - Shanghai': [58, 39],
  'Hongkong': [71, 48],
  'Costa Rica': [60, 40],
  'Elfenbeinkueste': [59, 40],
  'Daenemark': [75, 50],
  'Dominikanische Republik': [50, 33],
  'Dschibuti': [77, 52],
  'Ecuador': [27, 18],
  'El Salvador': [65, 44],
  'Eritrea': [46, 31],
  'Estland': [29, 20],
  'Fidschi': [32, 21],
  'Finnland': [54, 36],
  'Frankreich': [53, 36],
  'Frankreich - Paris': [58, 39],
  'Gabun': [64, 43],
  'Gambia': [40, 27],
  'Georgien': [45, 30],
  'Ghana': [46, 31],
  'Griechenland': [36, 24],
  'Griechenland - Athen': [40, 27],
  'Grossbritannien': [52, 35],
  'Grossbritannien - London': [66, 44],
  'Guatemala': [46, 31],
  'Guinea': [59, 40],
  'Guinea-Bissau': [32, 21],
  'Haiti': [58, 39],
  'Honduras': [57, 38],
  'Indien': [22, 15],
  'Indien - Bangalore': [42, 28],
  'Indien - Chennai': [22, 15],
  'Indien - Kalkutta': [32, 21],
  'Indien - Mumbai': [53, 36],
  'Indien - Neu Delhi': [46, 31],
  'Indonesien': [45, 30],
  'Iran': [33, 22],
  'Irland': [58, 39],
  'Island': [62, 41],
  'Israel': [66, 44],
  'Italien': [42, 28],
  'Italien - Mailand': [42, 28],
  'Italien - Rom': [48, 32],
  'Jamaika': [39, 26],
  'Japan': [33, 22],
  'Japan - Tokio': [50, 33],
  'Japan - Osaka': [33, 22],
  'Jemen': [24, 16],
  'Jordanien': [57, 38],
  'Kambodscha': [42, 28],
  'Kamerun': [56, 37],
  'Kanada': [54, 36],
  'Kanada - Ottawa': [62, 41],
  'Kanada - Toronto': [54, 36],
  'Kanada - Vancouver': [63, 42],
  'Kap Verde': [38, 25],
  'Kasachstan': [33, 22],
  'Katar': [56, 37],
  'Kenia': [51, 34],
  'Kirgisistan': [27, 18],
  'Kolumbien': [34, 23],
  'Kongo': [62, 41],
  'Kongo, Demokratische Republik': [65, 44],
  'Korea, Demokratische Volksrepublik': [28, 19],
  'Korea, Republik': [48, 32],
  'Kosovo': [24, 16],
  'Kroatien': [46, 31],
  'Kuba': [51, 34],
  'Kuwait': [56, 37],
  'Laos': [35, 24],
  'Lesotho': [28, 19],
  'Lettland': [35, 24],
  'Libyen': [63, 42],
  'Libanon': [69, 46],
  'Liberia': [65, 44],
  'Liechtenstein': [56, 37],
  'Litauen': [26, 17],
  'Luxemburg': [63, 42],
  'Madagaskar': [33, 22],
  'Malawi': [41, 28],
  'Malaysia': [36, 24],
  'Malediven': [70, 47],
  'Mali': [38, 25],
  'Malta': [46, 31],
  'Marokko': [41, 28],
  'Marshall Inseln': [63, 42],
  'Mauretanien': [35, 24],
  'Mauritius': [44, 29],
  'Mexiko': [48, 32],
  'Moldau': [26, 17],
  'Monaco': [52, 35],
  'Mongolei': [23, 16],
  'Montenegro': [32, 21],
  'Mosambik': [51, 34],
  'Myanmar': [23, 16],
  'Namibia': [30, 20],
  'Nepal': [36, 24],
  'Neuseeland': [58, 39],
  'Nicaragua': [46, 31],
  'Niederlande': [47, 32],
  'Niger': [42, 28],
  'Nigeria': [46, 31],
  'Nordmazedonien': [27, 18],
  'Norwegen': [75, 50],
  'Oesterreich': [50, 33],
  'Oman': [64, 43],
  'Pakistan': [34, 23],
  'Pakistan - Islamabad': [23, 16],
  'Palau': [51, 34],
  'Panama': [41, 28],
  'Papua-Neuguinea': [59, 40],
  'Paraguay': [39, 26],
  'Peru': [34, 23],
  'Philippinen': [41, 28],
  'Polen': [34, 23],
  'Polen - Breslau': [34, 23],
  'Polen - Warschau': [40, 27],
  'Portugal': [32, 21],
  'Ruanda': [44, 29],
  'Rumaenien': [27, 18],
  'Rumaenien - Bukarest': [32, 21],
  'Russland': [28, 19],
  'Russland - Moskau': [30, 20],
  'Russland - St. Petersburg': [28, 19],
  'Sambia': [38, 25],
  'Samoa': [39, 26],
  'San Marino': [34, 23],
  'Sao Tome und Principe': [36, 24],
  'Saudi-Arabien': [56, 37],
  'Saudi-Arabien - Djidda': [57, 38],
  'Saudi-Arabien - Riad': [56, 37],
  'Schweden': [66, 44],
  'Schweiz': [64, 43],
  'Schweiz - Genf': [66, 44],
  'Senegal': [42, 28],
  'Serbien': [27, 18],
  'Seychellen': [63, 42],
  'Sierra Leone': [57, 38],
  'Simbabwe': [63, 42],
  'Singapur': [71, 48],
  'Slowakei': [33, 22],
  'Slowenien': [38, 25],
  'Spanien': [34, 23],
  'Spanien - Barcelona': [34, 23],
  'Spanien - Kanarische Inseln': [36, 24],
  'Spanien - Madrid': [42, 28],
  'Spanien - Palma de Mallorca': [44, 29],
  'Sri Lanka': [36, 24],
  'Sudan': [33, 22],
  'Suedafrika': [29, 20],
  'Suedafrika - Kapstadt': [33, 22],
  'Suedafrika - Johannesburg': [36, 24],
  'Suedsudan': [51, 34],
  'Syrien': [38, 25],
  'Tadschikistan': [27, 18],
  'Taiwan': [51, 34],
  'Tansania': [44, 29],
  'Thailand': [36, 24],
  'Togo': [39, 26],
  'Tonga': [29, 20],
  'Trinidad und Tobago': [66, 44],
  'Tschad': [42, 28],
  'Tschechien': [32, 21],
  'Tunesien': [40, 27],
  'Tuerkei': [24, 16],
  'Tuerkei - Ankara': [32, 21],
  'Tuerkei - Izmir': [44, 29],
  'Turkmenistan': [28, 19],
  'Uganda': [41, 28],
  'Ukraine': [26, 17],
  'Ungarn': [32, 21],
  'Uruguay': [40, 27],
  'USA': [59, 40],
  'USA - Atlanta': [77, 52],
  'USA - Boston': [63, 42],
  'USA - Chicago': [65, 44],
  'USA - Houston': [62, 41],
  'USA - Los Angeles': [64, 43],
  'USA - Miami': [65, 44],
  'USA - New York': [66, 44],
  'USA - San Francisco': [59, 40],
  'USA - Washington': [66, 44],
  'Usbekistan': [34, 23],
  'Vatikanstadt': [48, 32],
  'Venezuela': [45, 30],
  'Vereinigte Arabische Emirate': [65, 44],
  'Vietnam': [36, 24],
  'Weissrussland': [20, 13],
  'Zentralafrikanische Republik': [53, 36],
  'Zypern': [42, 28],
};

// 2023 rates (BMF-Schreiben vom 23.11.2022)
const ALLOWANCES_2023: Record<string, [number, number]> = {
  'Deutschland': [28, 14],
  'Aegypten': [50, 33],
  'Aethiopien': [39, 26],
  'Aequatorialguinea': [36, 24],
  'Afghanistan': [30, 20],
  'Albanien': [27, 18],
  'Algerien': [47, 32],
  'Andorra': [41, 28],
  'Angola': [52, 35],
  'Argentinien': [35, 24],
  'Armenien': [24, 16],
  'Aserbaidschan': [44, 29],
  'Australien': [51, 34],
  'Australien - Canberra': [51, 34],
  'Australien - Sydney': [68, 45],
  'Bahrain': [48, 32],
  'Bangladesch': [50, 33],
  'Barbados': [52, 35],
  'Belgien': [59, 40],
  'Benin': [52, 35],
  'Bolivien': [46, 31],
  'Bosnien und Herzegowina': [23, 16],
  'Botsuana': [46, 31],
  'Brasilien': [51, 34],
  'Brasilien - Brasilia': [57, 38],
  'Brasilien - Rio de Janeiro': [57, 38],
  'Brasilien - Sao Paulo': [53, 36],
  'Brunei': [52, 35],
  'Bulgarien': [22, 15],
  'Burkina Faso': [38, 25],
  'Burundi': [36, 24],
  'Chile': [44, 29],
  'China': [48, 32],
  'China - Chengdu': [41, 28],
  'China - Hongkong': [74, 49],
  'China - Kanton': [36, 24],
  'China - Peking': [30, 20],
  'China - Shanghai': [58, 39],
  'Hongkong': [74, 49],
  'Costa Rica': [47, 32],
  'Elfenbeinkueste': [59, 40],
  'Daenemark': [75, 50],
  'Dominikanische Republik': [45, 30],
  'Dschibuti': [65, 44],
  'Ecuador': [27, 18],
  'El Salvador': [65, 44],
  'Eritrea': [50, 33],
  'Estland': [29, 20],
  'Fidschi': [34, 23],
  'Finnland': [50, 33],
  'Frankreich': [53, 36],
  'Frankreich - Paris': [58, 39],
  'Gabun': [52, 35],
  'Gambia': [40, 27],
  'Georgien': [35, 24],
  'Ghana': [46, 31],
  'Griechenland': [36, 24],
  'Griechenland - Athen': [40, 27],
  'Grossbritannien': [52, 35],
  'Grossbritannien - London': [66, 44],
  'Guatemala': [34, 23],
  'Guinea': [46, 31],
  'Guinea-Bissau': [32, 21],
  'Haiti': [58, 39],
  'Honduras': [57, 38],
  'Indien': [32, 21],
  'Indien - Bangalore': [42, 28],
  'Indien - Chennai': [32, 21],
  'Indien - Kalkutta': [35, 24],
  'Indien - Mumbai': [50, 33],
  'Indien - Neu Delhi': [38, 25],
  'Indonesien': [36, 24],
  'Iran': [33, 22],
  'Irland': [58, 39],
  'Island': [62, 41],
  'Israel': [66, 44],
  'Italien': [40, 27],
  'Italien - Mailand': [45, 30],
  'Italien - Rom': [40, 27],
  'Jamaika': [57, 38],
  'Japan': [52, 35],
  'Japan - Tokio': [66, 44],
  'Jemen': [24, 16],
  'Jordanien': [57, 38],
  'Kambodscha': [38, 25],
  'Kamerun': [50, 33],
  'Kanada': [47, 32],
  'Kanada - Ottawa': [47, 32],
  'Kanada - Toronto': [51, 34],
  'Kanada - Vancouver': [50, 33],
  'Kap Verde': [30, 20],
  'Kasachstan': [45, 30],
  'Katar': [56, 37],
  'Kenia': [51, 34],
  'Kirgisistan': [27, 18],
  'Kolumbien': [46, 31],
  'Kongo': [62, 41],
  'Kongo, Demokratische Republik': [70, 47],
  'Korea, Demokratische Volksrepublik': [28, 19],
  'Korea, Republik': [48, 32],
  'Kosovo': [24, 16],
  'Kroatien': [35, 24],
  'Kuba': [46, 31],
  'Kuwait': [56, 37],
  'Laos': [33, 22],
  'Lesotho': [28, 19],
  'Lettland': [35, 24],
  'Libanon': [59, 40],
  'Libyen': [63, 42],
  'Liechtenstein': [56, 37],
  'Litauen': [26, 17],
  'Luxemburg': [63, 42],
  'Madagaskar': [34, 23],
  'Malawi': [41, 28],
  'Malaysia': [36, 24],
  'Malediven': [52, 35],
  'Mali': [38, 25],
  'Malta': [46, 31],
  'Marokko': [42, 28],
  'Marshall Inseln': [63, 42],
  'Mauretanien': [35, 24],
  'Mauritius': [54, 36],
  'Mexiko': [48, 32],
  'Moldau': [26, 17],
  'Monaco': [52, 35],
  'Mongolei': [27, 18],
  'Montenegro': [32, 21],
  'Mosambik': [38, 25],
  'Myanmar': [35, 24],
  'Namibia': [30, 20],
  'Nepal': [36, 24],
  'Neuseeland': [56, 37],
  'Nicaragua': [46, 31],
  'Niederlande': [47, 32],
  'Niger': [42, 28],
  'Nigeria': [46, 31],
  'Nordmazedonien': [27, 18],
  'Norwegen': [80, 53],
  'Oesterreich': [40, 27],
  'Oman': [64, 43],
  'Pakistan': [34, 23],
  'Pakistan - Islamabad': [23, 16],
  'Palau': [51, 34],
  'Panama': [41, 28],
  'Papua-Neuguinea': [59, 40],
  'Paraguay': [38, 25],
  'Peru': [34, 23],
  'Philippinen': [33, 22],
  'Polen': [29, 20],
  'Polen - Breslau': [33, 22],
  'Polen - Danzig': [30, 20],
  'Polen - Krakau': [27, 18],
  'Polen - Warschau': [29, 20],
  'Portugal': [32, 21],
  'Ruanda': [44, 29],
  'Rumaenien': [27, 18],
  'Rumaenien - Bukarest': [32, 21],
  'Russland': [24, 16],
  'Russland - Jekaterinburg': [28, 19],
  'Russland - Moskau': [30, 20],
  'Russland - St. Petersburg': [26, 17],
  'Sambia': [38, 25],
  'Samoa': [39, 26],
  'San Marino': [34, 23],
  'Sao Tome und Principe': [47, 32],
  'Saudi-Arabien': [56, 37],
  'Saudi-Arabien - Djidda': [57, 38],
  'Saudi-Arabien - Riad': [56, 37],
  'Schweden': [66, 44],
  'Schweiz': [64, 43],
  'Schweiz - Genf': [66, 44],
  'Senegal': [42, 28],
  'Serbien': [27, 18],
  'Sierra Leone': [48, 32],
  'Simbabwe': [45, 30],
  'Singapur': [54, 36],
  'Slowakei': [33, 22],
  'Slowenien': [38, 25],
  'Spanien': [34, 23],
  'Spanien - Barcelona': [34, 23],
  'Spanien - Kanarische Inseln': [40, 27],
  'Spanien - Madrid': [40, 27],
  'Spanien - Palma de Mallorca': [35, 24],
  'Sri Lanka': [42, 28],
  'Sudan': [33, 22],
  'Suedafrika': [29, 20],
  'Suedafrika - Kapstadt': [33, 22],
  'Suedafrika - Johannesburg': [36, 24],
  'Suedsudan': [34, 23],
  'Syrien': [38, 25],
  'Tadschikistan': [27, 18],
  'Taiwan': [46, 31],
  'Tansania': [44, 29],
  'Thailand': [38, 25],
  'Togo': [39, 26],
  'Tonga': [39, 26],
  'Trinidad und Tobago': [45, 30],
  'Tschad': [64, 43],
  'Tschechien': [32, 21],
  'Tuerkei': [17, 12],
  'Tuerkei - Istanbul': [26, 17],
  'Tuerkei - Izmir': [29, 20],
  'Tunesien': [40, 27],
  'Turkmenistan': [33, 22],
  'Uganda': [41, 28],
  'Ukraine': [26, 17],
  'Ungarn': [32, 21],
  'Uruguay': [48, 32],
  'USA': [59, 40],
  'USA - Atlanta': [77, 52],
  'USA - Boston': [63, 42],
  'USA - Chicago': [65, 44],
  'USA - Houston': [62, 41],
  'USA - Los Angeles': [64, 43],
  'USA - Miami': [65, 44],
  'USA - New York': [66, 44],
  'USA - San Francisco': [59, 40],
  'USA - Washington': [66, 44],
  'Usbekistan': [34, 23],
  'Vatikanstadt': [52, 35],
  'Venezuela': [45, 30],
  'Vereinigte Arabische Emirate': [65, 44],
  'Vietnam': [41, 28],
  'Weissrussland': [20, 13],
  'Zentralafrikanische Republik': [46, 31],
  'Zypern': [42, 28],
};

// Map of years to their allowance tables
export const ALLOWANCES_BY_YEAR: Record<AllowanceYear, Record<string, [number, number]>> = {
  2023: ALLOWANCES_2023,
  2024: ALLOWANCES_2024,
  2025: ALLOWANCES_2025,
};

// Country name mapping (from airports.js names to allowances.js names)
// This handles umlauts and special naming conventions
export const COUNTRY_NAME_MAP: Record<string, string> = {
  'Ägypten': 'Aegypten',
  'Äthiopien': 'Aethiopien',
  'Österreich': 'Oesterreich',
  'Großbritannien': 'Grossbritannien',
  'Türkei': 'Tuerkei',
  'Südafrika': 'Suedafrika',
  'Südkorea': 'Korea, Republik',
  'VAE': 'Vereinigte Arabische Emirate',
  'Dom. Republik': 'Dominikanische Republik',
  'Curaçao': 'Niederlande',
  'Sint Maarten': 'Niederlande',
  'Aruba': 'Niederlande',
  'Trinidad': 'Trinidad und Tobago',
  'Moldawien': 'Moldau',
  'Rumänien': 'Rumaenien',
  'Dänemark': 'Daenemark',
  'Äquatorialguinea': 'Aequatorialguinea',
  // City-specific mappings (airports.js uses hyphens, allowances.js uses " - ")
  'USA-New York Staat': 'USA - New York',
  'USA-Chicago': 'USA - Chicago',
  'Indien-Mumbai': 'Indien - Mumbai',
  'Indien-Chennai': 'Indien - Chennai',
  'Saudi-Arabien-Riad': 'Saudi-Arabien - Riad',
  'Südafrika-Kapstadt': 'Suedafrika - Kapstadt',
};

// Airport to city-specific allowance mapping
// Maps IATA codes to specific city entries in the allowance table
export const AIRPORT_TO_CITY_ALLOWANCE: Record<string, string> = {
  // USA
  'JFK': 'USA - New York',
  'EWR': 'USA - New York',
  'LGA': 'USA - New York',
  'ORD': 'USA - Chicago',
  'ATL': 'USA - Atlanta',
  'BOS': 'USA - Boston',
  'IAH': 'USA - Houston',
  'LAX': 'USA - Los Angeles',
  'MIA': 'USA - Miami',
  'SFO': 'USA - San Francisco',
  'DCA': 'USA - Washington',
  'IAD': 'USA - Washington',
  // China
  'HKG': 'China - Hongkong',
  'PVG': 'China - Shanghai',
  'PEK': 'China - Peking',
  'CAN': 'China - Kanton',
  'CTU': 'China - Chengdu',
  // India
  'BOM': 'Indien - Mumbai',
  'MAA': 'Indien - Chennai',
  'BLR': 'Indien - Bangalore',
  'CCU': 'Indien - Kalkutta',
  'DEL': 'Indien - Neu Delhi',
  // Australia
  'SYD': 'Australien - Sydney',
  'CBR': 'Australien - Canberra',
  // Brazil
  'GIG': 'Brasilien - Rio de Janeiro',
  'GRU': 'Brasilien - Sao Paulo',
  'BSB': 'Brasilien - Brasilia',
  // Russia
  'SVO': 'Russland - Moskau',
  'DME': 'Russland - Moskau',
  'LED': 'Russland - St. Petersburg',
  // Saudi Arabia
  'RUH': 'Saudi-Arabien - Riad',
  'JED': 'Saudi-Arabien - Djidda',
  // South Africa
  'CPT': 'Suedafrika - Kapstadt',
  'JNB': 'Suedafrika - Johannesburg',
  // Turkey
  'IST': 'Tuerkei - Istanbul',
  'SAW': 'Tuerkei - Istanbul',
  'ESB': 'Tuerkei - Ankara',
  'ADB': 'Tuerkei - Izmir',
  // Japan
  'NRT': 'Japan - Tokio',
  'HND': 'Japan - Tokio',
  'KIX': 'Japan - Osaka',
  // UK
  'LHR': 'Grossbritannien - London',
  'LGW': 'Grossbritannien - London',
  'STN': 'Grossbritannien - London',
  'LCY': 'Grossbritannien - London',
  // France
  'CDG': 'Frankreich - Paris',
  'ORY': 'Frankreich - Paris',
  // Italy
  'FCO': 'Italien - Rom',
  'MXP': 'Italien - Mailand',
  // Spain
  'MAD': 'Spanien - Madrid',
  'BCN': 'Spanien - Barcelona',
  'PMI': 'Spanien - Palma de Mallorca',
  'TFS': 'Spanien - Kanarische Inseln',
  'LPA': 'Spanien - Kanarische Inseln',
  // Greece
  'ATH': 'Griechenland - Athen',
  // Switzerland
  'GVA': 'Schweiz - Genf',
  // Poland
  'WAW': 'Polen - Warschau',
  // Romania
  'OTP': 'Rumaenien - Bukarest',
  // Pakistan
  'ISB': 'Pakistan - Islamabad',
  // Canada
  'YOW': 'Kanada - Ottawa',
  'YYZ': 'Kanada - Toronto',
  'YVR': 'Kanada - Vancouver',
};

// Shorthaul country codes (Europe + Near East/North Africa)
// These destinations are typically operated as shorthaul routes
const SHORTHAUL_COUNTRIES = new Set([
  // Germany
  'DE',
  // EU Countries
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'GR', 'HU', 'IE', 'IT', 
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // UK & EFTA
  'GB', 'CH', 'NO', 'IS', 'LI',
  // Eastern Europe
  'AL', 'BA', 'XK', 'MD', 'ME', 'MK', 'RS', 'UA', 'BY',
  // Mediterranean & Near East
  'TR', 'IL', 'CY',
  // North Africa
  'MA', 'DZ', 'TN', 'EG', 'LY',
  // Russia (western cities only - Moscow, St. Petersburg)
  'RU', // Will be shorthaul by default, actual distance should be checked if needed
]);

/**
 * Airport longhaul classification lookup.
 * Maps IATA codes to boolean indicating if destination is longhaul operation.
 * 
 * Classification based on geographic location:
 * - false (Shorthaul): Europe, North Africa, Near East, Western Russia  
 * - true (Longhaul): Americas, Asia-Pacific, Sub-Saharan Africa, Middle East
 * 
 * Auto-generated from SHORTHAUL_COUNTRIES set classification.
 */
export const AIRPORT_LONGHAUL_FLAG: Record<string, boolean> = {
  // Germany - Shorthaul (DE)
  FRA: false, MUC: false, DUS: false, TXL: false, BER: false, HAM: false, 
  CGN: false, STR: false, HAJ: false, NUE: false, LEJ: false, DRS: false,
  DTM: false, FMO: false, PAD: false, SCN: false, FDH: false, FKB: false,
  HHN: false, NRN: false, ERF: false, RLG: false, GWT: false, BRE: false, IGS: false,
  
  // Austria - Shorthaul (AT)
  VIE: false, SZG: false, INN: false, GRZ: false, LNZ: false, KLU: false,
  
  // Switzerland - Shorthaul (CH)
  ZRH: false, GVA: false, BSL: false,
  
  // United Kingdom - Shorthaul (GB)
  LHR: false, LGW: false, STN: false, LTN: false, LCY: false, MAN: false,
  BHX: false, EDI: false, GLA: false, BRS: false, NCL: false, LPL: false,
  EMA: false, ABZ: false, BFS: false,
  
  // France - Shorthaul (FR)
  CDG: false, ORY: false, NCE: false, LYS: false, MRS: false, TLS: false,
  BOD: false, NTE: false, SXB: false, LIL: false, MPL: false, BIQ: false,
  
  // Italy - Shorthaul (IT)
  FCO: false, MXP: false, LIN: false, VCE: false, NAP: false, BGY: false,
  BLQ: false, FLR: false, PSA: false, TRN: false, CTA: false, PMO: false,
  CAG: false, OLB: false, VRN: false, GOA: false, BRI: false,
  
  // Spain - Shorthaul (ES)
  MAD: false, BCN: false, PMI: false, AGP: false, ALC: false, VLC: false,
  SVQ: false, BIO: false, TFN: false, TFS: false, LPA: false, ACE: false,
  FUE: false, IBZ: false, MAH: false, SCQ: false,
  
  // Portugal - Shorthaul (PT)
  LIS: false, OPO: false, FAO: false, FNC: false, PDL: false,
  
  // Netherlands - Shorthaul (NL)
  AMS: false, RTM: false, EIN: false, MST: false,
  
  // Belgium - Shorthaul (BE)
  BRU: false, CRL: false, ANR: false, LGG: false,
  
  // Luxembourg - Shorthaul (LU)
  LUX: false,
  
  // Ireland - Shorthaul (IE)
  DUB: false, SNN: false, ORK: false,
  
  // Denmark - Shorthaul (DK)
  CPH: false, BLL: false, AAL: false,
  
  // Sweden - Shorthaul (SE)
  ARN: false, GOT: false, MMX: false, BMA: false,
  
  // Norway - Shorthaul (NO)
  OSL: false, BGO: false, TRD: false, SVG: false, TOS: false,
  
  // Finland - Shorthaul (FI)
  HEL: false, OUL: false, TMP: false, TKU: false, RVN: false,
  
  // Iceland - Shorthaul (IS)
  KEF: false, RKV: false,
  
  // Poland - Shorthaul (PL)
  WAW: false, KRK: false, GDN: false, WRO: false, POZ: false, KTW: false,
  
  // Czech Republic - Shorthaul (CZ)
  PRG: false, BRQ: false,
  
  // Slovakia - Shorthaul (SK)
  BTS: false,
  
  // Hungary - Shorthaul (HU)
  BUD: false,
  
  // Estonia - Shorthaul (EE)
  TLL: false,
  
  // Latvia - Shorthaul (LV)
  RIX: false,
  
  // Lithuania - Shorthaul (LT)
  VNO: false,
  
  // Moldova - Shorthaul (MD)
  KIV: false,
  
  // Romania - Shorthaul (RO)
  OTP: false, CLJ: false,
  
  // Bulgaria - Shorthaul (BG)
  SOF: false, VAR: false, BOJ: false,
  
  // Greece - Shorthaul (GR)
  ATH: false, SKG: false, HER: false, RHO: false, CFU: false, JMK: false,
  JTR: false, KGS: false, CHQ: false,
  
  // Turkey - Shorthaul (TR)
  IST: false, SAW: false, ESB: false, AYT: false, ADB: false, DLM: false, BJV: false,
  
  // Croatia - Shorthaul (HR)
  ZAG: false, SPU: false, DBV: false, PUY: false,
  
  // Slovenia - Shorthaul (SI)
  LJU: false,
  
  // Serbia - Shorthaul (RS)
  BEG: false,
  
  // Montenegro - Shorthaul (ME)
  TGD: false, TIV: false,
  
  // Bosnia and Herzegovina - Shorthaul (BA)
  SJJ: false,
  
  // Albania - Shorthaul (AL)
  TIA: false,
  
  // North Macedonia - Shorthaul (MK)
  SKP: false,
  
  // Cyprus - Shorthaul (CY)
  LCA: false, PFO: false,
  
  // Malta - Shorthaul (MT)
  MLA: false,
  
  // Russia - Shorthaul (RU)
  SVO: false, DME: false, VKO: false, LED: false,
  
  // Ukraine - Shorthaul (UA)
  KBP: false, IEV: false, ODS: false, LWO: false,
  
  // Egypt - Shorthaul (EG)
  CAI: false, HRG: false, SSH: false,
  
  // Morocco - Shorthaul (MA)
  CMN: false, RAK: false, AGA: false,
  
  // Tunisia - Shorthaul (TN)
  TUN: false, DJE: false,
  
  // Algeria - Shorthaul (DZ)
  ALG: false,
  
  // Israel - Shorthaul (IL)
  TLV: false,
  
  // Middle East - Longhaul
  DXB: true, AUH: true, SHJ: true, // UAE (AE)
  DOH: true, // Qatar (QA)
  BAH: true, // Bahrain (BH)
  KWI: true, // Kuwait (KW)
  MCT: true, // Oman (OM)
  JED: true, RUH: true, DMM: true, // Saudi Arabia (SA)
  AMM: true, // Jordan (JO)
  BEY: true, // Lebanon (LB)
  BGW: true, EBL: true, // Iraq (IQ)
  IKA: true, // Iran (IR)
  
  // Sub-Saharan Africa - Longhaul
  NBO: true, MBA: true, // Kenya (KE)
  ADD: true, // Ethiopia (ET)
  JNB: true, CPT: true, DUR: true, // South Africa (ZA)
  LOS: true, ABV: true, // Nigeria (NG)
  ABJ: true, // Côte d'Ivoire (CI)
  ACC: true, // Ghana (GH)
  DAR: true, // Tanzania (TZ)
  MRU: true, // Mauritius (MU)
  SEZ: true, // Seychelles (SC)
  WDH: true, // Namibia (NA)
  LAD: true, // Angola (AO)
  SSG: true, // Equatorial Guinea (GQ)
  
  // Asia - Longhaul
  PEK: true, PVG: true, SHA: true, CAN: true, // China (CN)
  HKG: true, // Hong Kong (HK)
  TPE: true, // Taiwan (TW)
  NRT: true, HND: true, KIX: true, // Japan (JP)
  ICN: true, GMP: true, // South Korea (KR)
  SIN: true, // Singapore (SG)
  BKK: true, DMK: true, HKT: true, // Thailand (TH)
  KUL: true, // Malaysia (MY)
  CGK: true, DPS: true, // Indonesia (ID)
  MNL: true, CEB: true, // Philippines (PH)
  HAN: true, SGN: true, // Vietnam (VN)
  DEL: true, BOM: true, BLR: true, MAA: true, CCU: true, HYD: true, // India (IN)
  CMB: true, // Sri Lanka (LK)
  MLE: true, // Maldives (MV)
  KTM: true, // Nepal (NP)
  DAC: true, // Bangladesh (BD)
  KHI: true, ISB: true, LHE: true, // Pakistan (PK)
  TAS: true, // Uzbekistan (UZ)
  ALA: true, NQZ: true, // Kazakhstan (KZ)
  TBS: true, // Georgia (GE)
  EVN: true, // Armenia (AM)
  GYD: true, // Azerbaijan (AZ)
  
  // Americas - Longhaul
  JFK: true, EWR: true, LGA: true, LAX: true, SFO: true, ORD: true,
  MIA: true, DFW: true, ATL: true, DEN: true, SEA: true, BOS: true,
  IAD: true, DCA: true, PHL: true, IAH: true, PHX: true, SAN: true,
  LAS: true, MCO: true, DTW: true, MSP: true, CLT: true, STL: true, AUS: true, // USA (US)
  YYZ: true, YVR: true, YUL: true, YYC: true, YOW: true, // Canada (CA)
  MEX: true, CUN: true, GDL: true, // Mexico (MX)
  HAV: true, VRA: true, // Cuba (CU)
  PUJ: true, SDQ: true, // Dominican Republic (DO)
  SJU: true, // Puerto Rico (PR)
  PTY: true, // Panama (PA)
  SJO: true, // Costa Rica (CR)
  BOG: true, MDE: true, CTG: true, // Colombia (CO)
  LIM: true, CUZ: true, // Peru (PE)
  SCL: true, // Chile (CL)
  GRU: true, GIG: true, BSB: true, // Brazil (BR)
  EZE: true, AEP: true, // Argentina (AR)
  MVD: true, // Uruguay (UY)
  CCS: true, // Venezuela (VE)
  UIO: true, GYE: true, // Ecuador (EC)
  LPB: true, // Bolivia (BO)
  ASU: true, // Paraguay (PY)
  
  // Caribbean - Longhaul
  MBJ: true, KIN: true, // Jamaica (JM)
  NAS: true, // Bahamas (BS)
  BGI: true, // Barbados (BB)
  AUA: true, // Aruba (AW)
  CUR: true, // Curaçao (CW)
  SXM: true, // St. Maarten (SX)
  POS: true, // Trinidad and Tobago (TT)
  
  // Oceania - Longhaul
  SYD: true, MEL: true, BNE: true, PER: true, DRW: true, ADL: true, OOL: true, CNS: true, // Australia (AU)
  AKL: true, WLG: true, CHC: true, // New Zealand (NZ)
  NAN: true, // Fiji (FJ)
  PPT: true, // French Polynesia/Tahiti (PF)
};

/**
 * Determine if a destination is typically a shorthaul or longhaul operation
 * based on geographic location.
 * @param countryCode ISO country code (e.g., 'US', 'FR', 'CN')
 * @returns 'shorthaul' for European/nearby destinations, 'longhaul' for intercontinental
 */
export function getFlightTypeByCountry(countryCode: string): 'shorthaul' | 'longhaul' {
  const code = countryCode?.toUpperCase() || '';
  return SHORTHAUL_COUNTRIES.has(code) ? 'shorthaul' : 'longhaul';
}

/**
 * Determine if an airport destination is longhaul based on IATA code.
 * Uses explicit airport classification from AIRPORT_LONGHAUL_FLAG.
 * Falls back to country-based classification for unknown airports.
 * 
 * @param iataCode Airport IATA code (e.g., 'BOM', 'LHR', 'JFK')
 * @returns true if longhaul destination, true if unknown (conservative default)
 */
export function isLonghaulDestination(iataCode: string): boolean {
  const code = iataCode?.toUpperCase()?.trim() || '';
  if (!code) return true; // Conservative default for empty/invalid codes
  
  // Check explicit mapping first
  if (code in AIRPORT_LONGHAUL_FLAG) {
    return AIRPORT_LONGHAUL_FLAG[code];
  }
  
  // Fallback: use country-based classification
  const countryCode = getCountryFromAirport(code);
  if (countryCode !== 'XX') {
    return getFlightTypeByCountry(countryCode) === 'longhaul';
  }
  
  // Unknown airport - default to longhaul (conservative)
  return true;
}

// Normalize country name for allowance lookup
export function normalizeCountryName(country: string): string {
  if (!country) return 'Deutschland';
  return COUNTRY_NAME_MAP[country] || country;
}

// Get allowance rates for a country by year
// Returns [fullDay, partialDay] array
export function getAllowanceByCountry(country: string, year: AllowanceYear = DEFAULT_ALLOWANCE_YEAR): [number, number] {
  const normalizedCountry = normalizeCountryName(country);
  const allowanceTable = ALLOWANCES_BY_YEAR[year] || ALLOWANCES_BY_YEAR[DEFAULT_ALLOWANCE_YEAR];
  // Per BMF: For countries not in the list, use Luxemburg rates as fallback
  return allowanceTable[normalizedCountry] || allowanceTable['Luxemburg'] || [63, 42];
}

// Get allowance rates for an airport by IATA code and year
// This handles city-specific rates (e.g., JFK -> "USA - New York")
export function getAllowanceByAirport(iataCode: string, year: AllowanceYear = DEFAULT_ALLOWANCE_YEAR): [number, number] {
  const code = iataCode?.toUpperCase() || '';
  
  // Check if there's a city-specific mapping for this airport
  const citySpecificKey = AIRPORT_TO_CITY_ALLOWANCE[code];
  if (citySpecificKey) {
    const allowanceTable = ALLOWANCES_BY_YEAR[year] || ALLOWANCES_BY_YEAR[DEFAULT_ALLOWANCE_YEAR];
    const rates = allowanceTable[citySpecificKey];
    if (rates) {
      return rates;
    }
  }
  
  // Fall back to country-based lookup
  // This requires importing from airports.ts, so we'll handle this in allowances.ts
  return getAllowanceByCountry('Luxemburg', year);
}

// Get the list of supported years
export function getSupportedYears(): AllowanceYear[] {
  return [2025, 2024, 2023];
}

// Check if a year is supported
export function isYearSupported(year: number): year is AllowanceYear {
  return year === 2023 || year === 2024 || year === 2025;
}

// Get default rates for when year is not specified or invalid
export function getDefaultAllowances(): Record<string, [number, number]> {
  return ALLOWANCES_BY_YEAR[DEFAULT_ALLOWANCE_YEAR];
}
