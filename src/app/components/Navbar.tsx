'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import AuthNav from './AuthNav';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand" onClick={() => setIsOpen(false)}>
          <span className="shield">🛡️</span>
          PayGuard
        </Link>
        
        {/* Hamburger Icon */}
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? '✕' : '☰'}
        </button>

        {/* Links */}
        <ul className={`navbar-links ${isOpen ? 'active' : ''}`}>
          <li><Link href="/dashboard" onClick={() => setIsOpen(false)}>Tableau de bord</Link></li>
          <li><Link href="/upload" onClick={() => setIsOpen(false)}>Analyser</Link></li>
          <li><Link href="/profiles" onClick={() => setIsOpen(false)}>Profils</Link></li>
          <li><Link href="/comparison" onClick={() => setIsOpen(false)}>Comparaison</Link></li>
          <li><Link href="/pricing" onClick={() => setIsOpen(false)}>Tarifs</Link></li>
          <li><Link href="/help" onClick={() => setIsOpen(false)}>Aide</Link></li>
          <li><ThemeToggle /></li>
          <li><AuthNav /></li>
        </ul>
      </div>
    </nav>
  );
}
