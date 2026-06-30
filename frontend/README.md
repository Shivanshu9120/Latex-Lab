# LaTeX Lab: Next.js Frontend

This directory contains the user interface for the LaTeX Lab application. It is a single-page React application built with Next.js (App Router), TypeScript, and Tailwind CSS. It features a split-screen editor using Microsoft's Monaco Editor (via `@monaco-editor/react`) and an embedded PDF preview pane.

## Folder Structure

```text
frontend/
├── src/
│   ├── app/            # App Router pages and layouts
│   │   ├── layout.tsx  # Global layout and font loading
│   │   ├── page.tsx    # Landing page / Redirect to editor
│   │   └── editor/     # Editor dashboard page
│   │       └── page.tsx
│   └── components/     # UI components (future split components)
├── public/             # Static assets (images, icons)
├── package.json        # Node project configuration and scripts
├── tsconfig.json       # TypeScript configuration
├── tailwind.config.ts  # Tailwind CSS utility setup
└── README.md           # This explanation file
```

## Setup & Running Locally

Follow these steps to run the frontend server:

### 1. Install Node.js Dependencies
Open a terminal in the `frontend/` directory and install the required modules:
```bash
npm install
```

### 2. Run the Development Server
Start the Next.js hot-reloaded development server:
```bash
npm run dev
```

The application will start, and you can open it in your browser at `http://localhost:3000/`.

---

## Technical Details

* **Monaco Editor**: Provides a rich coding environment directly in the browser, featuring syntax highlighting, line numbers, auto-closing brackets, and custom tab sizing.
* **Responsive Dashboard**: Split-pane interface that divides code editing and PDF output side-by-side. 
* **Object URLs**: Compiled PDF binaries returned from the Django backend are converted into browser object URLs (`blob:http://...`) and rendered inside a sandbox `<iframe>` for real-time, zero-lag previews.
