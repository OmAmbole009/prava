import sys
import json
import base64
import io
import pypdfium2 as pdfium

def convert_pdf_to_images(pdf_bytes, max_pages=5):
    try:
        pdf = pdfium.PdfDocument(pdf_bytes)
        n_pages = len(pdf)
        pages_to_render = min(n_pages, max_pages)
        results = []

        for i in range(pages_to_render):
            page = pdf[i]
            # 2x scale provides crisp ~150-200 DPI for OCR
            image = page.render(scale=2.0).to_pil()
            buf = io.BytesIO()
            image.save(buf, format="PNG")
            b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            results.append(b64)

        return {"success": True, "pageCount": n_pages, "renderedPages": len(results), "images": results}
    except Exception as e:
        return {"success": False, "error": str(e), "images": []}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        with open(sys.argv[1], "rb") as f:
            data = f.read()
    else:
        data = sys.stdin.buffer.read()

    res = convert_pdf_to_images(data)
    print(json.dumps(res))
