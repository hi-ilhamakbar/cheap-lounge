import { formatIDR } from "../pricing.ts";
import { formatVisitDate } from "../dates.ts";
import { BRAND_NAME, QRIS, WHATSAPP_DISPLAY, WHATSAPP_URL } from "../business.ts";

export type EmailKind = "ORDER_CONFIRMATION" | "PAYMENT_VERIFIED" | "PAYMENT_REJECTED" | "ORDER_COMPLETED";

export type EmailOrder = {
  orderCode: string;
  language: "id" | "en";
  status: string;
  customerName: string | null;
  email: string;
  whatsapp: string;
  airportName: string;
  airportIata: string;
  airportCity: string;
  loungeName: string;
  loungeTerminal: string | null;
  visitDate: string; // YYYY-MM-DD
  adultQty: number;
  childQty: number;
  adultUnitPrice: number;
  childUnitPrice: number;
  adultSubtotal: number;
  childSubtotal: number;
  totalAmount: number;
  adultNames: string[];
  childNames: string[];
  orderUrl: string;
  rejectionReason?: string | null;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const STATUS: Record<"id" | "en", Record<string, string>> = {
  id: {
    PENDING_PAYMENT: "Menunggu Pembayaran",
    PAYMENT_SUBMITTED: "Bukti Pembayaran Dikirim",
    PAYMENT_VERIFIED: "Pembayaran Terverifikasi",
    PROCESSING: "Diproses",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
  },
  en: {
    PENDING_PAYMENT: "Pending Payment",
    PAYMENT_SUBMITTED: "Payment Submitted",
    PAYMENT_VERIFIED: "Payment Verified",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  },
};

const L = {
  id: {
    intro: {
      ORDER_CONFIRMATION: "Terima kasih! Pesanan voucher lounge bandara Anda telah kami terima. Silakan selesaikan pembayaran melalui QRIS.",
      PAYMENT_VERIFIED: "Pembayaran Anda telah kami verifikasi. Pesanan Anda sedang kami proses.",
      PAYMENT_REJECTED: "Bukti pembayaran Anda belum dapat kami verifikasi. Silakan unggah ulang bukti pembayaran yang benar.",
      ORDER_COMPLETED: "Pesanan Anda telah selesai. Terima kasih telah memesan bersama JASA TIKET MURAH.",
    },
    orderId: "ID Pesanan",
    status: "Status pembayaran",
    customer: "Data pemesan",
    name: "Nama",
    whatsapp: "WhatsApp",
    email: "Email",
    lounge: "Detail lounge",
    airport: "Bandara",
    loungeName: "Lounge",
    terminal: "Terminal",
    visitDate: "Tanggal kunjungan",
    passengers: "Penumpang",
    adults: "Dewasa",
    children: "Anak",
    adultN: "Dewasa",
    childN: "Anak",
    price: "Rincian harga",
    total: "Total pembayaran",
    payTitle: "Instruksi pembayaran",
    paySteps: [
      `Buka halaman pesanan melalui tombol di bawah, lalu scan QRIS ${BRAND_NAME} (NMID ${QRIS.nmid}).`,
      "Bayar tepat sesuai total pembayaran.",
      "Unggah bukti pembayaran di halaman pesanan. Tim kami akan memverifikasi pembayaran Anda secara manual.",
    ],
    open: "Buka halaman pesanan",
    singleEntry: "Penting: setiap voucher hanya berlaku untuk SATU KALI MASUK per penumpang, tidak dapat digunakan ulang, dan bukan keanggotaan atau akses tanpa batas.",
    notConfirmation: "Informasi lounge bukan konfirmasi ketersediaan. Akses tunduk pada ketentuan dan kapasitas lounge.",
    reason: "Alasan",
    support: "Butuh bantuan? Hubungi kami via WhatsApp",
    na: "-",
  },
  en: {
    intro: {
      ORDER_CONFIRMATION: "Thank you! We have received your airport lounge voucher order. Please complete your payment via QRIS.",
      PAYMENT_VERIFIED: "Your payment has been verified. We are now processing your order.",
      PAYMENT_REJECTED: "We could not verify your payment proof. Please upload the correct payment proof again.",
      ORDER_COMPLETED: "Your order has been completed. Thank you for booking with JASA TIKET MURAH.",
    },
    orderId: "Order ID",
    status: "Payment status",
    customer: "Customer details",
    name: "Name",
    whatsapp: "WhatsApp",
    email: "Email",
    lounge: "Lounge details",
    airport: "Airport",
    loungeName: "Lounge",
    terminal: "Terminal",
    visitDate: "Visit date",
    passengers: "Passengers",
    adults: "Adults",
    children: "Children",
    adultN: "Adult",
    childN: "Child",
    price: "Price breakdown",
    total: "Total payment",
    payTitle: "Payment instructions",
    paySteps: [
      `Open your order page using the button below and scan the ${BRAND_NAME} QRIS (NMID ${QRIS.nmid}).`,
      "Pay exactly the total payment amount.",
      "Upload your payment proof on the order page. Our team will verify your payment manually.",
    ],
    open: "Open order page",
    singleEntry: "Important: each voucher is valid for a SINGLE ENTRY per passenger only. It cannot be reused and is not a membership or unlimited-access pass.",
    notConfirmation: "Lounge information is not a confirmation of availability. Access is subject to lounge conditions and capacity.",
    reason: "Reason",
    support: "Need help? Contact us on WhatsApp",
    na: "-",
  },
};

export function emailSubject(kind: EmailKind, orderCode: string, lang: "id" | "en"): string {
  switch (kind) {
    case "ORDER_CONFIRMATION":
      return `Airport Lounge Voucher Order Confirmation – ${orderCode}`;
    case "PAYMENT_VERIFIED":
      return lang === "id" ? `Pembayaran Terverifikasi – Airport Lounge Voucher – ${orderCode}` : `Payment Verified – Airport Lounge Voucher – ${orderCode}`;
    case "PAYMENT_REJECTED":
      return lang === "id" ? `Bukti Pembayaran Perlu Diperbarui – ${orderCode}` : `Payment Proof Needs Attention – ${orderCode}`;
    case "ORDER_COMPLETED":
      return lang === "id" ? `Pesanan Selesai – Airport Lounge Voucher – ${orderCode}` : `Order Completed – Airport Lounge Voucher – ${orderCode}`;
  }
}

export function renderOrderEmail(kind: EmailKind, o: EmailOrder): { subject: string; html: string; text: string } {
  const lang = o.language;
  const t = L[lang];
  const subject = emailSubject(kind, o.orderCode, lang);
  const statusLabel = STATUS[lang][o.status] ?? o.status;
  const visit = formatVisitDate(o.visitDate, lang);
  const money = (n: number) => formatIDR(n, lang);
  const showPay = kind === "ORDER_CONFIRMATION" || kind === "PAYMENT_REJECTED";

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#64748b;font-size:14px;width:42%;vertical-align:top">${esc(label)}</td><td style="padding:6px 0;color:#0f1b3d;font-size:14px;font-weight:600">${esc(value)}</td></tr>`;
  const section = (title: string, inner: string) =>
    `<h3 style="margin:28px 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#b91c1c">${esc(title)}</h3><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${inner}</table>`;

  const paxRows = [
    ...o.adultNames.map((n, i) => row(`${t.adultN} ${i + 1}`, n)),
    ...o.childNames.map((n, i) => row(`${t.childN} ${i + 1}`, n)),
  ].join("");

  const priceRows = [
    o.adultQty ? row(`${t.adults} ${o.adultQty} × ${money(o.adultUnitPrice)}`, money(o.adultSubtotal)) : "",
    o.childQty ? row(`${t.children} ${o.childQty} × ${money(o.childUnitPrice)}`, money(o.childSubtotal)) : "",
    `<tr><td style="padding:12px 0 0;border-top:1px solid #e2e8f0;font-size:15px;color:#0f1b3d;font-weight:700">${esc(t.total)}</td><td style="padding:12px 0 0;border-top:1px solid #e2e8f0;font-size:18px;color:#0f1b3d;font-weight:800">${esc(money(o.totalAmount))}</td></tr>`,
  ].join("");

  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,27,61,.08)">
<tr><td style="background:#0f1b3d;padding:28px 32px">
  <div style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:.04em">${esc(BRAND_NAME)}</div>
  <div style="color:#cbd5e1;font-size:13px;margin-top:4px">Airport Lounge Voucher</div>
</td></tr>
<tr><td style="padding:28px 32px 8px">
  <p style="margin:0 0 16px;color:#0f1b3d;font-size:15px;line-height:1.6">${esc(t.intro[kind])}</p>
  ${kind === "PAYMENT_REJECTED" && o.rejectionReason ? `<p style="margin:0 0 16px;padding:12px 14px;background:#fef2f2;border-radius:10px;color:#991b1b;font-size:14px"><strong>${esc(t.reason)}:</strong> ${esc(o.rejectionReason)}</p>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:16px 18px">
    ${row(t.orderId, o.orderCode)}
    ${row(t.status, statusLabel)}
  </table>
  ${section(t.customer, (o.customerName ? row(t.name, o.customerName) : "") + row(t.whatsapp, o.whatsapp) + row(t.email, o.email))}
  ${section(t.lounge, row(t.airport, `${o.airportName} (${o.airportIata})`) + row(t.loungeName, o.loungeName) + row(t.terminal, o.loungeTerminal ?? t.na) + row(t.visitDate, visit))}
  ${section(`${t.passengers} — ${t.adults}: ${o.adultQty}, ${t.children}: ${o.childQty}`, paxRows)}
  ${section(t.price, priceRows)}
  ${
    showPay
      ? `<h3 style="margin:28px 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#b91c1c">${esc(t.payTitle)}</h3><ol style="margin:0;padding-left:20px;color:#0f1b3d;font-size:14px;line-height:1.7">${t.paySteps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`
      : ""
  }
  <p style="margin:28px 0 8px;text-align:center"><a href="${esc(o.orderUrl)}" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px">${esc(t.open)}</a></p>
  <p style="margin:24px 0 0;padding:14px 16px;background:#fff7ed;border-radius:10px;color:#7c2d12;font-size:13px;line-height:1.6">${esc(t.singleEntry)}</p>
  <p style="margin:12px 0 0;color:#64748b;font-size:12px;line-height:1.6">${esc(t.notConfirmation)}</p>
</td></tr>
<tr><td style="padding:24px 32px 32px;color:#64748b;font-size:13px;line-height:1.6;border-top:1px solid #eef2f7">
  ${esc(t.support)}: <a href="${WHATSAPP_URL}" style="color:#0f1b3d;font-weight:700">${esc(WHATSAPP_DISPLAY)}</a><br>
  ${esc(BRAND_NAME)} · QRIS NMID ${esc(QRIS.nmid)}
</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `${BRAND_NAME} — Airport Lounge Voucher`,
    "",
    t.intro[kind],
    kind === "PAYMENT_REJECTED" && o.rejectionReason ? `${t.reason}: ${o.rejectionReason}` : "",
    "",
    `${t.orderId}: ${o.orderCode}`,
    `${t.status}: ${statusLabel}`,
    "",
    `${t.customer}`,
    o.customerName ? `${t.name}: ${o.customerName}` : "",
    `${t.whatsapp}: ${o.whatsapp}`,
    `${t.email}: ${o.email}`,
    "",
    `${t.airport}: ${o.airportName} (${o.airportIata})`,
    `${t.loungeName}: ${o.loungeName}`,
    `${t.terminal}: ${o.loungeTerminal ?? t.na}`,
    `${t.visitDate}: ${visit}`,
    "",
    `${t.passengers} — ${t.adults}: ${o.adultQty}, ${t.children}: ${o.childQty}`,
    ...o.adultNames.map((n, i) => `  ${t.adultN} ${i + 1}: ${n}`),
    ...o.childNames.map((n, i) => `  ${t.childN} ${i + 1}: ${n}`),
    "",
    t.price,
    o.adultQty ? `  ${t.adults} ${o.adultQty} × ${money(o.adultUnitPrice)} = ${money(o.adultSubtotal)}` : "",
    o.childQty ? `  ${t.children} ${o.childQty} × ${money(o.childUnitPrice)} = ${money(o.childSubtotal)}` : "",
    `  ${t.total}: ${money(o.totalAmount)}`,
    "",
    ...(showPay ? [t.payTitle, ...t.paySteps.map((s, i) => `  ${i + 1}. ${s}`), ""] : []),
    `${t.open}: ${o.orderUrl}`,
    "",
    t.singleEntry,
    t.notConfirmation,
    "",
    `${t.support}: ${WHATSAPP_DISPLAY} (${WHATSAPP_URL})`,
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");

  return { subject, html, text };
}
