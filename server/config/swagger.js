const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bus Booking Management System API',
      version: '1.0.0',
      description: 'Complete REST API documentation for the Bus Booking Management System by ALGIONS AI LABS.',
      contact: {
        name: 'ALGIONS AI LABS',
        email: 'support@algions.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'jwt',
        },
      },
    },
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  },
  apis: ['./modules/**/*.js', './server.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
