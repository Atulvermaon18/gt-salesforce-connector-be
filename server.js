const express = require('express');
const app = express();
const dotenv = require('dotenv');
const morgan = require('morgan');
const connectDb = require('./db.js');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes.js');
const roleRoutes = require('./routes/roleRoutes.js');
const permissionRoutes = require('./routes/permissionRoutes.js');
const activityLogger = require('./middlewares/activityLogger.js');
const responseHandler = require('./middlewares/responseHandler.js');
const securityMiddleware = require('./middlewares/securityMiddleware.js');
const { notFound, errorHandler } = require('./middlewares/errorHandler.js');
const cookieParser = require('cookie-parser');
const { decryptRequest, encryptResponse } = require('./middlewares/encryptionMiddleware.js');
const { setupOAuthRoutes } = require('./utils/setupOAuth.js');

dotenv.config();


connectDb();

app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(cookieParser());

app.use(securityMiddleware);

if (process.env.ENABLE_ENCRYPTION == 'true') {
  app.use(decryptRequest);
  app.use(encryptResponse);
}
app.use(responseHandler);
app.use(activityLogger);

setupOAuthRoutes(app);

// Routes
app.use('/api/users', userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.get('/', (req, res) => {
  res.json({ message: 'Success' });
});

app.use(notFound);

// module.exports = app;

app.listen(5000, () => console.log(`Server is Running on Port http://localhost:5000`));
