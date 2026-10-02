import fs from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';

const invoiceDirectory = path.resolve(process.cwd(), 'storage/invoices');
const rupees = (paise = 0) => `₹${(Number(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function drawLine(doc, y) {
  doc.moveTo(48, y).lineTo(547, y).strokeColor('#ded9cf').stroke();
}

export async function generateInvoice({ payment, therapist, client }) {
  if (payment.invoiceUrl) return payment.invoiceUrl;
  await mkdir(invoiceDirectory, { recursive: true });
  const invoiceNumber = payment.invoiceNumber || `UFZ-${new Date().getFullYear()}-${payment._id.toString().slice(-7).toUpperCase()}`;
  const filename = `${invoiceNumber}.pdf`;
  const filePath = path.join(invoiceDirectory, filename);
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `Invoice ${invoiceNumber}`, Author: 'Unfazed' } });
  const output = fs.createWriteStream(filePath);
  doc.pipe(output);

  doc.fillColor('#203a36').font('Helvetica-Bold').fontSize(25).text('unfazed');
  doc.font('Helvetica').fontSize(9).fillColor('#6f7975').text('Practice, with presence.');
  doc.moveDown(3);
  doc.fillColor('#203a36').font('Helvetica-Bold').fontSize(23).text('TAX INVOICE');
  doc.moveDown(.5);
  doc.font('Helvetica').fontSize(10).fillColor('#6f7975').text(`Invoice no.  ${invoiceNumber}`);
  doc.text(`Issued on  ${new Date(payment.paidAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`);
  doc.moveDown(2);
  drawLine(doc, doc.y);
  doc.moveDown(1.3);

  const practice = therapist.practiceDetails || {};
  doc.fillColor('#203a36').font('Helvetica-Bold').fontSize(10).text('FROM', 48, doc.y);
  doc.font('Helvetica').fontSize(10).text(practice.legalName || therapist.name);
  if (practice.address) doc.text(practice.address);
  doc.text(therapist.email);
  if (practice.gstin) doc.text(`GSTIN: ${practice.gstin}`);

  const rightX = 330;
  const billY = doc.y - 47;
  doc.fillColor('#203a36').font('Helvetica-Bold').fontSize(10).text('BILLED TO', rightX, billY);
  doc.font('Helvetica').fontSize(10).text(`${client.firstName} ${client.lastName}`, rightX);
  doc.text(client.email, rightX);
  if (client.phone) doc.text(client.phone, rightX);
  doc.moveDown(3.5);
  drawLine(doc, doc.y);
  doc.moveDown(1);

  const tableY = doc.y;
  doc.fillColor('#6f7975').font('Helvetica-Bold').fontSize(9).text('DESCRIPTION', 48, tableY);
  doc.text('AMOUNT', 445, tableY, { width: 100, align: 'right' });
  doc.moveDown(1);
  doc.fillColor('#203a36').font('Helvetica').fontSize(11).text(payment.description, 48, doc.y, { width: 340 });
  doc.text(rupees(payment.amount), 445, doc.y - 13, { width: 100, align: 'right' });
  doc.moveDown(2.5);
  drawLine(doc, doc.y);
  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(13).text('Total paid', 340, doc.y, { width: 100 });
  doc.text(rupees(payment.amount), 445, doc.y - 15, { width: 100, align: 'right' });
  doc.moveDown(4);
  doc.font('Helvetica').fontSize(9).fillColor('#6f7975').text('This is a computer-generated invoice. Payment was confirmed through the configured payment gateway.', { align: 'center' });
  doc.end();

  await new Promise((resolve, reject) => { output.on('finish', resolve); output.on('error', reject); });
  payment.invoiceNumber = invoiceNumber;
  payment.invoiceFileName = filename;
  // The PDF is always delivered through an authorized API endpoint, never a public static folder.
  payment.invoiceUrl = `/api/public/payments/${payment._id}/invoice`;
  await payment.save();
  return payment.invoiceUrl;
}
