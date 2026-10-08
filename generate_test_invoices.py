from PIL import Image, ImageDraw, ImageFont
import pypdfium2 as pdfium
import io

def generate_igst_invoice_image(out_path="test-igst-invoice.png"):
    img = Image.new("RGB", (1200, 1600), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    try:
        font_title = ImageFont.truetype("arial.ttf", 36)
        font_bold = ImageFont.truetype("arialbd.ttf", 22)
        font_regular = ImageFont.truetype("arial.ttf", 18)
        font_small = ImageFont.truetype("arial.ttf", 15)
    except Exception:
        font_title = ImageFont.load_default()
        font_bold = ImageFont.load_default()
        font_regular = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Border
    draw.rectangle([(40, 40), (1160, 1560)], outline=(180, 180, 180), width=2)
    draw.text((600, 60), "TAX INVOICE (INTER-STATE)", fill=(0, 51, 102), font=font_title, anchor="mt")

    # Vendor Details (Karnataka State 29)
    draw.text((60, 130), "Bangalore Cloud Systems LLP", fill=(20, 20, 20), font=font_bold)
    draw.text((60, 165), "Plot 42, Electronic City Phase 1, Bengaluru, Karnataka 560100", fill=(60, 60, 60), font=font_regular)
    draw.text((60, 195), "GSTIN: 29AAGCB5555M1Z8", fill=(20, 20, 20), font=font_bold)

    # Invoice Details Box
    draw.rectangle([(750, 120), (1140, 260)], outline=(200, 200, 200), width=1, fill=(248, 249, 250))
    draw.text((770, 140), "Invoice No:", fill=(80, 80, 80), font=font_regular)
    draw.text((920, 140), "BCS/2026/109", fill=(0, 0, 0), font=font_bold)
    draw.text((770, 175), "Invoice Date:", fill=(80, 80, 80), font=font_regular)
    draw.text((920, 175), "20-03-2026", fill=(0, 0, 0), font=font_bold)
    draw.text((770, 210), "Place of Supply:", fill=(80, 80, 80), font=font_regular)
    draw.text((920, 210), "27-Maharashtra", fill=(0, 0, 0), font=font_regular)

    draw.line([(40, 280), (1160, 280)], fill=(200, 200, 200), width=1)

    # Buyer Details (Maharashtra State 27)
    draw.text((60, 305), "BILL TO / RECIPIENT:", fill=(0, 51, 102), font=font_bold)
    draw.text((60, 340), "Prava Enterprise Ltd", fill=(20, 20, 20), font=font_bold)
    draw.text((60, 370), "Nariman Point, Mumbai, Maharashtra 400021", fill=(60, 60, 60), font=font_regular)
    draw.text((60, 400), "GSTIN: 27AABCP1234Q1Z5", fill=(20, 20, 20), font=font_bold)

    # Items Table Header
    y = 470
    draw.rectangle([(60, y), (1140, y + 40)], fill=(230, 235, 245), outline=(180, 190, 210), width=1)
    draw.text((75, y + 10), "#", fill=(0, 0, 0), font=font_bold)
    draw.text((120, y + 10), "Item Description", fill=(0, 0, 0), font=font_bold)
    draw.text((500, y + 10), "HSN/SAC", fill=(0, 0, 0), font=font_bold)
    draw.text((640, y + 10), "Qty", fill=(0, 0, 0), font=font_bold)
    draw.text((740, y + 10), "Rate (INR)", fill=(0, 0, 0), font=font_bold)
    draw.text((950, y + 10), "Taxable Amount (INR)", fill=(0, 0, 0), font=font_bold)

    # Row 1
    y = 520
    draw.text((75, y + 10), "1", fill=(30, 30, 30), font=font_regular)
    draw.text((120, y + 10), "Enterprise Cloud Storage (TB/Mo)", fill=(30, 30, 30), font=font_regular)
    draw.text((500, y + 10), "998315", fill=(30, 30, 30), font=font_regular)
    draw.text((640, y + 10), "5", fill=(30, 30, 30), font=font_regular)
    draw.text((740, y + 10), "8,000.00", fill=(30, 30, 30), font=font_regular)
    draw.text((950, y + 10), "40,000.00", fill=(30, 30, 30), font=font_regular)
    draw.line([(60, y + 45), (1140, y + 45)], fill=(230, 230, 230), width=1)

    # Row 2
    y = 575
    draw.text((75, y + 10), "2", fill=(30, 30, 30), font=font_regular)
    draw.text((120, y + 10), "Database Cluster Monitoring", fill=(30, 30, 30), font=font_regular)
    draw.text((500, y + 10), "998316", fill=(30, 30, 30), font=font_regular)
    draw.text((640, y + 10), "1", fill=(30, 30, 30), font=font_regular)
    draw.text((740, y + 10), "35,000.00", fill=(30, 30, 30), font=font_regular)
    draw.text((950, y + 10), "35,000.00", fill=(30, 30, 30), font=font_regular)
    draw.line([(60, y + 45), (1140, y + 45)], fill=(230, 230, 230), width=1)

    # Row 3
    y = 630
    draw.text((75, y + 10), "3", fill=(30, 30, 30), font=font_regular)
    draw.text((120, y + 10), "DevOps Automation Pipeline", fill=(30, 30, 30), font=font_regular)
    draw.text((500, y + 10), "998313", fill=(30, 30, 30), font=font_regular)
    draw.text((640, y + 10), "2", fill=(30, 30, 30), font=font_regular)
    draw.text((740, y + 10), "12,500.00", fill=(30, 30, 30), font=font_regular)
    draw.text((950, y + 10), "25,000.00", fill=(30, 30, 30), font=font_regular)
    draw.line([(60, y + 45), (1140, y + 45)], fill=(200, 200, 200), width=1)

    # Summary Box
    y = 710
    draw.rectangle([(650, y), (1140, y + 230)], outline=(200, 200, 200), width=1, fill=(250, 250, 252))

    draw.text((670, y + 20), "Taxable Subtotal:", fill=(60, 60, 60), font=font_regular)
    draw.text((960, y + 20), "1,00,000.00", fill=(0, 0, 0), font=font_bold)

    draw.text((670, y + 60), "IGST @ 18%:", fill=(60, 60, 60), font=font_regular)
    draw.text((960, y + 60), "18,000.00", fill=(0, 0, 0), font=font_regular)

    draw.text((670, y + 100), "CGST @ 0%:", fill=(60, 60, 60), font=font_regular)
    draw.text((960, y + 100), "0.00", fill=(0, 0, 0), font=font_regular)

    draw.text((670, y + 130), "SGST @ 0%:", fill=(60, 60, 60), font=font_regular)
    draw.text((960, y + 130), "0.00", fill=(0, 0, 0), font=font_regular)

    draw.line([(650, y + 165), (1140, y + 165)], fill=(200, 200, 200), width=2)
    draw.text((670, y + 180), "Total Amount (INR):", fill=(0, 51, 102), font=font_bold)
    draw.text((960, y + 180), "1,18,000.00", fill=(0, 51, 102), font=font_bold)

    img.save(out_path, "PNG")
    print(f"Generated IGST test invoice: {out_path}")
    return img

def generate_pdf_invoice(image, out_path="test-invoice.pdf"):
    # Convert image into a standard PDF page
    pdf = pdfium.PdfDocument.new()
    image_bytes = io.BytesIO()
    image.save(image_bytes, format="JPEG", quality=90)
    image_bytes.seek(0)
    
    # Render onto PDF page
    image.save(out_path, "PDF", resolution=150.0)
    print(f"Generated PDF test invoice: {out_path}")

if __name__ == "__main__":
    img = generate_igst_invoice_image("test-igst-invoice.png")
    generate_pdf_invoice(img, "test-invoice.pdf")
