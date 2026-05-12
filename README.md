# 🗺️ Seattle GeoData Explorer

An interactive web application for exploring Seattle's open ArcGIS data services, built with modern web technologies and submitted to the WAGISA Map Contest.

---

## 🎯 About This Project

**Seattle GeoData Explorer** is a Vite-powered application that reimagines how we interact with geospatial data repositories. Built in just a few evenings with the help of GitHub Copilot, this tool showcases the power of combining ArcGIS SDKs with modern web development practices.

The application was created as a submission to the **WAGISA Map Contest** (Washington GIS Association) in the **Apps** category—a showcase for interactive browser and mobile experiences that are effective, attractive, functional, and engaging.

---

## ✨ Key Features

- **Smart Catalog Browsing** — Filter Seattle ArcGIS services by category, source, tag, and publication date
- **Dynamic Layer Management** — Load and manage map layers on-the-fly with automatic configuration
- **Interactive Mapping** — Multiple basemaps and intuitive tools for exploration
- **Data Inspection** — View layer metadata and attributes with native ArcGIS FeatureTable integration
- **Responsive Design** — Optimized for both desktop and mobile devices
- **Modern UI** — Dark theme with clean, contemporary design

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **Vite** | Fast, optimized build tooling and development server |
| **ArcGIS API for JavaScript** | Mapping, GIS functionality, and data services |
| **Vanilla JavaScript** | Lightweight, performant core application (66.6%) |
| **CSS** | Custom styling and responsive layouts (29.5%) |
| **HTML** | Semantic markup structure (3.9%) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm

### Installation & Development

```bash
# Clone and install dependencies
git clone https://github.com/benjiantolin/seattle-geodata-explorer.git
cd seattle-geodata-explorer
npm install

# Start the development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Production Build

```bash
# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

---

## 📊 Data Source

All layer metadata is sourced from a single CSV export of [Seattle's Open Data Portal](https://data-seattlecitygis.opendata.arcgis.com/search), providing a comprehensive, automatically-updated catalog of available GIS services and their configurations.

---

## 🏆 Contest Information

**Competition:** WAGISA Map Contest 2026  
**Category:** Apps - Interactive browser/mobile experiences  
**Organization:** Washington GIS Association  

This submission demonstrates how modern web development practices and AI-assisted development can rapidly create impactful GIS applications that serve the broader geospatial community.

---

## 💡 Project Inspiration

This application draws inspiration from:
- The ArcGIS Developer Summit and best practices
- Seattle Public Utilities' Utiliview Web Mapping Application
- Modern approaches to web-based GIS exploration and data discovery

Built with the philosophy that custom, purpose-built applications can be created quickly and shared across organizations without artificial constraints.

---

## 📝 License

This project is open source and built for educational and community purposes.

---

## 👨‍💻 Author

Built with ☕ by [Benji](https://github.com/benjiantolin)

*Special thanks to GitHub Copilot for making rapid development possible.*

---

**Questions?** Feel free to open an issue or reach out!