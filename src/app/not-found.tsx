import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page max-w-xl py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="heading-display mt-3 text-3xl">Halaman tidak ditemukan · Page not found</h1>
      <Link href="/" className="btn-navy mt-8">Beranda · Home</Link>
    </div>
  );
}
