/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['reson-images.s3.eu-central-1.amazonaws.com']
  },
  async rewrites() {
    return [
      {
        source: '/reson-api/:path*',
        destination: 'https://resonapi.uarl.in/:path*',
      },
    ];
  },
};

export default nextConfig;
