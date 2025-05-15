const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`💾 MongoDB Conectado: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Error al conectar a MongoDB: ${error.message}`);
        process.exit(1); // Salir del proceso con fallo si no se puede conectar a la DB
    }
};

module.exports = connectDB;
