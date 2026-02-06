import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const repoName = 'Logos';

const nextConfig: NextConfig = {
  output: 'export',
  // GitHub Pages hosting configuration
  // When deploying to https://<username>.github.io/<repoName>/
  basePath: isProd ? `/${repoName}` : '',
  assetPrefix: isProd ? `/${repoName}/` : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
