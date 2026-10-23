"use client";

import { Popover } from "@base-ui/react/popover";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const NAV = [
  { href: "/template", label: "Template" },
  { href: "/komunitas", label: "Komunitas" },
  { href: "/harga", label: "Harga" },
  { href: "/dashboard", label: "Proyek saya" },
];

export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 bg-stone-50/95 pt-[env(safe-area-inset-top)] shadow-[0_1px_0_rgb(31_26_23/0.06)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Lipatin, ke beranda" className="rounded-lg">
          <Logo />
        </Link>
        <nav aria-label="Navigasi utama" className="hidden flex-1 items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={path.startsWith(n.href) ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-200/70 hover:text-stone-900",
                path.startsWith(n.href) && "text-stone-900",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/template" className={buttonClass("primary", "md", "hidden sm:inline-flex")}>
            Mulai membuat
          </Link>
          <Popover.Root>
            <Popover.Trigger aria-label="Buka menu" className={buttonClass("ghost", "icon", "md:hidden")}>
              <Menu aria-hidden />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner sideOffset={8} align="end" className="z-50">
                <Popover.Popup className="w-64 origin-[var(--transform-origin)] rounded-xl border border-stone-200 bg-white p-2 shadow-lg transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                  <nav aria-label="Navigasi seluler" className="flex flex-col">
                    {NAV.map((n) => (
                      <Popover.Close
                        key={n.href}
                        render={<Link href={n.href} />}
                        className="rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100"
                      >
                        {n.label}
                      </Popover.Close>
                    ))}
                  </nav>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-stone-100/60 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-sm text-sm text-pretty text-stone-600">
            Rancang pola potong kardus, lihat lipatannya dalam 3D, lalu cetak 1:1. Semua langsung di browser.
          </p>
        </div>
        {[
          { h: "Buat", l: [["/template", "Galeri template"], ["/studio?template=controller-ps4", "Studio editor"], ["/template?kategori=hobi", "Template hobi"]] },
          { h: "Belajar", l: [["/panduan?template=roket-3d", "Panduan rakit"], ["/komunitas", "Karya komunitas"], ["/template?kategori=kendaraan", "Kendaraan 3D"]] },
          { h: "Lipatin", l: [["/harga", "Paket & harga"], ["/dashboard", "Proyek saya"]] },
        ].map((c) => (
          <div key={c.h} className="flex flex-col gap-2 text-sm">
            <h2 className="font-bold text-stone-900">{c.h}</h2>
            {c.l.map(([href, label]) => (
              <Link key={href} href={href} className="text-stone-600 hover:text-stone-900">
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <p className="mx-auto max-w-7xl px-4 pb-8 text-xs text-stone-500 sm:px-6">© 2026 Lipatin. Prototipe — proyek disimpan di browser perangkat ini.</p>
    </footer>
  );
}
