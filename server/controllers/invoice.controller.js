import { deleteInvoiceForUser, getDocumentForUser, listDocumentsForUser } from "../operations.js";

/**
 * Controller for Invoice Management (REST API)
 */
export async function deleteInvoice(userId, invoiceId) {
  return await deleteInvoiceForUser(userId, invoiceId);
}

export async function getInvoice(userId, invoiceId) {
  return await getDocumentForUser(userId, invoiceId);
}

export async function listInvoices(userId, businessId, taskId) {
  return await listDocumentsForUser(userId, businessId, taskId);
}
