import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tasks',
    short_name: 'Tasks',
    description: '미리님 할일 관리',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#6366f1',
    orientation: 'portrait',
    categories: ['productivity'],
    lang: 'ko-KR',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
