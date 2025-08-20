const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. "flow_builder"
  description: { type: String },
  actions: [{ type: String }] // e.g. ["view", "edit", "delete", "publish"]
});

module.exports = mongoose.model("resources", resourceSchema);
