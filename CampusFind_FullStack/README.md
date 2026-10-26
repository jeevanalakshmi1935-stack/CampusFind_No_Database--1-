# CampusFind — Simple Local Version

This version runs without MongoDB Atlas, database passwords, PHP, or XAMPP. Reports are saved in `data/reports.json` on your computer. Optional report photos are stored inside that local JSON file.

## Run it
1. Install Node.js LTS from https://nodejs.org/ if it is not installed.
2. Extract this ZIP. Open the `CampusFind_FullStack` folder in VS Code.
3. Choose Terminal → New Terminal. Make sure the terminal is inside this folder (the folder contains `server.js` and `package.json`).
4. Run `npm install` and wait for it to finish.
5. Run `npm start`.
6. Open http://localhost:3000 in your browser. Keep the terminal open while using the website.

The `data` folder and `reports.json` file are created automatically when the first report is submitted. Reports are only stored on this computer; this version is for a local demo, not a public multi-user deployment. Photos are limited to 2 MB.
