/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    
    // Fix for undici compatibility
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'undici': false,
        'stream': false,
        'util': false,
      };
    }
    
    // Exclude problematic packages from client bundle
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push('undici');
    }
    
    return config;
  },
  images: {
    domains: ['firebasestorage.googleapis.com', 'lh3.googleusercontent.com'],
  },
  experimental: {
    esmExternals: 'loose',
  },
  transpilePackages: ['firebase'],
}

module.exports = nextConfig
