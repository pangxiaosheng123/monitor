// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: 'standalone',
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
      dns: false,
      fs: false,
    };
    
    return config;
  },
  // 设置服务端默认端口
  env: {
    PORT: '3333',
  },
  typescript: {
    ignoreBuildErrors: true
  }
};

module.exports = nextConfig; 