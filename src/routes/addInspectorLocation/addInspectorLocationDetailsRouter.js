const express = require("express");
const router = express.Router();
const { InsertInspectorsLocations } = require("../../controllers/Admin/addInspectorLocationDetails");

router.post("/bulk-insert", InsertInspectorsLocations);
 
module.exports = router;
  