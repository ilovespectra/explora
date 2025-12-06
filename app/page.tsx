'use client'

import { useState, useEffect } from 'react';
import Head from 'next/head';
import CRTFileExplorer from './components/CRTFileExplorer';

export default function Home() {
  return (
    <div>
      <Head>
        <title>Vintage CRT File Explorer</title>
        <meta name="description" content="Vintage CRT-style file explorer" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <CRTFileExplorer />
      </main>
    </div>
  );
}