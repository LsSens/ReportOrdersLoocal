require('dotenv').config();
const express = require('express');
const app = express();
const sequelize = require('./database');
const reportRoutes = require('./routes/report');
const path = require("path");
const cors = require('cors');

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', reportRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
