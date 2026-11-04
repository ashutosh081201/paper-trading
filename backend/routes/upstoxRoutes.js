const express = require("express");
const router = express.Router();
const { login, callback, status } = require("../controllers/upstoxController");

// login is protected by UPSTOX_ADMIN_SECRET; callback is protected by OAuth state
router.get("/login", login);
router.get("/callback", callback);
router.get("/status", status);

module.exports = router;
