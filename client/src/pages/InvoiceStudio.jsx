import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatMinorAmount } from "@shared/locale";
import { computeInvoiceTotals, toMinor } from "@shared/invoiceMath";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  Receipt,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const inputClass =
  "h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-cyan-400";
const selectClass =
  "h-10 w-full rounded-xl border border-white/[0.08] bg-[#0E1424] px-3 text-xs text-white outline-none cursor-pointer focus:ring-1 focus:ring-cyan-400";

const emptyItem = () => ({
  description: "",
  hsnSac: "",
  unit: "",
  quantity: "1",
  unitPrice: "",
});

const todayIso = () => new Date().toISOString().slice(0, 10);

function initialForm(business) {
  return {
    documentKind: "invoice",
    invoiceNumber: "",
    invoiceDate: todayIso(),
    dueDate: "",
    status: "issued",
    currency: business?.currency ?? "INR",
    taxMode: (business?.country === "IN" || business?.taxSystem?.toLowerCase().includes("gst")) ? "gst" : "flat",
    taxRatePercent: business?.country === "IN" ? 18 : 0,
    party: {
      name: "",
      email: "",
      phone: "",
      addressLine1: "",
      city: "",
      state: "",
      postalCode: "",
      country: business?.country ?? "IN",
      taxId: "",
      placeOfSupply: "",
    },
    lineItems: [emptyItem()],
    discount: { type: "none", value: 0 },
    notes: "",
    terms: "Payment is due within 30 days of the invoice date.",
  };
}

function Section({ title, description, icon: Icon, children }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] shadow-md">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent pointer-events-none" />
      <div className="border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-2.5">
          {Icon ? <Icon className="size-4 text-cyan-400" /> : null}
          <div>
            <h2 className="text-sm font-medium text-white">{title}</h2>
            {description ? <p className="mt-0.5 text-[11px] text-slate-400">{description}</p> : null}
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-300">
        {label}
        {hint ? <span className="ml-1 font-normal text-slate-500">{hint}</span> : null}
      </label>
      {children}
    </div>
  );
}

