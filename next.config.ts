const nextConfig = {
  // rewrites: async () => {
  //   return [
  //     {
  //       source: "/api/:path*",
  //       destination:
  //         process.env.NODE_ENV === "development"
  //           ? "https://bookly-backend-vercel.vercel.app/:path*"
  //           : "/api/",
  //     },
  //     {
  //       source: "/docs",
  //       destination:
  //         process.env.NODE_ENV === "development"
  //           ? "https://bookly-backend-vercel.vercel.app/docs"
  //           : "/api/docs",
  //     },
  //     {
  //       source: "/openapi.json",
  //       destination:
  //         process.env.NODE_ENV === "development"
  //           ? "https://bookly-backend-vercel.vercel.app/openapi.json"
  //           : "/api/openapi.json",
  //     },
  //   ];
  // },
};

module.exports = nextConfig;
