/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nginx handles /api proxying to backend on port 80
  // Next.js rewrite handles /api proxying when accessed directly on port 3000
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://basarnas-backend:4000/:path*',
      },
    ];
  },
};

export default nextConfig;
