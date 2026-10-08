from PIL import Image, ImageDraw, ImageFont

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

# Outer Border
draw.rectangle([(40, 40), (1160, 1560)], outline=(180, 180, 180), width=2)
draw.text((600, 60), "TAX INVOICE", fill=(0, 51, 102), font=font_title, anchor="mt")

# Vendor Details
draw.text((60, 130), "Apex Solutions Pvt Ltd", fill=(20, 20, 20), font=font_bold)
draw.text((60, 165), "101, Tech Park, Andheri East, Mumbai, Maharashtra 400069", fill=(60, 60, 60), font=font_regular)
draw.text((60, 195), "GSTIN: 27AABCU9603R1ZM", fill=(20, 20, 20), font=font_bold)
draw.text((60, 225), "Email: billing@apexsolutions.in | Phone: +91 9820012345", fill=(60, 60, 60), font=font_regular)

# Invoice Details Box
draw.rectangle([(750, 120), (1140, 260)], outline=(200, 200, 200), width=1, fill=(248, 249, 250))
draw.text((770, 140), "Invoice No:", fill=(80, 80, 80), font=font_regular)
draw.text((920, 140), "INV-2026-0842", fill=(0, 0, 0), font=font_bold)
draw.text((770, 175), "Invoice Date:", fill=(80, 80, 80), font=font_regular)
draw.text((920, 175), "15-03-2026", fill=(0, 0, 0), font=font_bold)
draw.text((770, 210), "Place of Supply:", fill=(80, 80, 80), font=font_regular)
draw.text((920, 210), "27-Maharashtra", fill=(0, 0, 0), font=font_regular)

draw.line([(40, 280), (1160, 280)], fill=(200, 200, 200), width=1)

# Bill To / Buyer Details
draw.text((60, 305), "BILL TO / BUYER DETAILS:", fill=(0, 51, 102), font=font_bold)
draw.text((60, 340), "Prava Enterprises Ltd", fill=(20, 20, 20), font=font_bold)
draw.text((60, 370), "402, Business Hub, BKC, Mumbai, Maharashtra 400051", fill=(60, 60, 60), font=font_regular)
draw.text((60, 400), "GSTIN: 27AABCP1234Q1Z5", fill=(20, 20, 20), font=font_bold)
draw.text((60, 430), "State: Maharashtra (Code: 27)", fill=(60, 60, 60), font=font_regular)

# Table Header
y = 480
draw.rectangle([(60, y), (1140, y + 40)], fill=(230, 235, 245), outline=(180, 190, 210), width=1)
draw.text((75, y + 10), "#", fill=(0, 0, 0), font=font_bold)
draw.text((120, y + 10), "Item Description", fill=(0, 0, 0), font=font_bold)
draw.text((500, y + 10), "HSN/SAC", fill=(0, 0, 0), font=font_bold)
draw.text((640, y + 10), "Qty", fill=(0, 0, 0), font=font_bold)
draw.text((740, y + 10), "Rate (INR)", fill=(0, 0, 0), font=font_bold)
draw.text((950, y + 10), "Taxable Amount (INR)", fill=(0, 0, 0), font=font_bold)

# Table Rows
y = 530
draw.text((75, y + 10), "1", fill=(30, 30, 30), font=font_regular)
draw.text((120, y + 10), "Cloud Infrastructure Consulting", fill=(30, 30, 30), font=font_regular)
draw.text((500, y + 10), "998313", fill=(30, 30, 30), font=font_regular)
draw.text((640, y + 10), "10", fill=(30, 30, 30), font=font_regular)
draw.text((740, y + 10), "5,000.00", fill=(30, 30, 30), font=font_regular)
draw.text((950, y + 10), "50,000.00", fill=(30, 30, 30), font=font_regular)
draw.line([(60, y + 45), (1140, y + 45)], fill=(230, 230, 230), width=1)

y = 585
draw.text((75, y + 10), "2", fill=(30, 30, 30), font=font_regular)
draw.text((120, y + 10), "Network Security Assessment", fill=(30, 30, 30), font=font_regular)
draw.text((500, y + 10), "998319", fill=(30, 30, 30), font=font_regular)
draw.text((640, y + 10), "2", fill=(30, 30, 30), font=font_regular)
draw.text((740, y + 10), "25,000.00", fill=(30, 30, 30), font=font_regular)
draw.text((950, y + 10), "50,000.00", fill=(30, 30, 30), font=font_regular)
draw.line([(60, y + 45), (1140, y + 45)], fill=(200, 200, 200), width=1)

# Summary Box
y = 660
draw.rectangle([(650, y), (1140, y + 260)], outline=(200, 200, 200), width=1, fill=(250, 250, 252))

draw.text((670, y + 20), "Taxable Subtotal:", fill=(60, 60, 60), font=font_regular)
draw.text((960, y + 20), "1,00,000.00", fill=(0, 0, 0), font=font_bold)

draw.text((670, y + 60), "CGST @ 9%:", fill=(60, 60, 60), font=font_regular)
draw.text((960, y + 60), "9,000.00", fill=(0, 0, 0), font=font_regular)

draw.text((670, y + 100), "SGST @ 9%:", fill=(60, 60, 60), font=font_regular)
draw.text((960, y + 100), "9,000.00", fill=(0, 0, 0), font=font_regular)

draw.text((670, y + 140), "IGST @ 0%:", fill=(60, 60, 60), font=font_regular)
draw.text((960, y + 140), "0.00", fill=(0, 0, 0), font=font_regular)

draw.line([(650, y + 180), (1140, y + 180)], fill=(200, 200, 200), width=2)
draw.text((670, y + 200), "Total Amount (INR):", fill=(0, 51, 102), font=font_bold)
draw.text((960, y + 200), "1,18,000.00", fill=(0, 51, 102), font=font_bold)

# Footer Terms
y = 960
draw.line([(60, y), (1140, y)], fill=(220, 220, 220), width=1)
draw.text((60, y + 20), "Terms & Conditions:", fill=(40, 40, 40), font=font_bold)
draw.text((60, y + 55), "1. Payment is due within 30 days of invoice date.", fill=(80, 80, 80), font=font_small)
draw.text((60, y + 80), "2. Please reference invoice number INV-2026-0842 on remittance.", fill=(80, 80, 80), font=font_small)
draw.text((60, y + 105), "3. This is a computer generated invoice and requires no physical signature.", fill=(80, 80, 80), font=font_small)

out_path = r"C:\Users\Om Ambole\Desktop\content-website (1)\test-invoice.png"
img.save(out_path, "PNG")
print("Saved invoice to:", out_path)
