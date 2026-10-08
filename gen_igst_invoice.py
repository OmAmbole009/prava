from PIL import Image, ImageDraw, ImageFont

img = Image.new("RGB", (1200, 1500), color=(255, 255, 255))
draw = ImageDraw.Draw(img)

try:
    font_title = ImageFont.truetype("arial.ttf", 34)
    font_bold = ImageFont.truetype("arialbd.ttf", 20)
    font_regular = ImageFont.truetype("arial.ttf", 17)
    font_small = ImageFont.truetype("arial.ttf", 14)
except Exception:
    font_title = ImageFont.load_default()
    font_bold = ImageFont.load_default()
    font_regular = ImageFont.load_default()
    font_small = ImageFont.load_default()

# Outer Border
draw.rectangle([(40, 40), (1160, 1460)], outline=(180, 180, 180), width=2)
draw.text((600, 60), "TAX INVOICE (INTER-STATE)", fill=(120, 40, 140), font=font_title, anchor="mt")

# Vendor Details (Karnataka State 29)
draw.text((60, 130), "Bangalore Cloud Services Pvt Ltd", fill=(20, 20, 20), font=font_bold)
draw.text((60, 160), "88, Electronic City Phase 1, Bangalore, Karnataka 560100", fill=(60, 60, 60), font=font_regular)
draw.text((60, 190), "GSTIN: 29AAACB1234F1Z8", fill=(20, 20, 20), font=font_bold)
draw.text((60, 220), "State: Karnataka (Code: 29)", fill=(60, 60, 60), font=font_regular)

# Invoice Details Box
draw.rectangle([(750, 120), (1140, 250)], outline=(200, 200, 200), width=1, fill=(248, 249, 250))
draw.text((770, 140), "Invoice No:", fill=(80, 80, 80), font=font_regular)
draw.text((920, 140), "BCS/2026/099", fill=(0, 0, 0), font=font_bold)
draw.text((770, 175), "Invoice Date:", fill=(80, 80, 80), font=font_regular)
draw.text((920, 175), "2026-04-02", fill=(0, 0, 0), font=font_bold)
draw.text((770, 210), "Place of Supply:", fill=(80, 80, 80), font=font_regular)
draw.text((920, 210), "27-Maharashtra", fill=(0, 0, 0), font=font_regular)

draw.line([(40, 270), (1160, 270)], fill=(200, 200, 200), width=1)

# Bill To / Buyer Details (Maharashtra State 27)
draw.text((60, 290), "BILLED TO:", fill=(120, 40, 140), font=font_bold)
draw.text((60, 320), "Prava Financial Technologies Ltd", fill=(20, 20, 20), font=font_bold)
draw.text((60, 350), "12th Floor, World Trade Centre, Cuffe Parade, Mumbai 400005", fill=(60, 60, 60), font=font_regular)
draw.text((60, 380), "GSTIN: 27AABCP1234Q1Z5", fill=(20, 20, 20), font=font_bold)
draw.text((60, 410), "State: Maharashtra (Code: 27)", fill=(60, 60, 60), font=font_regular)

# Table Header
y = 460
draw.rectangle([(60, y), (1140, y + 40)], fill=(240, 235, 248), outline=(200, 190, 215), width=1)
draw.text((75, y + 10), "#", fill=(0, 0, 0), font=font_bold)
draw.text((120, y + 10), "Description of Services", fill=(0, 0, 0), font=font_bold)
draw.text((550, y + 10), "HSN/SAC", fill=(0, 0, 0), font=font_bold)
draw.text((680, y + 10), "Qty", fill=(0, 0, 0), font=font_bold)
draw.text((770, y + 10), "Rate", fill=(0, 0, 0), font=font_bold)
draw.text((950, y + 10), "Taxable Value", fill=(0, 0, 0), font=font_bold)

# Table Row 1
y = 510
draw.text((75, y + 10), "1", fill=(30, 30, 30), font=font_regular)
draw.text((120, y + 10), "Managed Database Hosting - Q1", fill=(30, 30, 30), font=font_regular)
draw.text((550, y + 10), "998315", fill=(30, 30, 30), font=font_regular)
draw.text((680, y + 10), "1", fill=(30, 30, 30), font=font_regular)
draw.text((770, y + 10), "60,000.00", fill=(30, 30, 30), font=font_regular)
draw.text((950, y + 10), "60,000.00", fill=(30, 30, 30), font=font_regular)
draw.line([(60, y + 45), (1140, y + 45)], fill=(230, 230, 230), width=1)

# Table Row 2
y = 565
draw.text((75, y + 10), "2", fill=(30, 30, 30), font=font_regular)
draw.text((120, y + 10), "Dedicated Enterprise Support", fill=(30, 30, 30), font=font_regular)
draw.text((550, y + 10), "998319", fill=(30, 30, 30), font=font_regular)
draw.text((680, y + 10), "1", fill=(30, 30, 30), font=font_regular)
draw.text((770, y + 10), "40,000.00", fill=(30, 30, 30), font=font_regular)
draw.text((950, y + 10), "40,000.00", fill=(30, 30, 30), font=font_regular)
draw.line([(60, y + 45), (1140, y + 45)], fill=(200, 200, 200), width=1)

# Summary Box
y = 640
draw.rectangle([(650, y), (1140, y + 240)], outline=(200, 200, 200), width=1, fill=(252, 250, 254))
draw.text((670, y + 20), "Subtotal Taxable:", fill=(60, 60, 60), font=font_regular)
draw.text((960, y + 20), "1,00,000.00", fill=(0, 0, 0), font=font_bold)

draw.text((670, y + 60), "CGST @ 0%:", fill=(60, 60, 60), font=font_regular)
draw.text((960, y + 60), "0.00", fill=(0, 0, 0), font=font_regular)

draw.text((670, y + 100), "SGST @ 0%:", fill=(60, 60, 60), font=font_regular)
draw.text((960, y + 100), "0.00", fill=(0, 0, 0), font=font_regular)

draw.text((670, y + 140), "IGST @ 18%:", fill=(60, 60, 60), font=font_regular)
draw.text((960, y + 140), "18,000.00", fill=(0, 0, 0), font=font_bold)

draw.line([(650, y + 180), (1140, y + 180)], fill=(200, 200, 200), width=2)
draw.text((670, y + 195), "Total Payable (INR):", fill=(120, 40, 140), font=font_bold)
draw.text((960, y + 195), "1,18,000.00", fill=(120, 40, 140), font=font_bold)

out_path = r"C:\Users\Om Ambole\Desktop\content-website (1)\test-igst-invoice.png"
img.save(out_path, "PNG")
print("Saved IGST invoice to:", out_path)
