'use client'

import { useState, useEffect } from 'react';
import Head from 'next/head';
import CRTFileExplorer from './components/CRTFileExplorer';

export default function Home() {
  return (
    <div>
      <Head>
        <title>Explora</title>
        <meta name="description" content="Explora" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <CRTFileExplorer />
      </main>
    </div>
  );
}