# HouseRent PWA

Offline-first House Rent Management system for landlords and property managers.

## Local Development (Windows / PowerShell Friendly)

This project is configured to work seamlessly on Windows (PowerShell/CMD) and Unix-like systems.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

### Setup

1.  **Clone the repository** (or download the ZIP).
2.  **Install dependencies**:
    ```powershell
    npm install
    ```
3.  **Configure environment variables**:
    -   Copy `.env.example` to `.env`.
    -   Add your `GEMINI_API_KEY` to the `.env` file.
    ```powershell
    cp .env.example .env
    ```

### Available Scripts

-   **Start development server**:
    ```powershell
    npm run dev
    ```
-   **Build for production**:
    ```powershell
    npm run build
    ```
-   **Preview production build locally**:
    ```powershell
    npm run preview
    ```
-   **Clean build artifacts**:
    ```powershell
    npm run clean
    ```
-   **Lint the codebase**:
    ```powershell
    npm run lint
    ```

## Troubleshooting (PowerShell Errors)

If you see an error like `File ... cannot be loaded because running scripts is disabled on this system`, run this command in your PowerShell window to allow scripts for the current user:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Alternatively, you can use `npm.cmd` instead of `npm` for individual commands:
```powershell
npm.cmd install
npm.cmd run dev
```

## Deployment

To deploy this app, you can build the project and host the `dist/` folder on any static hosting provider (e.g., Vercel, Netlify, Firebase Hosting, or Cloud Run).

### Build Command
```powershell
npm run build
```
This will generate a `dist/` folder containing the optimized production build.
