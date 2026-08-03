import sys
import os

# Minimal PDF export using markdown-pdf via reportlab-like toolchains is heavy.
# We'll use pypandoc if available, else fallback to a simple HTML + pdfkit (wkhtmltopdf) if present.

INPUT_MD = r"e:\\mainproject\\RESEARCH_PAPER_SUMMARIZER.md"
OUTPUT_PDF = r"e:\\mainproject\\RESEARCH_PAPER_SUMMARIZER.pdf"

def main():
    # Try pypandoc path
    try:
        import pypandoc  # type: ignore
        pypandoc.convert_file(INPUT_MD, 'pdf', outputfile=OUTPUT_PDF)
        print(f"PDF created at {OUTPUT_PDF}")
        return
    except Exception as e:
        print(f"pypandoc not available or failed: {e}")

    # Try markdown -> HTML -> PDF via pdfkit
    try:
        import markdown
        html = markdown.markdown(open(INPUT_MD, 'r', encoding='utf-8').read(), extensions=['tables'])
        html_path = INPUT_MD.replace('.md', '.html')
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write('<meta charset="utf-8">\n<style>body{font-family: Arial, sans-serif; margin: 32px; line-height:1.5;} h1,h2,h3{margin-top:1.2em;} code{background:#f5f5f5;padding:2px 4px;border-radius:4px;} pre{background:#f5f5f5;padding:12px;border-radius:6px;overflow:auto;}</style>')
            f.write(html)
        import pdfkit  # requires wkhtmltopdf installed
        pdfkit.from_file(html_path, OUTPUT_PDF)
        print(f"PDF created at {OUTPUT_PDF}")
        return
    except Exception as e:
        print(f"pdfkit path failed: {e}")

    # Fallback: simple notice
    print("Could not generate PDF automatically. Please install either pypandoc (with LaTeX) or wkhtmltopdf and pdfkit.")

if __name__ == '__main__':
    main()