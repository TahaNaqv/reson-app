/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['reson-assets.s3.eu-central-1.amazonaws.com']
  },
  async rewrites() {
    return [
      {
        source: '/reson-api/:path*',
        destination: 'https://resonapi.getreson.com/:path*',
      },
    ];
  },
};

export default nextConfig;
