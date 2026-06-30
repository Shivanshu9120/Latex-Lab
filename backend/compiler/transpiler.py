import re
from io import BytesIO
from xhtml2pdf import pisa

def latex_to_html(latex_code):
    """
    Translates standard LaTeX structures into HTML5 with inline styles for PDF generation.
    """
    # Keep copy of original for regex processing
    html = latex_code
    
    # 1. Clean up comments (lines starting with %)
    html = re.sub(r'(?<!\\)%.*$', '', html, flags=re.MULTILINE)
    
    # 2. Strip preamble and document boundaries
    html = re.sub(r'\\documentclass\[.*?\]\{.*?\}', '', html)
    html = re.sub(r'\\usepackage\[.*?\]\{.*?\}|\\usepackage\{.*?\}', '', html)
    html = re.sub(r'\\begin\{document\}|\\end\{document\}', '', html)
    
    # 3. Global Formatting commands
    html = re.sub(r'\\setlength\{.*?\}\{.*?\}', '', html)
    html = re.sub(r'\\renewcommand\{.*?\}\{.*?\}', '', html)
    html = re.sub(r'\\setstretch\{.*?\}', '', html)
    html = re.sub(r'\\titleformat\*?\{.*?\}\{.*?\}\{.*?\}\{.*?\}\{.*?\}', '', html)
    html = re.sub(r'\\titlespacing\*?\{.*?\}\{.*?\}\{.*?\}\{.*?\}', '', html)
    html = re.sub(r'\\setlist\[.*?\]\{.*?\}', '', html)
    
    # 4. Spacing commands
    html = re.sub(r'\\hspace\*?\{.*?\}', '&nbsp;&nbsp;&nbsp;&nbsp;', html)
    html = re.sub(r'\\vspace\*?\{.*?\}', '<div style="height: 10px;"></div>', html)
    html = html.replace(r'\quad', ' &nbsp;&nbsp; ')
    html = html.replace(r'\qquad', ' &nbsp;&nbsp;&nbsp;&nbsp; ')
    
    # 5. Headings
    html = re.sub(r'\\section\*?\{(.*?)\}', r'<h2>\1</h2>', html)
    html = re.sub(r'\\subsection\*?\{(.*?)\}', r'<h3>\1</h3>', html)
    
    # 6. Basic formatting (bold, italic, typewriter)
    html = re.sub(r'\\textbf\{(.*?)\}', r'<strong>\1</strong>', html)
    html = re.sub(r'\\textit\{(.*?)\}', r'<em>\1</em>', html)
    html = re.sub(r'\\texttt\{(.*?)\}', r'<code>\1</code>', html)
    
    # 7. Text sizes
    html = re.sub(r'\{\\Large\s+(.*?)\}', r'<span style="font-size: 14pt;">\1</span>', html)
    html = re.sub(r'\{\\large\s+(.*?)\}', r'<span style="font-size: 12pt;">\1</span>', html)
    html = re.sub(r'\{\\small\s+(.*?)\}', r'<span style="font-size: 9pt;">\1</span>', html)
    
    # 8. Document structures (itemize, lists, center)
    html = re.sub(r'\\begin\{center\}(.*?)\\end\{center\}', r'<div style="text-align: center;">\1</div>', html, flags=re.DOTALL)
    html = re.sub(r'\\begin\{itemize\}(.*?)\\end\{itemize\}', r'<ul>\1</ul>', html, flags=re.DOTALL)
    
    # Fix list items
    def replace_items(match):
        content = match.group(1)
        # Find lines starting with \item
        items = re.split(r'\\item\s+', content)
        list_html = ""
        for item in items:
            if item.strip():
                list_html += f"<li>{item.strip()}</li>\n"
        return list_html

    html = re.sub(r'<ul>(.*?)</ul>', lambda m: f"<ul>{replace_items(m)}</ul>", html, flags=re.DOTALL)
    
    # 9. Simple tabular / tabularx parsing
    html = re.sub(r'\\begin\{tabularx\}\{.*?\}.*?\\end\{tabularx\}', lambda m: parse_table(m.group(0)), html, flags=re.DOTALL)
    
    # 10. URLs and Hyperlinks (e.g. \href{url}{text})
    html = re.sub(r'\\href\{(.*?)\}\{(.*?)\}', r'<a href="\1" style="color: #2563eb; text-decoration: none;">\2</a>', html)
    
    # 11. Custom linebreaks (e.g. \\[4pt], \\)
    html = re.sub(r'\\\\\[.*?\]', '<br/>', html)
    html = html.replace(r'\\', '<br/>')
    
    # 12. Unescape reserved LaTeX chars
    html = html.replace(r'\%', '%')
    html = html.replace(r'\&', '&')
    html = html.replace(r'\_', '_')
    html = html.replace(r'\{', '{')
    html = html.replace(r'\}', '}')
    html = html.replace(r'\$', '$')
    
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page {{
        size: a4;
        margin: 0.5in 0.6in 0.5in 0.6in;
    }}
    body {{
        font-family: "Helvetica", "Arial", sans-serif;
        font-size: 10pt;
        line-height: 1.35;
        color: #1e293b;
    }}
    h2 {{
        font-size: 11pt;
        font-weight: bold;
        text-transform: uppercase;
        border-bottom: 0.5px solid #94a3b8;
        margin-top: 12px;
        margin-bottom: 6px;
        padding-bottom: 2px;
        color: #0f172a;
    }}
    strong {{
        font-weight: bold;
        color: #0f172a;
    }}
    ul {{
        margin-top: 3px;
        margin-bottom: 3px;
        padding-left: 12px;
    }}
    li {{
        margin-bottom: 2px;
    }}
    table {{
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
        margin-bottom: 8px;
    }}
    td {{
        border: 0.5px solid #cbd5e1;
        padding: 5px;
        text-align: left;
        vertical-align: top;
    }}
</style>
</head>
<body>
{html}
</body>
</html>
"""

def parse_table(table_latex):
    """
    Parses a simple tabular/tabularx string into an HTML table.
    """
    rows_html = []
    
    # Clean up horizontal rules
    clean_table = table_latex.replace(r'\hline', '')
    
    # Split by double backslash to get raw rows
    lines = re.split(r'\\\\(?:\[.*?\])?', clean_table)
    
    for line in lines:
        line = line.strip()
        if '\\begin' in line or '\\end' in line or not line:
            continue
        
        # Split cell columns by &
        cells = [c.strip() for c in line.split('&')]
        cells_html = "".join(f"<td>{cell}</td>" for cell in cells)
        rows_html.append(f"<tr>{cells_html}</tr>")
        
    return f"<table>{''.join(rows_html)}</table>"

def compile_latex_to_pdf_bytes(latex_code):
    """
    Transpiles LaTeX to HTML and renders it to a PDF, returning raw bytes.
    """
    html_content = latex_to_html(latex_code)
    
    # Generate PDF in memory
    pdf_buffer = BytesIO()
    pisa_status = pisa.CreatePDF(html_content, dest=pdf_buffer)
    
    if pisa_status.err:
        raise Exception("HTML to PDF compilation failed.")
        
    return pdf_buffer.getvalue()
