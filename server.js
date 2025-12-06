const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const connectDB = require("./config/database");

const PORT = process.env.PORT || 5050;

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
