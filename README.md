# ✈️ OpenFlight - Flight Crew Tax Calculator

A web-based tax deduction calculator specifically designed for German airline pilots and flight crew members. OpenFlight automates complex tax calculations including meal allowances, commuting expenses, and work day tracking based on German tax law (BMF regulations).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://0xdavidjansen.github.io/openflight/)

## 🎯 Features

### Automated Calculations
- **📄 PDF Parsing** - Automatically extracts flight data from Lufthansa Flugstunden-Übersicht and Streckeneinsatz-Abrechnung PDFs
- **🌍 Meal Allowances (Verpflegungsmehraufwand)** - Calculates allowances based on BMF rates (2023-2025) with city-specific rates for major destinations
- **🚗 Commuting Deductions (Entfernungspauschale)** - Automatic calculation with year-specific rates (€0.30/€0.38 per km)
- **⏱️ Briefing Time** - Accounts for pre-departure briefing time (1h50 for longhaul flights on A330/A340/A350/A380/B747/B777/B787)
- **🏨 Hotel Night Expenses** - Tracks overnight stays abroad for tip deductions
- **📊 Work Days & Trips** - Automatic counting with configurable rules

### Smart Features
- **City-Specific Rates** - Special allowance rates for major cities (NYC, Mumbai, Johannesburg, etc.)
- **Continuation Flight Handling** - Correctly processes multi-leg flights across month boundaries
- **Overnight Flight Detection** - Automatically identifies flights crossing midnight
- **Employer Reimbursement** - Subtracts employer-provided meal compensation
- **Monthly Breakdown** - Detailed per-month summaries with all deductions
- **PDF Export** - Export calculations to PDF for tax filing

### User Experience
- **🌙 Dark Mode** - Full dark mode support
- **📱 Responsive Design** - Works on desktop, tablet, and mobile
- **💾 Local Storage** - Your data never leaves your browser
- **🚀 Fast** - Built with modern React and Vite for instant updates
- **♿ Accessible** - Keyboard navigation and screen reader support

## 🚀 Getting Started

### Live Demo
Try it now: **[https://0xdavidjansen.github.io/openflight/](https://0xdavidjansen.github.io/openflight/)**

### Local Development

#### Prerequisites
- Node.js 20 or later
- npm or yarn

#### Installation

```bash
# Clone the repository
git clone https://github.com/0xdavidjansen/openflight.git
cd openflight

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

#### Build for Production

```bash
npm run build
npm run preview  # Preview production build locally
```

#### Run Tests

```bash
npm test          # Watch mode
npm run test:run  # Run once
npm run test:coverage  # With coverage report
```

## 📖 Usage

### 1. Upload Your PDFs
- Click "Upload" and select your Lufthansa Flugstunden-Übersicht PDF(s)
- Optionally upload Streckeneinsatz-Abrechnung PDF(s) for employer reimbursement data
- The app automatically parses flight data, work days, and allowances

### 2. Configure Settings
- Set your **distance to work** (in km) for commuting deductions
- Choose **counting rules** (e.g., count medical days, ground duties)
- Optionally override travel time (Fahrzeit) if calculated time differs from reality
- Adjust **cleaning costs** and **tip rates** per your tax advisor's recommendations

### 3. Review Calculations
- **Arbeitstage (Work Days)** - View all flights and non-flight days with allowances
- **Übersicht (Summary)** - Monthly breakdown with totals
- All calculations use official BMF rates and German tax law

### 4. Export Results
- Export to PDF for your tax return (Anlage N)
- Print-friendly format with all deductions itemized

## 📊 What Gets Calculated

### Verpflegungsmehraufwand (Meal Allowances)
- **Foreign Travel**: Departure day (≥8h absence) and arrival day = partial rate; full days abroad = full rate
- **Domestic Travel**: Only pure domestic flights with >8h absence = partial rate (€14)
- **City-Specific Rates**: Automatically applies higher rates for major cities (e.g., New York, Mumbai)
- **Employer Reimbursement**: Automatically subtracted from total

### Entfernungspauschale (Distance Deduction)
- First 20km: €0.30/km
- Above 20km: €0.38/km (2024+)
- Multiplied by number of trips

### Briefing Time Logic
- **Longhaul** (A330/A340/A350/A380/B747/B777/B787): Duty starts 1h50 before departure
- **Shorthaul** (A320 family): Currently no additional time (configurable in future)
- Increases total absence duration, which can affect allowance eligibility

### Cleaning Costs & Tips
- Cleaning costs = work days × rate per day
- Tips = hotel nights × rate per night

## 🛠️ Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS 4** - Styling
- **PDF.js** - PDF parsing
- **Vitest** - Testing framework
- **Lucide React** - Icons
- **React Virtual** - Virtualized tables for performance

## 📝 Tax Law References

This calculator implements German tax law for flight crew deductions:
- **Verpflegungsmehraufwand**: Based on BMF (Bundesministerium der Finanzen) rates
- **Entfernungspauschale**: §9 Abs. 1 Nr. 4 EStG
- **Werbungskosten**: §9 EStG (business expenses)

**Important**: This tool provides estimates only. Always consult a qualified Steuerberater (tax advisor) for binding advice.

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### Reporting Bugs
- Use the [GitHub Issues](https://github.com/0xdavidjansen/openflight/issues) page
- Include steps to reproduce, expected vs actual behavior
- Attach sample PDFs if possible (redact personal info)

### Feature Requests
- Open an issue with the "enhancement" label
- Describe the use case and expected behavior
- Discussion before implementation is encouraged

### Code Contributions
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Ensure all tests pass (`npm test`)
5. Commit with clear messages (`git commit -m 'Add amazing feature'`)
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines
- Follow existing code style (ESLint configured)
- Add tests for new features
- Update documentation as needed
- Keep commits atomic and well-described

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- BMF (Bundesministerium der Finanzen) for publishing official tax rates
- Lufthansa for standardized PDF formats
- The open-source community for excellent libraries

## ⚠️ Disclaimer

This calculator is provided for informational purposes only. It does not constitute tax advice. Tax regulations are complex and subject to change. Always consult a qualified Steuerberater (tax advisor) for personalized advice regarding your tax situation.

## 📧 Contact

- GitHub: [@0xdavidjansen](https://github.com/0xdavidjansen)
- Issues: [GitHub Issues](https://github.com/0xdavidjansen/openflight/issues)

## 🔮 Roadmap

- [ ] Add shorthaul briefing time configuration
- [ ] Support for more airlines (PDF format variations)
- [ ] Multi-year tax return comparison
- [ ] Export to ELSTER format
- [ ] Mobile app (PWA improvements)
- [ ] Multiple language support (English, German)

---

**Made with ✈️ for flight crew by flight crew**
