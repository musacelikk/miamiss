/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Urun gorselleri lokalde backend'den, canlida S3/CloudFront'tan gelir
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '4000' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: 'api.miamisuhome.com' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/iletisim',
        destination: '/hakkimizda?tab=iletisim',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
