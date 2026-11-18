/**
 * Página HTML do Swagger UI carregando os arquivos pela CDN.
 * (Evita depender dos arquivos estáticos do swagger-ui-express, que não são
 * empacotados em hospedagens serverless como a Vercel.)
 */
const VERSION = '5.17.14';
const CDN = `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/${VERSION}`;

module.exports = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Drip Store API - Documentação</title>
  <link rel="stylesheet" href="${CDN}/swagger-ui.min.css" />
  <style>body{margin:0;background:#fafafa}.topbar{display:none}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${CDN}/swagger-ui-bundle.min.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/docs/swagger.json',
      dom_id: '#swagger-ui',
      persistAuthorization: true,
      docExpansion: 'list',
    });
  </script>
</body>
</html>`;
