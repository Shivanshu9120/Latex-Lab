# LaTeX Lab: Complete Project Explanation & Setup Guide

Welcome to **LaTeX Lab**! This project is a beautiful, modern, split-screen web editor that allows you to write LaTeX code on the left and see it compiled into a PDF on the right in real-time. 

This guide is designed for developers who are new to Django, Next.js, and compiler concepts. It explains **exactly how this project works**, how to run it, and how to debug compilation errors.

---

## 1. Project Architecture (How It Works under the Hood)

The project is structured as a **decoupled monorepo** with a clean separation of concerns:
1. **Frontend (Next.js SPA)**: Handles the user interface, text editor, rendering of the PDF preview, and error display.
2. **Backend (Django API Server)**: Processes requests, handles compilation scripts, connects to MongoDB, and returns binary PDF streams.

### Code Compilation Flow

```text
 [1. User types in Monaco Editor]
               │
               ▼
 [2. User clicks "Compile (Tectonic)"]
               │
               ▼
 [3. Next.js fetches http://localhost:8000/api/compile/ with LaTeX source code in body]
               │
               ▼
 [4. Django parses the request and creates a temporary directory in Windows]
               │
               ▼
 [5. Django writes code to "document.tex" and spawns "tectonic.exe document.tex"]
               │
               ▼
 [6. Tectonic downloads required LaTeX styles/fonts and compiles to "document.pdf"]
               │
               ▼
 [7. Django reads "document.pdf" bytes, streams them back to Next.js, and deletes the temp files]
               │
               ▼
 [8. Next.js converts bytes into a Blob URL and renders it inside a sandboxed iframe]
```

---

## 2. Compilation Modes: Level 1 vs. Level 2

Our backend supports two compilation buttons at the top of the interface:

### 🚀 Compile (Tectonic) - Level 1
* **How it works:** It uses a real, full LaTeX compiler (`tectonic.exe`) executing as a background process.
* **Pros:** Highly accurate. It compiles complex math equations, packages, multi-page formatting, and is 100% compliant with standard TeX.
* **Prerequisites:** Any package you use (like `tabularx` for tables or `amsmath` for math) **must be declared in the document preamble** using `\usepackage{name}`.
* **Best for:** Formatting resumes, scientific articles, and highly complex layouts.

### ✨ Transpile (HTML) - Level 2
* **How it works:** It bypasses standard LaTeX compiling entirely. Our backend transpiler (`compiler/transpiler.py`) uses Regular Expressions (Regex) to convert LaTeX markup commands into equivalent HTML5 tags (e.g. `\textbf{text}` becomes `<strong>text</strong>`), and then uses the `xhtml2pdf` library to print the styled HTML page to a PDF.
* **Pros:** Fast and lightweight. It does not require a local TeX engine or package downloads.
* **Cons:** Less flexible than Level 1. It only supports the subset of LaTeX tags we mapped in our python regex code.

---

## 3. Detailed Directory & Code Walkthrough

Here is a breakdown of what every file does in this workspace:

### 🖥️ Next.js Frontend (`frontend/`)
* **`src/app/layout.tsx`**: Sets up global HTML configurations, loads premium Google Fonts (Geist/Geist Mono), and defines page SEO titles.
* **`src/app/page.tsx`**: The core dashboard file.
  * Uses **Monaco Editor** (`@monaco-editor/react`) to give you an VS Code-like editing interface.
  * Handles the state for compilation: `code` (the user input), `pdfUrl` (the object URL displaying the preview), and `errorLog` (retains logs if compilation fails).
  * Uses browser `fetch()` to call the Django backend endpoints.

### 🐍 Django Backend (`backend/`)
* **`config/settings.py`**: Configures our Django server. Crucially, it registers `corsheaders` (enabling our frontend on port `3000` to talk to our backend on port `8000`) and the `compiler` application.
* **`config/urls.py`**: Handles URL mappings, routing requests starting with `/api/` to the `compiler` app.
* **`compiler/urls.py`**: Mapped API endpoints:
  * `/api/compile/` -> Handles compiles.
  * `/api/documents/` -> Lists or saves new files to MongoDB.
  * `/api/documents/<id>/` -> Fetches or updates individual files.
* **`compiler/views.py`**: Houses the main logic. When `/api/compile/` is hit, it writes the LaTeX text to a temporary directory in Windows, launches `tectonic.exe` to compile, reads the output PDF, streams it back to Next.js, and deletes the temporary files.
* **`compiler/transpiler.py`**: Our Level 2 transpilation engine. Parses the LaTeX source and outputs a responsive HTML webpage with pre-baked stylesheets, converting it to PDF.
* **`compiler/db.py`**: Interacts with MongoDB database collections using `pymongo`. It allows saving and listing your documents.

---

## 4. How to Run the Project (Step-by-Step)

Both the frontend and backend servers must be running concurrently.

### Terminal 1: Run the Django Backend
1. Open your terminal in the backend directory:
   ```bash
   cd backend
   ```
2. Activate the python virtual environment:
   ```powershell
   .\venv\Scripts\activate
   ```
3. Run the server:
   ```bash
   python manage.py runserver
   ```
   *The server will start on http://127.0.0.1:8000/*

### Terminal 2: Run the Next.js Frontend
1. Open a new terminal in the frontend directory:
   ```bash
   cd frontend
   ```
2. Run the Next.js development script:
   ```bash
   npm run dev
   ```
   *The frontend will start on http://localhost:3000/*

---

## 5. Common Compilation Issues & How to Fix Them

### ❌ Error: "Undefined control sequence"
This is the most common LaTeX error. It means you used a layout tag or package environment that the compiler doesn't understand because **you forgot to import it in the preamble**.

* **Why it happened in your template:**
  In your editor code, you utilized a table:
  ```latex
  \begin{tabularx}{\textwidth}{|p{3cm}|X|p{2cm}|p{2cm}|}
  ```
  But the top of the file did not declare `\usepackage{tabularx}`. The compiler crashed because it did not know what `tabularx` was.
* **How to fix it:**
  Always declare your packages at the top of your document (before `\begin{document}`):
  ```latex
  \documentclass{article}
  \usepackage{amsmath}
  \usepackage{tabularx}  % <-- Always load the packages you use!
  
  \begin{document}
  ...
  ```
  *(Note: We have updated the default editor code template to include this import by default. You can hit **"Reset Template"** in your editor toolbar to see the working layout!)*

### ❌ Error: "Misplaced alignment tab character &"
In LaTeX, the `&` character is a reserved keyword used to separate columns in tabular environments.
* If you want to print a literal `&` (e.g. "Leadership & Responsibilities"), you must escape it with a backslash: `\&`.
