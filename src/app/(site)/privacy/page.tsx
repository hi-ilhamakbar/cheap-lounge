import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { LegalPage } from "@/components/ProseSection";

export const metadata: Metadata = { title: "Privacy Policy" };

const CONTENT = {
  id: {
    updated: "Draf — perlu ditinjau oleh pemilik usaha sebelum diluncurkan.",
    sections: [
      { h: "Data yang kami kumpulkan", p: ["Nomor WhatsApp, alamat email, nama pemesan (opsional), nama penumpang, detail lounge dan tanggal kunjungan, serta bukti pembayaran yang Anda unggah."] },
      { h: "Penggunaan data", p: ["Data digunakan hanya untuk memproses pesanan, memverifikasi pembayaran, menerbitkan voucher, dan menghubungi Anda terkait pesanan. Salinan konfirmasi pesanan dikirim ke email internal JASA TIKET MURAH."] },
      { h: "Keamanan", p: ["Data disimpan di basis data terenkripsi saat transit, dan hanya dapat diakses oleh administrator yang berwenang."] },
      { h: "Hak Anda", p: ["Anda dapat meminta akses, koreksi, atau penghapusan data Anda dengan menghubungi kami melalui WhatsApp atau email."] },
    ],
  },
  en: {
    updated: "Draft — to be reviewed by the business owner before launch.",
    sections: [
      { h: "Data we collect", p: ["WhatsApp number, email address, your name (optional), passenger names, lounge and visit date details, and any payment proof you upload."] },
      { h: "How we use it", p: ["Only to process your order, verify payment, issue vouchers and contact you about your order. A copy of the order confirmation is sent to JASA TIKET MURAH's internal email addresses."] },
      { h: "Security", p: ["Data is stored in a database encrypted in transit and is accessible only to authorized administrators."] },
      { h: "Your rights", p: ["You may request access to, correction of, or deletion of your data by contacting us on WhatsApp or by email."] },
    ],
  },
};

export default async function PrivacyPage() {
  const { t, lang } = await getDict();
  return <LegalPage title={t.privacy.title} {...CONTENT[lang]} />;
}
