'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <Link href="/" className="block mb-8">
      <div className="text-center hover:opacity-80 transition-opacity duration-200 cursor-pointer">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <span className="text-2xl">🎡</span>
          <span>SpinDecide</span>
        </h1>
      </div>
    </Link>
  );
}
