# LaTeX Lab: Python/Django Backend

This directory houses the backend server for compiling LaTeX code. It is built using Python 3 and Django, exposes a REST API via Django REST Framework, and interfaces with the portable LaTeX compiler (`tectonic.exe`) and a custom HTML transpiler (`xhtml2pdf`).

## Folder Structure

```text
backend/
├── config/             # Project-wide settings and configuration
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings.py     # Main project settings (CORS, Middlewares, Apps)
│   ├── urls.py         # Main URL routes
│   └── wsgi.py
├── compiler/           # Core compiler app
│   ├── migrations/     # Database migration history
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py       # MongoDB document models
│   ├── tests.py
│   ├── transpiler.py   # Level 2 Transpiler (LaTeX to HTML to PDF)
│   └── views.py        # API views (Level 1 and Level 2 compiler logic)
├── venv/               # Isolated Python virtual environment
├── manage.py           # Django command-line administrative utility
└── requirements.txt    # List of project dependencies
```

## Setup & Running Locally

Follow these steps to run the backend server:

### 1. Activate the Virtual Environment
Open a terminal in the `backend/` directory and run:
* **Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\activate
  ```
* **macOS / Linux**:
  ```bash
  source venv/bin/activate
  ```

### 2. Install Dependencies
If you add or update packages, you can install them using:
```bash
pip install -r requirements.txt
```

### 3. Run the Development Server
Run the local dev server on port 8000:
```bash
python manage.py runserver
```

The API will now be available at `http://127.0.0.1:8000/`.

---

## Technical Details

* **Django REST Framework (DRF)**: Used to write RESTful endpoints that parse incoming JSON data (the LaTeX code) and return binary data streams (the PDF).
* **Temporary Directories**: When a compilation request is received, the backend writes the code to a unique `.tex` file in Windows' temp directory, compiles it, reads the generated PDF, and then deletes the temp directory to prevent local storage leakage.
* **xhtml2pdf**: A pure Python library used for the Level 2 transpilation mode. It translates HTML elements and CSS layouts into high-fidelity PDF output.
