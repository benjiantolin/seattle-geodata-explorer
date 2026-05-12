# Seattle GeoData Explorer

A Vite-powered web application for exploring Seattle's open ArcGIS data services, submitted to the WAGISA Map Contest.

## Contest Submission

**WAGISA Map Contest** - Washington GIS Association  
**Category:** Apps - Interactive browser or mobile experiences  
**Submission Deadline:** May 12, 2026 at noon  

### Contest Categories
- **Apps** - Interactive applications that may be consumed on a browser or a mobile device. Effective, attractive, functional, engaging.
- **Scripts** - A Jupyter Notebook with code, maps, and/or charts.
- **Analytical / Artistic** - Stand-alone images analytical in nature. Creative, effective, insightful integration of geospatial data. Innovative visual expression of cartography and geographic concepts.

### Submission Requirements
- One print and one digital submission maximum per participant
- Written abstract required
- .png file of the map/application/script + online URL for digital submissions
- Physical submissions: max 24" x 36", bring to conference center 5/19 or by 8:30am 5/20
- Printing scholarships available
- Jupyter Notebook assistance available
- Email: MapContest@wagisa.org

## Project Description

This application was created for the WAGISA Map Contest and has been built with inspiration from the Dev Summit and the rebuilding of Seattle Public Utilities' Utiliview Web Mapping Application. Using Vite applications to reimagine how we explore data repositories and use ArcGIS Components and SDKs to build highly customized, web applications that are optimized for speed and efficiency. Best of all, we can create our own styles and themes, build components and widgets into custom EXB widgets and share them with the organization and let others use these customized tools in their own apps.

This Vite application was built from scratch with a single CSV export from [https://data-seattlecitygis.opendata.arcgis.com/search](https://data-seattlecitygis.opendata.arcgis.com/search) website which exported the entire catalog into a CSV file including all of the information needed to create a layer list catalog that feeds this application all map layers are loaded with their default settings according to their publishing/item configuration.

This application was derived from that single CSV file that was downloaded that last Saturday evening May 9, 2026, and using AI as a force multiplier and building this open source without work and organization limits, I was able to build this into a fully functional albeit bug-ridden application that I felt is worthy of submitting. I believe that it is a novel application and that it can have significant impact on how future GIS users interact with data sources, databases, and etc.

With the help of GitHub Copilot, this application has been built from the ground up from that single CSV file in around 3 evenings (and maybe 1 or 2 late late nights).

## Features

- Browse Seattle ArcGIS services by category, source, tag, and date
- Interactive map with multiple basemaps and tools
- Load and manage map layers dynamically
- Inspect layer metadata and attributes
- Native ArcGIS FeatureTable for data exploration
- Responsive design optimized for desktop and mobile
- Dark theme with modern UI

## Tech Stack

- **Vite** - Fast build tool and dev server
- **ArcGIS API for JavaScript** - Mapping and GIS functionality
- **Vanilla JavaScript** - No frameworks, lightweight and performant
- **CSS** - Custom styling with modern design patterns

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Deployment

This app is configured for deployment to GitHub Pages using Vite's static site generation. The `vite.config.js` includes the correct base path for GitHub Pages deployment.

## Data Source

All layer metadata is sourced from a CSV export of Seattle's open data portal, providing a comprehensive catalog of available GIS services.

## License

This project is open source and built for educational and contest purposes.

## Author

Built with ☕ by [Benji](https://github.com/benjiantolin)