export default function InvoiceStudio() {
  const queryClient = useQueryClient();

  const businesses = useQuery({
    queryKey: ["businesses", "list"],
    queryFn: () => api.businesses.list(),
    retry: false,
  });
  const business = businesses.data?.[0];
  const businessId = business?.id ?? 0;
  const currency = business?.currency ?? "INR";
  const locale = business?.locale ?? "en-IN";

  const [form, setForm] = useState(() => initialForm(business));
  const [editingId, setEditingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    if (!business) return;
    setForm(current => ({ ...current, currency: current.currency || business.currency || "INR" }));
  }, [business]);

  const documentsQuery = useQuery({
    queryKey: ["invoices", "issued", businessId],
    queryFn: () => api.invoices.listIssued({ businessId }),
    enabled: businessId > 0,
  });

  const totals = useMemo(() => {
    const usable = form.lineItems.filter(item => item.description.trim() !== "");
    try {
      return computeInvoiceTotals(
        {
          ...form,
          lineItems: usable.length ? usable : [emptyItem()],
        },
        { supplierState: business?.state ?? "" },
      );
    } catch {
      return computeInvoiceTotals(
        { ...form, lineItems: [{ ...emptyItem(), unitPrice: "0" }] },
        { supplierState: business?.state ?? "" },
      );
    }
  }, [form, business?.state]);

  const update = (patch) => setForm(current => ({ ...current, ...patch }));
  const updateParty = (patch) => setForm(current => ({ ...current, party: { ...current.party, ...patch } }));
  const updateItem = (index, patch) =>
    setForm(current => ({
      ...current,
      lineItems: current.lineItems.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  const removeItem = (index) =>
    setForm(current => ({
      ...current,
      lineItems: current.lineItems.length === 1 ? [emptyItem()] : current.lineItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  const addItem = () => setForm(current => ({ ...current, lineItems: [...current.lineItems, emptyItem()] }));

  const createMutation = useMutation({
    mutationFn: (body) => api.invoices.createIssued(body),
    onSuccess: () => {
      toast.success("Document created.");
      queryClient.invalidateQueries({ queryKey: ["invoices", "issued"] });
    },
    onError: (error) => toast.error(error.message || "Could not create the document."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => api.invoices.updateIssued(id, body),
    onSuccess: () => {
      toast.success("Document updated.");
      queryClient.invalidateQueries({ queryKey: ["invoices", "issued"] });
    },
    onError: (error) => toast.error(error.message || "Could not update the document."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.invoices.deleteIssued(id),
    onSuccess: () => {
      toast.success("Document deleted.");
      queryClient.invalidateQueries({ queryKey: ["invoices", "issued"] });
    },
    onError: (error) => toast.error(error.message || "Could not delete the document."),
  });

  const buildPayload = () => ({
    businessId,
    documentKind: form.documentKind,
    invoiceNumber: form.invoiceNumber.trim() || undefined,
    invoiceDate: form.invoiceDate,
    dueDate: form.dueDate || null,
    status: form.status,
    currency: form.currency,
    taxMode: form.taxMode,
    taxRatePercent: Number(form.taxRatePercent || 0),
    party: form.party,
    lineItems: form.lineItems
      .filter(item => item.description.trim() !== "")
      .map(item => ({
        description: item.description.trim(),
        hsnSac: item.hsnSac.trim(),
        unit: item.unit.trim(),
        quantity: item.quantity === "" ? "0" : item.quantity,
        unitPrice: item.unitPrice === "" ? "0" : item.unitPrice,
      })),
    discount: {
      type: form.discount.type,
      value: form.discount.type === "percent" ? Number(form.discount.value || 0) : toMinor(form.discount.value || 0) / 100,
    },
    notes: form.notes,
    terms: form.terms,
  });

  const validate = () => {
    if (!businessId) {
      toast.error("Create a workspace before creating an invoice.");
      return false;
    }
    if (!form.party.name.trim()) {
      toast.error(form.documentKind === "bill" ? "Enter the supplier name." : "Enter the customer name.");
      return false;
    }
    if (!form.lineItems.some(item => item.description.trim())) {
      toast.error("Add at least one line item with a description.");
      return false;
    }
    return true;
  };

  const handleSave = async (options = {}) => {
    if (!validate()) return null;
    const payload = buildPayload();
    try {
      const saved = editingId
        ? await updateMutation.mutateAsync({ id: editingId, body: payload })
        : await createMutation.mutateAsync(payload);
      if (options.download) await downloadPdf(saved.id, saved.invoiceNumber);
      if (options.reset) {
        setForm(initialForm(business));
        setEditingId(null);
      } else if (!editingId) {
        setEditingId(saved.id);
      }
      return saved;
    } catch {
      return null;
    }
  };

  const downloadPdf = async (id, invoiceNumber) => {
    setDownloadingId(id);
    try {
      const result = await api.invoices.downloadIssuedPdf(id);
      const binary = atob(result.content);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const blob = new Blob([bytes], { type: result.mimeType || "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename || `Invoice_${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded.");
    } catch (error) {
      toast.error(error.message || "Could not generate the PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  const loadForEdit = (document_) => {
    setEditingId(document_.id);
    setForm({
      documentKind: document_.documentKind,
      invoiceNumber: document_.invoiceNumber ?? "",
      invoiceDate: (document_.invoiceDate ? new Date(document_.invoiceDate) : new Date()).toISOString().slice(0, 10),
      dueDate: document_.dueDate ? new Date(document_.dueDate).toISOString().slice(0, 10) : "",
      status: document_.status ?? "draft",
      currency: document_.currency ?? currency,
      taxMode: document_.taxMode ?? "gst",
      taxRatePercent: document_.taxRate ?? 0,
      party: {
        name: document_.partyName ?? "",
        email: document_.partyEmail ?? "",
        phone: document_.partyPhone ?? "",
        addressLine1: document_.partyAddressLine1 ?? "",
        city: document_.partyCity ?? "",
        state: document_.partyState ?? "",
        postalCode: document_.partyPostalCode ?? "",
        country: document_.partyCountry ?? "",
        taxId: document_.partyTaxId ?? "",
        placeOfSupply: document_.partyPlaceOfSupply ?? "",
      },
      lineItems: (document_.lineItems ?? []).map(item => ({
        description: item.description ?? "",
        hsnSac: item.hsnSac ?? "",
        unit: item.unit ?? "",
        quantity: String(item.quantity ?? 1),
        unitPrice: String(item.unitPrice ?? 0),
      })),
      discount: {
        type: document_.discountType ?? "none",
        value:
          document_.discountType && document_.discountType !== "none"
            ? String(document_.discountValue ?? 0)
            : 0,
      },
      notes: document_.notes ?? "",
      terms: document_.terms ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fmt = (minor) => formatMinorAmount(minor, currency, locale);
  const isBill = form.documentKind === "bill";
  const busy = createMutation.isPending || updateMutation.isPending;
  const documents = documentsQuery.data ?? [];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 py-2">
        {/* Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] p-6 shadow-xl sm:p-8">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="eyebrow-chip inline-flex items-center gap-1.5 border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                <span className="size-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                INVOICE & BILL STUDIO
              </span>
              <h1 className="mt-3 text-2xl font-medium tracking-tight text-white sm:text-3xl">
                Create a document. <span className="text-slate-400">Download it instantly.</span>
              </h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
                Fill in your own invoice or bill, and Prava produces a print-ready PDF with correct tax
                treatment, an amount in words and a full audit trail — no external software needed.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
                {[
                  { value: "invoice", label: "Invoice", icon: Receipt },
                  { value: "bill", label: "Bill", icon: FileSpreadsheet },
                ].map(option => {
                  const Icon = option.icon;
                  const active = form.documentKind === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => update({ documentKind: option.value })}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        active ? "bg-white text-black" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {!business ? (
          <section className="rounded-2xl border border-rose-500/20 bg-[#0B0F19] p-6 text-xs text-rose-400">
            Create a workspace before creating an invoice or bill. Your business profile supplies the issuer
            name, address and tax registration on every document.
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            {/* Form column */}
            <div className="space-y-6">
              <Section
                title="Document details"
                description="Leave the number blank and Prava will continue your workspace numbering."
                icon={Receipt}
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Document number" hint="(optional)">
                    <Input
                      value={form.invoiceNumber}
                      onChange={event => update({ invoiceNumber: event.target.value })}
                      placeholder="Auto-generated"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Date">
                    <Input
                      type="date"
                      value={form.invoiceDate}
                      onChange={event => update({ invoiceDate: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Due date" hint="(optional)">
                    <Input
                      type="date"
                      value={form.dueDate}
                      onChange={event => update({ dueDate: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Status">
                    <select
                      value={form.status}
                      onChange={event => update({ status: event.target.value })}
                      className={selectClass}
                    >
                      <option value="draft">Draft</option>
                      <option value="issued">Issued</option>
                      <option value="paid">Paid</option>
                      <option value="void">Void</option>
                    </select>
                  </Field>
                </div>
              </Section>

              <Section
                title={isBill ? "Supplier details" : "Customer details"}
                description={isBill ? "Who is billing you." : "Who you are billing."}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={isBill ? "Supplier name *" : "Customer name *"}>
                    <Input
                      value={form.party.name}
                      onChange={event => updateParty({ name: event.target.value })}
                      placeholder={isBill ? "e.g. CloudMart Services Pvt Ltd" : "e.g. Apex Solutions Pvt Ltd"}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      type="email"
                      value={form.party.email}
                      onChange={event => updateParty({ email: event.target.value })}
                      placeholder="accounts@example.com"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Phone">
                    <Input
                      value={form.party.phone}
                      onChange={event => updateParty({ phone: event.target.value })}
                      placeholder="+91 98200 00000"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Tax ID / GSTIN">
                    <Input
                      value={form.party.taxId}
                      onChange={event => updateParty({ taxId: event.target.value })}
                      placeholder="27AABCU9603R1ZM"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Address">
                    <Input
                      value={form.party.addressLine1}
                      onChange={event => updateParty({ addressLine1: event.target.value })}
                      placeholder="402, Business Hub, BKC"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="City">
                    <Input
                      value={form.party.city}
                      onChange={event => updateParty({ city: event.target.value })}
                      placeholder="Mumbai"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="State">
                    <Input
                      value={form.party.state}
                      onChange={event => updateParty({ state: event.target.value })}
                      placeholder="Maharashtra"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Postal code">
                    <Input
                      value={form.party.postalCode}
                      onChange={event => updateParty({ postalCode: event.target.value })}
                      placeholder="400051"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Country" hint="(2-letter code)">
                    <Input
                      value={form.party.country}
                      onChange={event => updateParty({ country: event.target.value.toUpperCase().slice(0, 2) })}
                      placeholder="IN"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Place of supply" hint="(drives GST split)">
                    <Input
                      value={form.party.placeOfSupply}
                      onChange={event => updateParty({ placeOfSupply: event.target.value })}
                      placeholder="Maharashtra"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </Section>

              <Section
                title="Line items"
                description="Describe what you are charging for. Rates are entered per unit."
                icon={FileSpreadsheet}
              >
                <div className="space-y-3">
                  <div className="hidden grid-cols-[28px_minmax(0,1fr)_90px_72px_96px_100px_36px] gap-2 text-[10px] uppercase tracking-wider text-slate-500 lg:grid">
                    <span>#</span>
                    <span>Description</span>
                    <span>HSN/SAC</span>
                    <span>Qty</span>
                    <span>Rate</span>
                    <span className="text-right">Amount</span>
                    <span />
                  </div>

                  {form.lineItems.map((item, index) => {
                    const computed = totals.lineItems[index];
                    return (
                      <div
                        key={index}
                        className="grid gap-2 rounded-xl border border-white/[0.06] bg-[#0E1424] p-3 lg:grid-cols-[28px_minmax(0,1fr)_90px_72px_96px_100px_36px] lg:items-center lg:border-0 lg:bg-transparent lg:p-0"
                      >
                        <span className="hidden text-xs text-slate-500 lg:block">{index + 1}</span>
                        <div className="lg:contents">
                          <Input
                            value={item.description}
                            onChange={event => updateItem(index, { description: event.target.value })}
                            placeholder="Service or product description"
                            className={inputClass}
                          />
                          <Input
                            value={item.hsnSac}
                            onChange={event => updateItem(index, { hsnSac: event.target.value })}
                            placeholder="998313"
                            className={`${inputClass} mt-2 lg:mt-0`}
                          />
                          <div className="mt-2 grid grid-cols-2 gap-2 lg:mt-0 lg:contents">
                            <Input
                              value={item.quantity}
                              onChange={event => updateItem(index, { quantity: event.target.value })}
                              placeholder="Qty"
                              inputMode="decimal"
                              className={inputClass}
                            />
                            <Input
                              value={item.unitPrice}
                              onChange={event => updateItem(index, { unitPrice: event.target.value })}
                              placeholder="Rate"
                              inputMode="decimal"
                              className={inputClass}
                            />
                          </div>
                          <span className="mt-2 text-right text-xs font-mono text-white lg:mt-0 lg:block">
                            {computed ? fmt(computed.lineTotalMinor) : fmt(0)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            aria-label="Remove line item"
                            className="mt-2 h-8 w-8 text-slate-500 hover:text-rose-400 lg:mt-0"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addItem}
                  className="mt-4 h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-xs text-slate-300 hover:text-white"
                >
                  <Plus className="mr-1.5 size-3.5" />
                  Add line item
                </Button>
              </Section>

              <Section title="Tax, discount & notes" description="How the totals above are derived.">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Tax treatment">
                    <select
                      value={form.taxMode}
                      onChange={event => update({ taxMode: event.target.value })}
                      className={selectClass}
                    >
                      <option value="gst">GST (CGST + SGST / IGST)</option>
                      <option value="flat">Flat tax rate</option>
                      <option value="none">No tax</option>
                    </select>
                  </Field>
                  <Field label="Tax rate" hint="(%)">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.taxRatePercent}
                      onChange={event => update({ taxRatePercent: event.target.value })}
                      disabled={form.taxMode === "none"}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Discount">
                    <div className="flex gap-2">
                      <select
                        value={form.discount.type}
                        onChange={event => update({ discount: { ...form.discount, type: event.target.value } })}
                        className={`${selectClass} w-28`}
                      >
                        <option value="none">None</option>
                        <option value="percent">%</option>
                        <option value="amount">Amount</option>
                      </select>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.discount.value}
                        onChange={event => update({ discount: { ...form.discount, value: event.target.value } })}
                        disabled={form.discount.type === "none"}
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>
                  </Field>
                </div>

                {form.taxMode === "gst" ? (
                  <p className="mt-3 flex items-start gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] p-3 text-[11px] leading-relaxed text-cyan-200">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-cyan-400" />
                    {totals.isInterState
                      ? "Place of supply is outside your state, so integrated tax (IGST) is applied at the full rate."
                      : "Place of supply matches your state, so the tax is split evenly into CGST and SGST."}
                  </p>
                ) : null}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Notes" hint="(shown on the document)">
                    <Textarea
                      value={form.notes}
                      onChange={event => update({ notes: event.target.value })}
                      placeholder="Thank you for your business."
                      className="rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white placeholder:text-slate-500"
                    />
                  </Field>
                  <Field label="Terms & conditions">
                    <Textarea
                      value={form.terms}
                      onChange={event => update({ terms: event.target.value })}
                      placeholder="Payment is due within 30 days."
                      className="rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white placeholder:text-slate-500"
                    />
                  </Field>
                </div>
              </Section>
            </div>

            {/* Summary column */}
            <aside className="space-y-4 lg:sticky lg:top-6">
              <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] shadow-md">
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none" />
                <div className="border-b border-white/[0.06] px-5 py-4">
                  <span className="eyebrow-chip inline-flex items-center gap-1.5 border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                    <span className="size-1.5 rounded-full bg-cyan-400" />
                    LIVE TOTALS
                  </span>
                </div>

                <div className="space-y-2.5 px-5 py-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="font-mono text-white">{fmt(totals.subtotalMinor)}</span>
                  </div>
                  {totals.discountMinor > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Discount</span>
                      <span className="font-mono text-rose-300">-{fmt(totals.discountMinor)}</span>
                    </div>
                  ) : null}
                  {totals.cgstMinor > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">CGST</span>
                      <span className="font-mono text-white">{fmt(totals.cgstMinor)}</span>
                    </div>
                  ) : null}
                  {totals.sgstMinor > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">SGST</span>
                      <span className="font-mono text-white">{fmt(totals.sgstMinor)}</span>
                    </div>
                  ) : null}
                  {totals.igstMinor > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">IGST</span>
                      <span className="font-mono text-white">{fmt(totals.igstMinor)}</span>
                    </div>
                  ) : null}

                  <div className="mt-3 flex items-end justify-between border-t border-white/[0.08] pt-3">
                    <span className="text-xs font-medium text-white">Total</span>
                    <span className="font-mono text-xl font-medium text-cyan-300">{fmt(totals.totalMinor)}</span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/[0.06] px-5 py-4">
                  <Button
                    type="button"
                    onClick={() => handleSave({ download: true })}
                    disabled={busy || downloadingId !== null}
                    className="h-10 w-full rounded-xl bg-white text-xs font-medium text-black hover:bg-white/90"
                  >
                    {busy || downloadingId !== null ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <Download className="mr-1.5 size-3.5" />
                    )}
                    {editingId ? "Update & download PDF" : "Save & download PDF"}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSave()}
                      disabled={busy}
                      className="h-9 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-slate-300 hover:text-white"
                    >
                      <Save className="mr-1.5 size-3.5" />
                      {editingId ? "Update" : "Save draft"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setForm(initialForm(business));
                        setEditingId(null);
                      }}
                      disabled={busy}
                      className="h-9 rounded-xl text-xs text-slate-400 hover:text-white"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        )}

        {/* Saved documents */}
        {business ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="eyebrow-chip inline-flex items-center gap-1.5 border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                  <span className="size-1.5 rounded-full bg-cyan-400" />
                  YOUR DOCUMENTS
                </span>
                <h2 className="mt-2 text-lg font-medium text-white">Invoices and bills you created</h2>
              </div>
            </div>

            {documentsQuery.isLoading ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-6 text-xs text-slate-400">
                Loading your documents…
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-6 text-xs text-slate-400">
                Nothing here yet. Fill in the form above and save your first document.
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map(document_ => (
                  <article
                    key={document_.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-cyan-300">{document_.invoiceNumber}</span>
                        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                          {document_.documentKind}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                            document_.status === "paid"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : document_.status === "void"
                              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                              : "border-white/[0.08] bg-white/[0.03] text-slate-400"
                          }`}
                        >
                          {document_.status}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-300">{document_.partyName}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {new Date(document_.invoiceDate).toLocaleDateString(locale)} ·{" "}
                        {(document_.lineItems ?? []).length} line item{(document_.lineItems ?? []).length === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-white">
                        {formatMinorAmount(document_.totalMinor, document_.currency ?? currency, locale)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => downloadPdf(document_.id, document_.invoiceNumber)}
                        disabled={downloadingId === document_.id}
                        className="h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 text-[11px] text-slate-300 hover:text-white"
                      >
                        {downloadingId === document_.id ? (
                          <Loader2 className="mr-1 size-3 animate-spin" />
                        ) : (
                          <Download className="mr-1 size-3" />
                        )}
                        PDF
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => loadForEdit(document_)}
                        className="h-8 rounded-lg px-2.5 text-[11px] text-slate-400 hover:text-white"
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(document_.id)}
                        disabled={deleteMutation.isPending}
                        aria-label="Delete document"
                        className="h-8 w-8 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
